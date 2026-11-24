// Qué ve la paciente en "Hoy" y en sus avisos.
//
// Regla de pendientes (decidida con Jone): lo no hecho NO se va acumulando.
// · Una sesión sin hacer solo se ofrece al día siguiente ("¿Recuperas la de ayer?"),
//   y solo si recuperarla hoy respeta la regla de fuerza. Pasado ese día, desaparece.
// · Los lunes se enseña el resumen de la semana anterior, y la semana nueva empieza limpia.

import { addD, fShort, fTime, isoD, monday } from './dates'
import {
  type Ctx,
  earliestCall,
  estMin,
  fridayOf,
  isStrength,
  myBooking,
  pendingFriday,
  pendingRec,
  recItems,
  routineFor,
  sessName,
  strengthNear,
  sType,
  weekNo,
} from './logic'
import type { Patient, SessionType } from './model'

/** Adónde lleva tocar una tarea o un aviso */
export type Go =
  | { to: 'session'; day: string }
  | { to: 'friday' }
  | { to: 'recordings' }
  | { to: 'call' }
  | { to: 'classes' }

export type IconKey = SessionType | 'viernes' | 'grabar' | 'llamada' | 'recuperar'

export interface TodoItem {
  icon: IconKey
  title: string
  sub: string
  go: Go
  main?: boolean // la sesión de hoy, en lima grande
  co?: boolean // pendiente, en coral
  done?: boolean // hecho, tachado con ✓
}

/** La sesión de ayer, si no se hizo y hoy se puede recuperar sin romper la regla de fuerza. */
export function yesterdayToRecover(c: Ctx, p: Patient) {
  const y = addD(c.today, -1)
  if (y < monday(c.today)) return null // no se arrastra de una semana a otra
  const r = routineFor(c, p, y)
  if (!r) return null
  const s = p.sessions[isoD(y)]
  if (s && s.status === 'done') return null
  if (routineFor(c, p, c.today)) return null // hoy ya tiene su sesión
  if (isStrength(r) && strengthNear(c, p, c.today)) return null
  return { day: y, r, partial: !!s && s.status === 'partial' }
}

export function todayItems(c: Ctx, p: Patient): TodoItem[] {
  const tt = c.today
  const k = isoD(tt)
  const r = routineFor(c, p, tt)
  const s = p.sessions[k]
  const items: TodoItem[] = []

  // 1. la sesión de hoy
  if (r) {
    const icon = sType(r) || 'fuerza'
    const n = r.items.length
    const hechos = s ? s.ex.filter((e) => e.done).length : 0
    const base = { icon, go: { to: 'session' as const, day: k }, title: sessName(r) }
    if (s && s.status === 'done') items.push({ ...base, done: true, sub: `Hecha · ${n} ejercicios` })
    else if (s && (s.status === 'active' || s.status === 'partial') && hechos) items.push({ ...base, main: true, sub: `${hechos} de ${n} hechos · sigue donde lo dejaste` })
    else items.push({ ...base, main: true, sub: `${n} ejercicios · ${estMin(r)} min` })
  }

  // 2. la de ayer, solo hoy y solo si se puede
  const y = yesterdayToRecover(c, p)
  if (y) items.push({ icon: 'recuperar', co: true, go: { to: 'session', day: isoD(y.day) }, title: '¿Recuperas la de ayer?', sub: `${sessName(y.r)} · opcional` })

  // 3. cuestionario del viernes (viernes a domingo de esta semana)
  const fISO = tt.getDay() === 0 || tt.getDay() >= 5 ? isoD(fridayOf(tt)) : null
  if (pendingFriday(c, p)) items.push({ icon: 'viernes', go: { to: 'friday' }, title: 'Cuestionario del viernes', sub: '1 minuto' })
  else if (fISO && p.fridays[fISO]) items.push({ icon: 'viernes', done: true, go: { to: 'friday' }, title: 'Cuestionario del viernes', sub: 'Enviado' })

  // 4. grabarse
  const chk = pendingRec(c, p)
  if (chk) items.push({ icon: 'grabar', co: true, go: { to: 'recordings' }, title: `Vídeos de la fase ${chk.ph}`, sub: `${recItems(c, p, chk.ph).length} vídeos cortos` })

  // 5. llamada
  const bk = myBooking(c, p)
  if (bk && isoD(new Date(bk.at)) === k) items.push({ icon: 'llamada', go: { to: 'call' }, title: 'Llamada con Jone', sub: `Hoy a las ${fTime(new Date(bk.at))}` })
  else if (!bk && !earliestCall(c, p)) items.push({ icon: 'llamada', go: { to: 'call' }, title: 'Agenda tu llamada', sub: 'Ya puedes reservarla' })

  return items
}

/** Resumen de una semana (lunes→domingo): sesiones hechas de las pautadas, por tipo. */
export function weekSummary(c: Ctx, p: Patient, mon: Date) {
  let total = 0,
    done = 0
  const byType: Record<SessionType, number> = { fuerza: 0, movilidad: 0, caco: 0, correr: 0 }
  for (let i = 0; i < 7; i++) {
    const d = addD(mon, i)
    const r = routineFor(c, p, d)
    if (!r) continue
    total++
    const s = p.sessions[isoD(d)]
    if (s && s.status === 'done') {
      done++
      byType[sType(r) || 'fuerza']++
    }
  }
  return { total, done, byType }
}
/** El lunes (y solo el lunes) se enseña cómo fue la semana pasada. */
export function lastWeekSummary(c: Ctx, p: Patient) {
  if (c.today.getDay() !== 1) return null
  const mon = addD(monday(c.today), -7)
  const sm = weekSummary(c, p, mon)
  return sm.total ? sm : null
}

