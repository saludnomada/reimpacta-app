// CONCLUSIONES DEL LABORATORIO: asimetrías, repeticiones para pasar de fase y análisis de carrera.
// Los umbrales son una propuesta inicial (ver notas): Jone los ajustará con sus criterios.

import { labKey, labTest, sidesOf } from './lab'
import type { LabRequest, Patient } from './model'

export type Level = 'ok' | 'warn' | 'bad' | 'info'
export interface Finding {
  level: Level
  title: string
  text: string
}

/** Umbrales (propuesta inicial, editable más adelante) */
export const LAB_RULES = {
  asymDeg: { warn: 5, bad: 10 }, // diferencia de ángulo entre lados (grados)
  lsi: { pass: 90, bad: 80 }, // % lado peor / lado mejor (repeticiones, altura, distancia)
  cadence: { low: 160, good: 170 }, // pasos por minuto
  shank: { warn: 8, bad: 12 }, // tibia inclinada hacia delante al apoyar (sobrezancada)
  reach: { warn: 0.35, bad: 0.55 }, // tobillo por delante de la cadera al apoyar, en "fémures"
  footStrike: { heel: 6, fore: -12 }, // ángulo del pie al apoyar: >6 talón, <-12 antepié (si no, mediopié)
  trunk: { min: 3, max: 15 }, // inclinación del tronco hacia delante (grados)
  pelvicDrop: { warn: 6, bad: 8 }, // caída de la pelvis al apoyar (grados)
}

const levelAsym = (d: number): Level => (d >= LAB_RULES.asymDeg.bad ? 'bad' : d >= LAB_RULES.asymDeg.warn ? 'warn' : 'ok')
const levelLsi = (x: number): Level => (x < LAB_RULES.lsi.bad ? 'bad' : x < LAB_RULES.lsi.pass ? 'warn' : 'ok')

/** Asimetrías y % entre piernas de un pedido de tests (usa la primera medida guardada de cada lado) */
export function requestFindings(p: Patient, req: LabRequest): Finding[] {
  const out: Finding[] = []
  req.tests.forEach((id) => {
    const t = labTest(id)
    if (!t || !t.sides) return
    const md = p.labMarks?.[labKey(req.id, id, 'd')]?.[0]?.values
    const mi = p.labMarks?.[labKey(req.id, id, 'i')]?.[0]?.values
    if (!md || !mi) return
    Object.keys(md)
      .filter((n) => n in mi)
      .forEach((n) => {
        const a = md[n]
        const b = mi[n]
        const isCount = /repeticiones|altura|cm|distancia/i.test(n)
        if (isCount) {
          const lsi = Math.round((Math.min(a, b) / Math.max(a, b || 1)) * 100)
          const weak = a < b ? 'derecha' : 'izquierda'
          const lv = levelLsi(lsi)
          out.push({
            level: lv,
            title: `${t.n}. ${t.name} · ${n}`,
            text: `Dcha ${a} · Izda ${b} → la ${weak} llega al ${lsi} % de la otra. ${
              lv === 'ok' ? `Cumple el criterio (≥ ${LAB_RULES.lsi.pass} %).` : `No cumple el criterio para pasar de fase (≥ ${LAB_RULES.lsi.pass} %).${lv === 'bad' ? ' Diferencia grande: posible riesgo de lesión.' : ''}`
            }`,
          })
        } else {
          const d = Math.abs(a - b)
          const lv = levelAsym(d)
          if (lv === 'ok') return
          out.push({
            level: lv,
            title: `${t.n}. ${t.name} · ${n}`,
            text: `Dcha ${a}° · Izda ${b}° → ${d}° de diferencia.${lv === 'bad' ? ' Asimetría grande: posible factor de riesgo de lesión.' : ' Vigílalo.'}`,
          })
        }
      })
  })
  // notas de análisis de carrera guardadas
  req.tests.forEach((id) =>
    sidesOf(labTest(id) || { sides: false } as never).forEach((s) =>
      (p.labMarks?.[labKey(req.id, id, s)] || []).forEach((m) => {
        if (m.note?.startsWith('Carrera:')) out.push({ level: 'info', title: `${labTest(id)?.n}. ${labTest(id)?.name}`, text: m.note.replace(/^Carrera:\s*/, '') })
      }),
    ),
  )
  const order: Record<Level, number> = { bad: 0, warn: 1, info: 2, ok: 3 }
  return out.sort((x, y) => order[x.level] - order[y.level])
}

