// Reglas del método REIMPACTA, traducidas tal cual del prototipo.
// Son funciones "puras": reciben los datos y el día de hoy y devuelven un resultado.
// Así se pueden probar con tests y no dependen de dónde estén guardados los datos.

import { addD, diffDays, dow, fShort, isoD, monday, parseD } from './dates'
import type { AppState, Patient, Routine, RoutineItem, SessionLog, SetLog } from './model'
import { STYPES } from './model'

export interface Ctx {
  st: AppState
  today: Date
  now: number
}

/* ---------- rutinas y programas ---------- */
export function routineFor(c: Ctx, p: Patient, d: Date): Routine | null {
  const k = isoD(d)
  if (p.overrides && k in p.overrides) {
    const rid = p.overrides[k]
    return rid ? c.st.routines.find((r) => r.id === rid) || null : null
  }
  const start = parseD(p.start)
  if (d < start) return null
  const pr = c.st.programs.find((x) => x.id === p.program)
  if (!pr || !pr.weeks.length) return null
  const w = Math.floor(diffDays(monday(start), d) / 7)
  const week = pr.weeks[Math.min(w, pr.weeks.length - 1)]
  const rid = week[dow(d)]
  return rid ? c.st.routines.find((r) => r.id === rid) || null : null
}
export const weekNo = (c: Ctx, p: Patient, d = c.today) => Math.floor(diffDays(monday(parseD(p.start)), d) / 7) + 1
export const videoById = (c: Ctx, id: string) => c.st.videos.find((v) => v.id === id)

export function itemTitle(c: Ctx, it: RoutineItem): string {
  if (it.kind === 'caco') return +it.walk ? 'CACO · CORRER-CAMINAR' : 'CORRER'
  return videoById(c, it.v)?.title || 'Ejercicio'
}
export function doseText(it: RoutineItem): string {
  if (it.kind === 'caco')
    return +it.walk
      ? `${it.sets} × (${it.run}' correr + ${it.walk}' caminar)`
      : `${it.sets > 1 ? it.sets + ' × ' : ''}${it.run}' de carrera continua`
  return `${it.sets} × ${it.amount} ${it.unit === 'secs' ? 's' : 'rep.'}${it.kg ? ` · ${it.kg} kg` : ''}`
}
export function estMin(r: Routine): number {
  const secs = r.items.reduce(
    (a, it) =>
      a + (it.kind === 'caco' ? it.sets * (+it.run + +it.walk) * 60 : it.unit === 'secs' ? it.sets * (+it.amount + 60) : it.sets * 90),
    0,
  )
  return Math.max(10, Math.round(secs / 60 / 5) * 5)
}

/* ---------- tipo de sesión y regla de fuerza ---------- */
export const sType = (r: Routine | null) => (r ? r.type || (r.items.every((it) => it.kind === 'caco') ? 'caco' : 'fuerza') : null)
export const sessName = (r: Routine | null) => (r ? STYPES[sType(r)!] || r.name : '')
export const isStrength = (r: Routine | null) => sType(r) === 'fuerza'

/** ¿Este día está pegado a una sesión de fuerza (el día antes o el día después) o ya tiene una? */
export function strengthNear(c: Ctx, p: Patient, d: Date): boolean {
  const prev = addD(d, -1)
  const a = routineFor(c, p, prev)
  const b = routineFor(c, p, addD(d, 1))
  const sa = p.sessions[isoD(prev)]
  // una sesión de fuerza de ayer que no se hizo no cuenta como "hecha ayer"
  const prevCounts = isStrength(a) && !(isoD(prev) < isoD(c.today) && !(sa && sa.status === 'done'))
  return prevCounts || isStrength(b) || isStrength(routineFor(c, p, d))
}
/** Mejor día de esta semana para recuperar una sesión pendiente */
export function goodDay(c: Ctx, p: Patient): Date | null {
  const tt = c.today
  const end = addD(monday(tt), 7)
  const todayR = routineFor(c, p, tt)
  for (let d = tt; d < end; d = addD(d, 1)) {
    if (isoD(d) === isoD(tt)) {
      if (todayR) continue
    } else if (routineFor(c, p, d)) continue
    if (!strengthNear(c, p, d)) return d
  }
  return null
}
export function missedAdvice(c: Ctx, p: Patient): string {
  const g = goodDay(c, p)
  if (!g)
    return 'Esta semana no queda un día libre que no esté pegado a otra sesión de fuerza. Escríbeme al WhatsApp y lo vemos.'
  return isoD(g) === isoD(c.today) ? 'Hoy es buen día para hacerla.' : `Mejor día para hacerla: ${fShort(g)}.`
}

