// Datos para la pantalla PROGRESO: mejoría, gráficas, logros.

import { addD, fDM, isoD, parseD } from './dates'
import { type Ctx, painSeries, routineFor, sessStats, sessionsDone, streak } from './logic'
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

export interface Achievement {
  id: string
  icon: string
  title: string
  desc: string
  got: boolean
}
export function achievements(c: Ctx, p: Patient): Achievement[] {
  const n = sessionsDone(p)
  const bs = bestStreak(c, p)
  const fr = Object.keys(p.fridays).length
  const vids = Object.values(p.recs).some((r) => r.files.length && r.at)
  const se = painSeries(p)
  const halved = se.length >= 2 && se[0].painLife > 0 && se[se.length - 1].painLife <= se[0].painLife / 2
  const list: [string, string, string, string, boolean][] = [
    ['first', '🚀', 'Primera sesión', 'Has empezado tu recuperación', n >= 1],
    ['s10', '💪', '10 sesiones', 'Constancia: diez sesiones hechas', n >= 10],
    ['s25', '🏋️', '25 sesiones', 'Ya es un hábito', n >= 25],
    ['s50', '🦾', '50 sesiones', 'Imparable', n >= 50],
    ['r5', '🔥', 'Racha de 5', '5 sesiones seguidas sin fallar', bs >= 5],
    ['r10', '☄️', 'Racha de 10', '10 sesiones seguidas sin fallar', bs >= 10],
    ['fri4', '📝', '4 viernes', 'Me has contado cómo vas 4 semanas', fr >= 4],
    ['vid', '🎥', 'Primeros vídeos', 'Te has grabado para que vea cómo cambias', vids],
    ['half', '📉', 'Dolor a la mitad', 'Tu dolor del día a día ha bajado a la mitad', halved],
  ]
  return list.map(([id, icon, title, desc, got]) => ({ id, icon, title, desc, got }))
}

export type TrainMetric = 'kg' | 'min' | 'pain'
/** Barras de las últimas sesiones hechas */
export function trainingSeries(c: Ctx, p: Patient, m: TrainMetric, last = 12) {
  const rows = Object.keys(p.sessions)
    .sort()
    .map((k) => ({ k, s: p.sessions[k], r: routineFor(c, p, parseD(k)) }))
    .filter((x) => x.s.status === 'done' && x.r)
  const vals = rows.map(({ k, s, r }) => ({
    label: fDM(parseD(k)),
    v: m === 'kg' ? sessStats(s, r!).kg : m === 'min' ? Math.round((s.elapsed || 0) / 6e4) : (s.painSession ?? null),
  }))
  return vals.filter((x) => x.v != null && (m !== 'kg' || (x.v as number) > 0)).slice(-last) as { label: string; v: number }[]
}