/** Cuenta repeticiones en una serie de ángulos (sube y baja), con margen para no contar temblores */
export function countReps(series: number[]): number {
  if (series.length < 5) return 0
  const lo = Math.min(...series)
  const hi = Math.max(...series)
  if (hi - lo < 8) return 0
  const up = lo + (hi - lo) * 0.65
  const down = lo + (hi - lo) * 0.35
  let n = 0
  let high = series[0] > up
  series.forEach((x) => {
    if (!high && x > up) {
      high = true
      n++
    } else if (high && x < down) high = false
  })
  return n
}

/* ---------- ANÁLISIS DE CARRERA ---------- */
type P = { x: number; y: number }
export interface Frame {
  t: number // segundo del vídeo
  lm: P[] // 33 puntos de MediaPipe (de 0 a 1)
}
const IDX = { hip: [24, 23], knee: [26, 25], ankle: [28, 27], heel: [30, 29], toe: [32, 31], sh: [12, 11] }
const g = (f: Frame, k: keyof typeof IDX, s: 0 | 1) => f.lm[IDX[k][s]]

export interface RunResult {
  view: 'lado' | 'detras'
  contacts: number
  cadence: number | null
  shank: number | null
  reach: number | null
  foot: number | null
  trunk: number | null
  crossover: number | null // nº de apoyos que cruzan la línea media
  pelvicDrop: number | null
  findings: Finding[]
}

const smooth = (a: number[], k = 1) => a.map((_, i) => {
  const w = a.slice(Math.max(0, i - k), i + k + 1)
  return w.reduce((x, y) => x + y, 0) / w.length
})

/** Apoyos vistos DE LADO: el momento en que el tobillo está más adelantado respecto a la cadera
 *  (justo al llegar al suelo). No depende de que la cámara se mueva arriba o abajo. */
function contactsSide(F: Frame[], s: 0 | 1, dir: number, w: number, h: number, minGap: number) {
  const reach = smooth(
    F.map((f) => {
      const hip = g(f, 'hip', s)
      const knee = g(f, 'knee', s)
      const ank = g(f, 'ankle', s)
      const femur = Math.hypot((knee.x - hip.x) * w, (knee.y - hip.y) * h) || 1
      return ((ank.x - hip.x) * w * dir) / femur
    }),
  )
  const out: number[] = []
  for (let i = 1; i < reach.length - 1; i++) {
    if (reach[i] > 0.15 && reach[i] >= reach[i - 1] && reach[i] > reach[i + 1]) {
      const last = out[out.length - 1]
      if (last != null && F[i].t - F[last].t < minGap) {
        if (reach[i] > reach[last]) out[out.length - 1] = i
      } else out.push(i)
    }
  }
  return out
}

/** Desde el pie más adelantado, el primer fotograma en que el pie está más abajo respecto a la cadera = apoyo */
function landing(F: Frame[], from: number, s: 0 | 1, maxSecs: number) {
  const rel = (k: number) => Math.max(g(F[k], 'heel', s).y, g(F[k], 'toe', s).y) - g(F[k], 'hip', s).y
  let best = from
  for (let k = from + 1; k < F.length && F[k].t - F[from].t <= maxSecs; k++) {
    if (rel(k) > rel(best)) best = k
    else if (rel(k) < rel(best) - 0.005) break
  }
  return best
}

/** Apoyos vistos DESDE DETRÁS: el momento en que un pie pasa a estar más abajo que el otro */
function contactsBack(F: Frame[], minGap: number) {
  const d = smooth(F.map((f) => Math.max(g(f, 'heel', 0).y, g(f, 'toe', 0).y) - Math.max(g(f, 'heel', 1).y, g(f, 'toe', 1).y)))
  const out: { i: number; s: 0 | 1 }[] = []
  for (let i = 1; i < d.length; i++) {
    const s: 0 | 1 | null = d[i - 1] <= 0 && d[i] > 0 ? 0 : d[i - 1] >= 0 && d[i] < 0 ? 1 : null
    if (s == null) continue
    const last = out[out.length - 1]
    if (last && F[i].t - F[last.i].t < minGap) continue
    out.push({ i, s })
  }
  return out
}

const deg = (r: number) => (r * 180) / Math.PI
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
const r1 = (x: number | null) => (x == null ? null : Math.round(x * 10) / 10)

/** Analiza la carrera a partir de los fotogramas del modo automático.
 *  slow = cuántas veces más lento se ve el vídeo (cámara lenta). w/h = tamaño del vídeo. */