/* ---------- fases ---------- */
export const currentPhase = (p: Patient) => Math.min(p.done + 1, 5)
export const recovered = (p: Patient) => p.done >= 5
export function progressOf(p: Patient): number {
  if (recovered(p)) return 1
  const g = p.goals[currentPhase(p)] || []
  const f = g.length ? g.filter((x) => x.ok).length / g.length : 0
  return (p.done + f * 0.9) / 5
}

/* ---------- dolor ---------- */
export const painOk = (p: Patient) => p.painOk ?? 3
export type PainZone = 'ok' | 'warn' | 'hi' | 'stop'
/** 0–umbral bien · umbral+1 vigila · hasta 7 baja carga · 8–10 para: «No lo repitas sin avisarme» */
export const painZone = (v: number, thr: number): PainZone => (v >= 8 ? 'stop' : v <= thr ? 'ok' : v === thr + 1 ? 'warn' : 'hi')
export const painCol = (v: number, thr: number) => ({ ok: '#8DB000', warn: '#F5D90A', hi: '#FF7F50', stop: '#E5281B' })[painZone(v, thr)]

/* ---------- semana, viernes y cumplimiento ---------- */
export const fridayOf = (d: Date) => addD(monday(d), 4)
export function pendingFriday(c: Ctx, p: Patient): string | null {
  const tt = c.today
  if (dow(tt) < 4) return null
  const f = fridayOf(tt)
  if (f < parseD(p.start)) return null
  return p.fridays[isoD(f)] ? null : isoD(f)
}
export const painSeries = (p: Patient) =>
  Object.keys(p.fridays)
    .sort()
    .map((k) => ({ d: k, ...p.fridays[k] }))

export function adherence(c: Ctx, p: Patient, days = 14): number | null {
  let sch = 0,
    dn = 0
  for (let i = 1; i <= days; i++) {
    const d = addD(c.today, -i)
    if (d < parseD(p.start)) break
    if (routineFor(c, p, d)) {
      sch++
      const s = p.sessions[isoD(d)]
      if (s && s.status === 'done') dn++
      else if (s && s.status === 'partial') dn += 0.5
    }
  }
  return sch ? Math.round((dn / sch) * 100) : null
}
/** [% cumplido, sesiones hechas, sesiones pautadas hasta hoy] */
export function compliance(c: Ctx, p: Patient): [number, number, number] {
  let sch = 0,
    dn = 0
  for (let d = parseD(p.start); d <= c.today; d = addD(d, 1)) {
    if (!routineFor(c, p, d)) continue
    const s = p.sessions[isoD(d)]
    const done = !!s && s.status === 'done'
    if (isoD(d) === isoD(c.today) && !done) continue
    sch++
    if (done) dn++
  }
  return [sch ? Math.round((dn / sch) * 100) : 100, dn, sch]
}
export function missedThisWeek(c: Ctx, p: Patient): [Date, Routine, SessionLog | undefined][] {
  const out: [Date, Routine, SessionLog | undefined][] = []
  for (let d = monday(c.today); d < c.today; d = addD(d, 1)) {
    if (d < parseD(p.start)) continue
    const r = routineFor(c, p, d)
    if (!r) continue
    const s = p.sessions[isoD(d)]
    if (!s || s.status !== 'done') out.push([d, r, s])
  }
  return out
}

/* ---------- llamadas (regla de 15 días) ---------- */
export function myBooking(c: Ctx, p: Patient) {
  return c.st.bookings
    .filter((b) => b.patient === p.id && +new Date(b.at) > c.now)
    .sort((a, b) => (a.at < b.at ? -1 : 1))[0]
}
export function lastCall(c: Ctx, p: Patient) {
  return c.st.bookings
    .filter((b) => b.patient === p.id && +new Date(b.at) <= c.now)
    .sort((a, b) => (a.at < b.at ? 1 : -1))[0]
}
/**
 * Primer día en que puede reservar la siguiente llamada, o null si ya puede.
 * Regla: 15 días desde la última llamada; la primera, 15 días desde que empieza.
 */
export function earliestCall(c: Ctx, p: Patient): Date | null {
  const lc = lastCall(c, p)
  const from = lc ? new Date(lc.at) : parseD(p.start)
  const e = addD(from, 15)
  return e > c.today ? e : null
}

