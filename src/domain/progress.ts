// Datos para la pantalla PROGRESO: mejoría, gráficas, logros.

import { addD, diffDays, isoD, monday, parseD } from './dates'
import { type Ctx, painSeries, routineFor, setOk, sType, streak, videoById } from './logic'
import type { Patient } from './model'

/** Mejor racha de toda su historia (sesiones seguidas hechas) */
export function bestStreak(c: Ctx, p: Patient): number {
  let best = 0,
    cur = 0
  for (let d = parseD(p.start), i = 0; d <= c.today && i < 800; d = addD(d, 1), i++) {
    if (!routineFor(c, p, d)) continue
    const s = p.sessions[isoD(d)]
    if (s && s.status === 'done') best = Math.max(best, ++cur)
    else if (isoD(d) !== isoD(c.today)) cur = 0
  }
  return Math.max(best, streak(c, p))
}

export interface Improvement {
  key: 'painLife' | 'painEx' | 'mind'
  label: string
  lowGood: boolean
  from: number
  to: number
  pct: number // % de mejora (positivo = mejor)
}
/** Antes → ahora, a partir de los cuestionarios del viernes */
export function improvements(p: Patient): Improvement[] {
  const se = painSeries(p)
  if (se.length < 2) return []
  const a = se[0],
    z = se[se.length - 1]
  return (
    [
      ['painEx', 'Dolor haciendo ejercicios', true],
      ['painLife', 'Dolor en tu día a día', true],
      ['mind', 'Confianza en recuperarte', false],
    ] as const
  ).map(([key, label, lowGood]) => {
    const from = a[key] ?? 0,
      to = z[key] ?? 0
    const pct = from ? Math.round(((lowGood ? from - to : to - from) / from) * 100) : !lowGood && to > 0 ? 100 : 0
    return { key, label, lowGood, from, to, pct }
  })
}

/** Tipo de día para el calendario de Progreso: correr agrupa CaCo y correr. */
export type DayKind = 'fuerza' | 'movilidad' | 'correr'
const kindOf = (t: string | null): DayKind => (t === 'movilidad' ? 'movilidad' : t === 'caco' || t === 'correr' ? 'correr' : 'fuerza')

/** Días hechos de cada tipo desde que empezó */
export function trainingDays(c: Ctx, p: Patient): Record<DayKind, number> {
  const out: Record<DayKind, number> = { fuerza: 0, movilidad: 0, correr: 0 }
  Object.entries(p.sessions).forEach(([k, s]) => {
    if (s.status !== 'done') return
    const r = routineFor(c, p, parseD(k))
    if (r) out[kindOf(sType(r))]++
  })
  return out
}

export interface GridCell {
  day: string
  kind: DayKind | null // null = descanso
  state: 'done' | 'miss' | 'rest' | 'future' | 'now'
}
/** Calendario de las últimas semanas: una fila por semana, lunes a domingo. */
export function weeksGrid(c: Ctx, p: Patient, weeks = 8): { label: string; cells: GridCell[] }[] {
  const start = monday(parseD(p.start))
  const thisMon = monday(c.today)
  const first = addD(thisMon, -7 * (weeks - 1))
  const from = first < start ? start : first
  const rows: { label: string; cells: GridCell[] }[] = []
  for (let m = from; m <= thisMon; m = addD(m, 7)) {
    const cells: GridCell[] = []
    for (let i = 0; i < 7; i++) {
      const d = addD(m, i)
      const r = d >= parseD(p.start) ? routineFor(c, p, d) : null
      const s = p.sessions[isoD(d)]
      const kind = r ? kindOf(sType(r)) : null
      const state: GridCell['state'] = !r
        ? d > c.today ? 'future' : 'rest'
        : s && s.status === 'done'
          ? 'done'
          : isoD(d) === isoD(c.today)
            ? 'now'
            : d > c.today
              ? 'future'
              : 'miss'
      cells.push({ day: isoD(d), kind, state })
    }
    rows.push({ label: `S${Math.floor(diffDays(start, m) / 7) + 1}`, cells })
  }
  return rows
}

/** Series hechas por grupo muscular en los últimos `days` días, de más a menos. */
export function muscleWork(c: Ctx, p: Patient, days = 28): { name: string; sets: number }[] {
  const acc: Record<string, number> = {}
  const from = addD(c.today, -days + 1)
  Object.entries(p.sessions).forEach(([k, s]) => {
    const d = parseD(k)
    if (d < from || d > c.today) return
    const r = routineFor(c, p, d)
    if (!r) return
    r.items.forEach((it, i) => {
      if (it.kind === 'caco') return
      const n = (s.ex[i]?.sets || []).filter(setOk).length
      if (!n) return
      ;(videoById(c, it.v)?.muscles || []).forEach((m) => (acc[m] = (acc[m] || 0) + n))
    })
  })
  return Object.entries(acc)
    .map(([name, sets]) => ({ name, sets }))
    .sort((a, b) => b.sets - a.sets)
}

/** Todo lo que ya lleva conseguido, en números grandes. */
export function totals(c: Ctx, p: Patient) {
  let sessions = 0,
    minutes = 0,
    sets = 0
  Object.entries(p.sessions).forEach(([k, s]) => {
    if (s.status !== 'done') return
    sessions++
    minutes += Math.round((s.elapsed || 0) / 6e4)
    const r = routineFor(c, p, parseD(k))
    if (r) s.ex.forEach((e) => (sets += (e.sets || []).filter(setOk).length))
  })
  const weeks = Math.max(0, Math.floor(diffDays(monday(parseD(p.start)), c.today) / 7) + 1)
  const imp = improvements(p).find((x) => x.key === 'painLife')
  const testsOk = Object.values(p.recs).reduce((a, r) => a + Object.values(r.passed || {}).filter(Boolean).length, 0)
  return { sessions, minutes, sets, weeks, medals: p.done, painDrop: imp && imp.pct > 0 ? imp.pct : null, best: bestStreak(c, p), testsOk }
}

export interface Milestone {
  id: string
  icon: 'flag' | 'flame' | 'dumbbell' | 'medal' | 'down' | 'calendar' | 'check'
  title: string
}
/** Hitos ya conseguidos (solo los conseguidos: esto es para celebrar, no para señalar lo que falta). */
export function milestones(c: Ctx, p: Patient): Milestone[] {
  const t = totals(c, p)
  const out: Milestone[] = []
  if (t.sessions >= 1) out.push({ id: 's1', icon: 'flag', title: 'Primera sesión' })
  if (t.weeks >= 2 && t.sessions >= 3) out.push({ id: 'w1', icon: 'calendar', title: 'Primera semana' })
  ;[10, 25, 50, 100].forEach((n) => t.sessions >= n && out.push({ id: 's' + n, icon: 'dumbbell', title: `${n} sesiones` }))
  ;[5, 10, 20].forEach((n) => t.best >= n && out.push({ id: 'r' + n, icon: 'flame', title: `Racha de ${n}` }))
  for (let f = 1; f <= p.done; f++) out.push({ id: 'f' + f, icon: 'medal', title: `Fase ${f} superada` })
  if (t.testsOk) out.push({ id: 't', icon: 'check', title: `${t.testsOk} ${t.testsOk === 1 ? 'test superado' : 'tests superados'}` })
  if (t.painDrop && t.painDrop >= 50) out.push({ id: 'half', icon: 'down', title: 'Dolor a la mitad' })
  return out.reverse() // lo más reciente/grande primero
}