export function analyzeRun(frames: Frame[], view: 'lado' | 'detras', slow = 1, w = 1, h = 1): RunResult {
  const F = frames.filter((f, i) => i === 0 || f.t > frames[i - 1].t)
  const res: RunResult = { view, contacts: 0, cadence: null, shank: null, reach: null, foot: null, trunk: null, crossover: null, pelvicDrop: null, findings: [] }
  if (F.length < 8) {
    res.findings.push({ level: 'info', title: 'Pocos fotogramas', text: 'Pon el modo Automático y reproduce el vídeo entero (mejor a ×¼) para que pueda analizar varias zancadas.' })
    return res
  }
  // hacia dónde mira el corredor: por la orientación de los pies (vale también en cinta)
  const facing = F.reduce((acc, f) => acc + Math.sign(g(f, 'toe', 0).x - g(f, 'heel', 0).x) + Math.sign(g(f, 'toe', 1).x - g(f, 'heel', 1).x), 0)
  const dir = Math.sign(facing) || Math.sign(g(F[F.length - 1], 'hip', 0).x - g(F[0], 'hip', 0).x) || 1
  const minGap = 0.25 * slow // dos apoyos del mismo pie no pueden estar a menos de 0,25 s reales
  const ic =
    view === 'lado'
      ? ([0, 1] as const).flatMap((s) => contactsSide(F, s, dir, w, h, minGap).map((i) => ({ i: landing(F, i, s, 0.15 * slow), s })))
      : contactsBack(F, minGap / 2)
  ic.sort((a, b) => F[a.i].t - F[b.i].t)
  res.contacts = ic.length
  if (ic.length >= 3) {
    const span = (F[ic[ic.length - 1].i].t - F[ic[0].i].t) / slow
    if (span > 0) res.cadence = Math.round(((ic.length - 1) / span) * 60)
  }
  const X = (p: P) => p.x * w
  const Y = (p: P) => p.y * h

  if (view === 'lado') {
    const shank: number[] = []
    const reach: number[] = []
    const foot: number[] = []
    ic.forEach(({ i, s }) => {
      const f = F[i]
      const hip = g(f, 'hip', s)
      const knee = g(f, 'knee', s)
      const ankle = g(f, 'ankle', s)
      const heel = g(f, 'heel', s)
      const toe = g(f, 'toe', s)
      shank.push(deg(Math.atan2((X(ankle) - X(knee)) * dir, Y(ankle) - Y(knee))))
      const femur = Math.hypot(X(knee) - X(hip), Y(knee) - Y(hip)) || 1
      reach.push(((X(ankle) - X(hip)) * dir) / femur)
      foot.push(deg(Math.atan2(Y(heel) - Y(toe), (X(toe) - X(heel)) * dir)))
    })
    res.shank = r1(avg(shank))
    res.reach = avg(reach) == null ? null : Math.round(avg(reach)! * 100) / 100
    res.foot = r1(avg(foot))
    res.trunk = r1(avg(F.map((f) => deg(Math.atan2((X(g(f, 'sh', 0)) - X(g(f, 'hip', 0))) * dir, Y(g(f, 'hip', 0)) - Y(g(f, 'sh', 0)))))))
  } else {
    let cross = 0
    const drops: number[] = []
    // inclinación de la pelvis en cada fotograma; la "media" del vídeo quita lo torcido que vaya el móvil
    const tilt = (f: Frame) => {
      const a = g(f, 'hip', 0)
      const b = g(f, 'hip', 1)
      return deg(Math.atan2(Y(a) - Y(b), Math.abs(X(a) - X(b)) || 1))
    }
    const tilts = F.map(tilt).sort((x, y) => x - y)
    const base = tilts[Math.floor(tilts.length / 2)] ?? 0
    ic.forEach(({ i, s }) => {
      const f = F[i]
      const r = g(f, 'hip', 0)
      const l = g(f, 'hip', 1)
      const mid = (r.x + l.x) / 2
      const hipW = Math.abs(r.x - l.x) || 0.05
      const fx = (g(f, 'heel', s).x + g(f, 'toe', s).x) / 2
      const side = s === 0 ? Math.sign(r.x - mid) : Math.sign(l.x - mid)
      if ((fx - mid) * side < -0.05 * hipW) cross++
      // caída de la pelvis en los fotogramas de ese apoyo
      const sec = 0.15 * slow
      for (let k = i; k < F.length && F[k].t - F[i].t <= sec; k++) drops.push(Math.abs(tilt(F[k]) - base))
    })
    res.crossover = cross
    // pico típico (no el máximo absoluto, que suele ser ruido): percentil 90
    const ds = drops.sort((x, y) => x - y)
    res.pelvicDrop = ds.length ? Math.round(ds[Math.floor(ds.length * 0.9)]) : null
  }

  // conclusiones
  const R = LAB_RULES
  const fd = res.findings
  if (res.cadence != null)
    fd.push(
      res.cadence < R.cadence.low
        ? { level: 'warn', title: `Cadencia baja: ${res.cadence} pasos/min`, text: 'Subirla un 5-10 % reduce la carga en rodilla y cadera. Revisa si el vídeo es a cámara lenta (ajústalo arriba).' }
        : { level: 'ok', title: `Cadencia: ${res.cadence} pasos/min`, text: res.cadence >= R.cadence.good ? 'Buena cadencia.' : 'Correcta; se puede subir un poco si hay sobrecarga.' },
    )
  else fd.push({ level: 'info', title: 'Cadencia', text: 'No he detectado suficientes apoyos. Graba 3-4 zancadas seguidas, de lado y con todo el cuerpo.' })
  if (view === 'lado') {
    // la sobrezancada se decide por la tibia al apoyar (lo más estudiado); el alcance del pie es un dato de apoyo
    const over = res.shank != null && res.shank >= R.shank.warn
    const bad = res.shank != null && res.shank >= R.shank.bad
    if (res.shank != null)
      fd.push({
        level: bad ? 'bad' : over ? 'warn' : 'ok',
        title: bad ? 'Sobrezancada clara (overstriding)' : over ? 'Algo de sobrezancada' : 'Sin sobrezancada',
        text: `Al apoyar, la tibia va ${res.shank}° inclinada hacia delante y el tobillo cae ${res.reach} fémures por delante de la cadera.${over ? ' Apoyar más debajo del cuerpo (subir cadencia) reduce el frenado y la carga.' : ''}`,
      })
    if (res.foot != null) {
      const type = res.foot > R.footStrike.heel ? 'de talón' : res.foot < R.footStrike.fore ? 'de antepié (punta)' : 'de mediopié'
      fd.push({
        level: 'info',
        title: `Pisada probable ${type}`,
        text: `El pie llega al suelo con ${res.foot}° respecto al suelo (compruébalo a cámara lenta: con 30 fps es aproximado). No hay una pisada mejor: la de talón carga más la rodilla; la de antepié, más Aquiles y gemelo. Valóralo según su lesión.`,
      })
    }
    if (res.trunk != null)
      fd.push(
        res.trunk > R.trunk.max
          ? { level: 'warn', title: `Tronco muy inclinado: ${res.trunk}°`, text: 'Mucha inclinación hacia delante; más carga en cadera y espalda baja.' }
          : res.trunk < R.trunk.min
            ? { level: 'warn', title: `Tronco muy recto o hacia atrás: ${res.trunk}°`, text: 'Poca inclinación; suele ir con más carga en la rodilla. Una ligera inclinación hacia delante (5-10°) es lo habitual.' }
            : { level: 'ok', title: `Tronco: ${res.trunk}° hacia delante`, text: 'Inclinación dentro de lo habitual.' },
      )
  } else {
    if (res.crossover != null)
      fd.push(
        res.crossover >= Math.max(2, res.contacts * 0.25)
          ? { level: res.crossover >= res.contacts * 0.5 ? 'bad' : 'warn', title: 'Zancada que cruza la línea media', text: `En ${res.crossover} de ${res.contacts} apoyos el pie cruza al otro lado. Se relaciona con cintilla iliotibial y sobrecarga de tibia; abrir un poco el apoyo ayuda.` }
          : { level: 'ok', title: 'El pie no cruza la línea media', text: 'Apoyos con buena anchura.' },
      )
    if (res.pelvicDrop != null)
      fd.push({
        level: res.pelvicDrop >= R.pelvicDrop.bad ? 'bad' : res.pelvicDrop >= R.pelvicDrop.warn ? 'warn' : 'ok',
        title: `Caída de la pelvis: ${res.pelvicDrop}°`,
        text:
          res.pelvicDrop >= R.pelvicDrop.warn
            ? 'Cae la pelvis del lado contrario al apoyar: falta control de glúteo medio. Se relaciona con cintilla, rodilla y cadera.'
            : 'Buen control de la pelvis.',
      })
  }
  return res
}

/** Texto corto para guardar el análisis junto al vídeo */
export const runNote = (r: RunResult) => 'Carrera: ' + r.findings.map((f) => f.title).join(' · ')