/* ---------- estadísticas de sesión ---------- */
export const setOk = (x: SetLog | undefined) => !!x && String(x.v).trim() !== ''
export function sessStats(s: SessionLog, r: Routine) {
  let sets = 0,
    reps = 0,
    kg = 0
  const best: Record<string, number> = {}
  r.items.forEach((it, i) => {
    const e = s.ex[i]
    if (!e || !e.sets || it.kind === 'caco') return
    e.sets.forEach((x) => {
      if (!setOk(x)) return
      sets++
      const v = +x.v || 0
      if (it.unit !== 'secs') {
        reps += v
        if (+x.kg) kg += v * +x.kg
      }
      if (+x.kg) best[it.v] = Math.max(best[it.v] || 0, +x.kg)
    })
  })
  return { sets, reps, kg: Math.round(kg), best }
}

/* ---------- grabaciones por fase ---------- */
export function recOf(p: Patient, ph: number) {
  return p.recs[ph] || (p.recs[ph] = { tests: [], files: [], at: null })
}
export function recItems(c: Ctx, p: Patient, ph: number) {
  const r = recOf(p, ph)
  return [
    ...c.st.recFixed.map((f) => ({ id: f.id, label: f.label, hint: f.hint, video: undefined as string | undefined })),
    ...r.tests.map((v) => ({
      id: v,
      label: videoById(c, v)?.title || 'TEST',
      hint: 'Mira el vídeo del test y grábate haciéndolo igual.',
      video: v,
    })),
  ]
}
export function pendingRec(c: Ctx, p: Patient) {
  if (recovered(p)) return null
  const ph = currentPhase(p)
  const r = recOf(p, ph)
  if (recItems(c, p, ph).every((i) => r.files.find((f) => f.id === i.id))) return null
  return { ph, label: `Vídeos de la fase ${ph}` }
}
export function testsToAsk(c: Ctx, p: Patient) {
  if (recovered(p)) return []
  const ph = currentPhase(p)
  const r = recOf(p, ph)
  return (c.st.phaseTests[ph] || []).filter((v) => !r.tests.includes(v) && videoById(c, v))
}

/* ---------- pagos y fin del programa ---------- */
export function payPlan(p: Patient) {
  if (!p.pay) return []
  const pay = p.pay
  const st = parseD(p.start)
  return [...Array(pay.n)].map((_, i) => ({ i, amount: pay.price / pay.n, due: addD(st, i * 30), paid: !!pay.paid[i] }))
}
/** El programa REIMPACTA dura 13 semanas (91 días). El seguimiento no tiene fin. */
export function endOf(p: Patient): Date | null {
  if (p.end) return parseD(p.end)
  if (p.pay && p.pay.plan === 'seguimiento') return null
  return addD(parseD(p.start), 91)
}
/** Días de margen para pagar un plazo antes de que la app se bloquee */
export const PAY_GRACE = 3
/** ¿Puede usar la app? Se bloquea si Jone la pausa, si pasó su fecha de acceso o si tiene un plazo sin pagar. */
export function accessOf(c: Ctx, p: Patient): { ok: boolean; reason?: 'paused' | 'expired' | 'unpaid'; until: Date | null } {
  const until = p.access?.until ? parseD(p.access.until) : endOf(p)
  if (p.access?.paused) return { ok: false, reason: 'paused', until }
  const late = payPlan(p).find((x) => !x.paid && addD(x.due, PAY_GRACE) < c.today)
  if (late) return { ok: false, reason: 'unpaid', until }
  if (until && c.today > until) return { ok: false, reason: 'expired', until }
  return { ok: true, until }
}
export function daysLeft(c: Ctx, p: Patient) {
  const e = endOf(p)
  return e ? diffDays(c.today, e) : null
}

/* ---------- racha y logros (para motivar a volver cada día) ---------- */
/**
 * Racha: sesiones seguidas hechas, contando hacia atrás desde hoy.
 * Los días sin sesión (descanso) no la rompen. La sesión de hoy suma si ya está hecha,
 * y si aún no la ha hecho no rompe la racha (todavía tiene el día).
 */
export function streak(c: Ctx, p: Patient): number {
  const start = parseD(p.start)
  let n = 0
  for (let d = c.today, i = 0; d >= start && i < 400; d = addD(d, -1), i++) {
    if (!routineFor(c, p, d)) continue
    const s = p.sessions[isoD(d)]
    const done = !!s && s.status === 'done'
    if (done) n++
    else if (isoD(d) !== isoD(c.today)) break
  }
  return n
}
export const sessionsDone = (p: Patient) => Object.values(p.sessions).filter((s) => s.status === 'done').length
