// Qué ve la paciente en "Hoy" y en sus avisos. Traducido del prototipo.

import { addD, fShort, fTime, isoD } from './dates'
import {
  type Ctx,
  earliestCall,
  estMin,
  fridayOf,
  goodDay,
  isStrength,
  missedAdvice,
  missedThisWeek,
  myBooking,
  pendingFriday,
  pendingRec,
  recItems,
  routineFor,
  sessName,
  sType,
  weekNo,
} from './logic'
import type { Patient, Routine } from './model'

/** Emoji de cada tipo de sesión */
export const sessionIcon = (r: Routine | null) =>
  ({ movilidad: '🧘', fuerza: '💪', caco: '🏃', correr: '🏃' } as Record<string, string>)[sType(r) || ''] || '💪'

/** Adónde lleva tocar una tarea o un aviso */
export type Go =
  | { to: 'session'; day: string }
  | { to: 'friday' }
  | { to: 'recordings' }
  | { to: 'call' }
  | { to: 'classes' }

export interface TodoItem {
  icon: string // emoji que se ve al lado, para entenderlo sin leer
  title: string
  sub: string
  go: Go
  main?: boolean // la sesión de hoy, en lima grande
  co?: boolean // pendiente, en coral
  done?: boolean // hecho, tachado con ✓
}

export function todayItems(c: Ctx, p: Patient): TodoItem[] {
  const tt = c.today
  const k = isoD(tt)
  const r = routineFor(c, p, tt)
  const s = p.sessions[k]
  const items: TodoItem[] = []

  // 1. la sesión de hoy
  if (r) {
    const n = r.items.length
    const hechos = s ? s.ex.filter((e) => e.done).length : 0
    if (s && s.status === 'done')
      items.push({ icon: sessionIcon(r), done: true, go: { to: 'session', day: k }, title: sessName(r), sub: `Hecha · ${n} ejercicios. Toca para revisarla` })
    else if (s && s.status === 'active' && hechos)
      items.push({ icon: sessionIcon(r), main: true, go: { to: 'session', day: k }, title: sessName(r), sub: `En marcha: ${hechos}/${n} hechos. Sigue donde lo dejaste` })
    else if (s && s.status === 'partial')
      items.push({ icon: sessionIcon(r), main: true, go: { to: 'session', day: k }, title: sessName(r), sub: `A medias: ${hechos}/${n} hechos. Retoma donde lo dejaste` })
    else items.push({ icon: sessionIcon(r), main: true, go: { to: 'session', day: k }, title: sessName(r), sub: `${n} ejercicios · ~${estMin(r)} min` })
  }

  // 2. lo que quedó pendiente esta semana
  const missed = missedThisWeek(c, p)
  if (missed.length > 1) {
    const [d] = missed[0]
    items.push({
      icon: '⏳',
      co: true,
      go: { to: 'session', day: isoD(d) },
      title: `Te quedaron ${missed.length} sesiones pendientes`,
      sub: `Empieza por la del ${fShort(d)}. Las de fuerza, nunca pegadas a otra de fuerza.`,
    })
  } else
    missed.forEach(([d, r2, s2]) => {
      const g = goodDay(c, p)
      items.push({
        icon: '⏳',
        co: true,
        go: { to: 'session', day: isoD(d) },
        title: `Te quedó pendiente: ${sessName(r2)}`,
        sub:
          `Del ${fShort(d)}${s2 && s2.status === 'partial' ? ' · a medias' : ''}. ` +
          (isStrength(r2)
            ? g
              ? `Mejor el ${fShort(g)}, sin pegarla a otra de fuerza.`
              : 'Escríbeme para encajarla.'
            : g
              ? `Puedes hacerla el ${fShort(g)}.`
              : 'Hazla cuando puedas esta semana.'),
      })
    })

  // 3. cuestionario del viernes
  const fISO = tt.getDay() === 0 || tt.getDay() >= 5 ? isoD(fridayOf(tt)) : null
  if (pendingFriday(c, p)) items.push({ icon: '📝', go: { to: 'friday' }, title: 'Cuestionario del viernes', sub: '5 preguntas, menos de un minuto' })
  else if (fISO && p.fridays[fISO]) items.push({ icon: '📝', done: true, go: { to: 'friday' }, title: 'Cuestionario del viernes', sub: 'Enviado. ¡Gracias!' })

  // 4. grabarse
  const chk = pendingRec(c, p)
  if (chk)
    items.push({
      icon: '🎥',
      co: true,
      go: { to: 'recordings' },
      title: `Grábate: ${chk.label.toLowerCase()}`,
      sub: `${recItems(c, p, chk.ph).length} vídeos, en orden. Te explico cada uno`,
    })

  // 5. llamada
  const bk = myBooking(c, p)
  if (bk && isoD(new Date(bk.at)) === k)
    items.push({ icon: '📞', go: { to: 'call' }, title: 'Llamada con Jone', sub: `Hoy a las ${fTime(new Date(bk.at))} · 30 min` })
  else if (!bk && !earliestCall(c, p))
    items.push({ icon: '📞', go: { to: 'call' }, title: 'Agenda tu llamada', sub: 'Ya puedes reservar tu próxima llamada conmigo' })

  return items
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
  if (r && !(s && s.status === 'done'))
    out.push({ title: '💪 Hoy te toca: ' + sessName(r), body: `${r.items.length} ejercicios · unos ${estMin(r)} min. Toca para entrar.`, go: { to: 'session', day: isoD(tt) } })
  const m = missedThisWeek(c, p)
  if (m.length)
    out.push({
      title: '⏳ Te quedó pendiente: ' + sessName(m[0][1]),
      body: (isStrength(m[0][1]) ? 'No la hagas el día antes ni el día después de otra sesión de fuerza. ' : '') + missedAdvice(c, p),
      go: { to: 'session', day: isoD(m[0][0]) },
    })
  if (pendingFriday(c, p)) out.push({ title: '📝 Cuestionario del viernes', body: 'Cuéntame cómo ha ido la semana. Menos de un minuto.', go: { to: 'friday' } })
  const rec = pendingRec(c, p)
  if (rec) out.push({ title: '🎥 ' + rec.label, body: 'Toca grabarte: te explico cada vídeo', go: { to: 'recordings' } })
  const nc = c.st.videos.find((v) => v.type === 'clase' && v.vis === 'visible' && v.week === weekNo(c, p))
  if (nc) out.push({ title: '🎓 Clase nueva desbloqueada', body: nc.title, go: { to: 'classes' } })
  const b = myBooking(c, p)
  if (b) {
    const bd = new Date(b.at)
    const mins = (+bd - c.now) / 6e4
    const tomorrow = isoD(bd) === isoD(addD(tt, 1))
    if (mins <= 60 && p.settings.callHour !== false)
      out.unshift({ title: '📞 Tu llamada con Jone es en ' + Math.max(1, Math.round(mins)) + ' min', body: `A las ${fTime(bd)}. Ten a mano lo que quieras contarle.`, go: { to: 'call' } })
    else if (tomorrow && p.settings.callDay !== false)
      out.unshift({ title: '📞 Mañana tienes llamada con Jone', body: `A las ${fTime(bd)} · 30 minutos.`, go: { to: 'call' } })
    else out.push({ title: '📞 Llamada con Jone', body: fShort(bd) + ' a las ' + fTime(bd), go: { to: 'call' } })
  }
  return out
}