export interface Notice {
  title: string
  body: string
  go: Go
}

/** Avisos de hoy (campana y pop-up al entrar). Los de la llamada no se anuncian como "recordatorios". */
export function notices(c: Ctx, p: Patient): Notice[] {
  const tt = c.today
  const out: Notice[] = []
  const r = routineFor(c, p, tt)
  const s = p.sessions[isoD(tt)]
  const eve = eveningNudge(c, p)
  if (eve) out.push(eve)
  else if (r && !(s && s.status === 'done'))
    out.push({ title: 'Hoy te toca: ' + sessName(r), body: `${r.items.length} ejercicios · ${estMin(r)} min`, go: { to: 'session', day: isoD(tt) } })
  const y = yesterdayToRecover(c, p)
  if (y) out.push({ title: '¿Recuperas la de ayer?', body: `${sessName(y.r)} · opcional`, go: { to: 'session', day: isoD(y.day) } })
  if (pendingFriday(c, p)) out.push({ title: 'Cuestionario del viernes', body: '¿Cómo ha ido la semana? 1 minuto.', go: { to: 'friday' } })
  const rec = pendingRec(c, p)
  if (rec) out.push({ title: rec.label, body: 'Te explico cada vídeo', go: { to: 'recordings' } })
  const nc = c.st.videos.find((v) => v.type === 'clase' && v.vis === 'visible' && v.week === weekNo(c, p))
  if (nc) out.push({ title: 'Clase nueva', body: nc.title, go: { to: 'classes' } })
  const b = myBooking(c, p)
  if (b) {
    const bd = new Date(b.at)
    const mins = (+bd - c.now) / 6e4
    const tomorrow = isoD(bd) === isoD(addD(tt, 1))
    if (mins <= 60 && p.settings.callHour !== false)
      out.unshift({ title: 'Tu llamada con Jone es en ' + Math.max(1, Math.round(mins)) + ' min', body: `A las ${fTime(bd)}`, go: { to: 'call' } })
    else if (tomorrow && p.settings.callDay !== false) out.unshift({ title: 'Mañana tienes llamada con Jone', body: `A las ${fTime(bd)}`, go: { to: 'call' } })
    else out.push({ title: 'Llamada con Jone', body: fShort(bd) + ' a las ' + fTime(bd), go: { to: 'call' } })
  }
  return out
}

/** Una frase que dé ganas de entrar, sacada de sus propios datos (en tono de Jone). */
export function motivation(c: Ctx, p: Patient, streakN: number, improvementPct: number | null): string {
  const r = routineFor(c, p, c.today)
  const s = p.sessions[isoD(c.today)]
  const doneToday = !!s && s.status === 'done'
  if (doneToday) return streakN > 1 ? `Hecho. Llevas ${streakN} sesiones seguidas.` : 'Sesión hecha. Así se avanza.'
  if (streakN >= 3) return `Llevas ${streakN} sesiones seguidas. Hoy, a por la siguiente.`
  if (improvementPct != null && improvementPct >= 20) return `Tu dolor ha bajado un ${improvementPct}% desde que empezaste.`
  if (r) return `Hoy toca ${sessName(r).toLowerCase()}: ${estMin(r)} minutos y listo.`
  return 'Hoy toca descansar. Muévete a tu ritmo.'
}

/** ¿Es ya la tarde-noche (desde las 19:00) y la sesión de hoy sigue sin hacer? */
export function eveningNudge(c: Ctx, p: Patient): Notice | null {
  const h = new Date(c.now).getHours()
  if (h < 19) return null
  const r = routineFor(c, p, c.today)
  const s = p.sessions[isoD(c.today)]
  if (!r || (s && s.status === 'done')) return null
  return {
    title: 'Aún estás a tiempo',
    body: `Tu sesión de ${sessName(r).toLowerCase()} son ${estMin(r)} minutos. Hazla hoy y cierras el día.`,
    go: { to: 'session', day: isoD(c.today) },
  }
}

/** Frase de ánimo al terminar una sesión, sacada de sus datos. Tono de Jone: cercano, sin exagerar. */
export function finishPhrase(c: Ctx, p: Patient, day: string): string {
  const done = Object.values(p.sessions).filter((s) => s.status === 'done').length
  if (done <= 1) return 'Primera sesión hecha. Aquí empieza tu vuelta a correr.'
  const wk = weekSummary(c, p, monday(c.today))
  if (wk.total && wk.done >= wk.total) return 'Semana completa. Así, paso a paso, es como se vuelve a correr.'
  // racha
  let n = 0
  for (let d = c.today, i = 0; i < 60; d = addD(d, -1), i++) {
    if (!routineFor(c, p, d)) continue
    const s = p.sessions[isoD(d)]
    if (s && s.status === 'done') n++
    else if (isoD(d) !== day) break
  }
  if (n >= 3) return `Llevas ${n} sesiones seguidas. Esa constancia es lo que te acerca a tu meta.`
  if (wk.total) return `Una más. Llevas ${wk.done} de ${wk.total} esta semana.`
  return 'Sesión hecha. Buen trabajo.'
}
