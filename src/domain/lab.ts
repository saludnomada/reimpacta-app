// LABORATORIO REIMPACTA: catálogo de tests en vídeo, puntos anatómicos y medidas.
// El paciente graba y ve su "muñequito". Jone corrige los puntos y mide (solo Jone ve los números).

export type Side = 'd' | 'i' | '-'
export type Camera = 'lado' | 'frente' | 'detras'
/** Puntos que Jone puede colocar (cada uno en lado derecho _d e izquierdo _i) */
export const POINTS = {
  hombro: 'Hombro',
  cresta: 'Cresta ilíaca',
  trocanter: 'Trocánter',
  condilo: 'Cóndilo femoral',
  maleolo: 'Maléolo',
  calcaneo: 'Calcáneo',
  meta5: '5º metatarsiano',
} as const
export type PointBase = keyof typeof POINTS
export type Pt = [number, number] // posición en el fotograma, de 0 a 1

/** Medida: ángulo en un punto (a-b-c), segmento respecto a la vertical o a la horizontal.
 *  En los nombres de punto, "{s}" es el lado del vídeo (d o i). */
export interface Measure {
  name: string
  kind: 'angle' | 'vert' | 'horiz'
  pts: string[]
}

export interface LabTest {
  id: string
  n: number
  group: string
  name: string
  camera: Camera
  /** se graba cada pierna por separado */
  sides: boolean
  /** instrucciones para el paciente */
  how: string
  measures: Measure[]
  /** test de salto: Jone marca despegue y aterrizaje para la altura */
  jump?: boolean
}

const A = (name: string, a: string, b: string, c: string): Measure => ({ name, kind: 'angle', pts: [a, b, c] })
const V = (name: string, a: string, b: string): Measure => ({ name, kind: 'vert', pts: [a, b] })
const H = (name: string, a: string, b: string): Measure => ({ name, kind: 'horiz', pts: [a, b] })
const KNEE = A('Flexión de rodilla', 'trocanter_{s}', 'condilo_{s}', 'maleolo_{s}')
const VALGO = A('Ángulo de rodilla de frente (valgo)', 'trocanter_{s}', 'condilo_{s}', 'maleolo_{s}')
const PELVIS = H('Inclinación de la pelvis', 'cresta_d', 'cresta_i')
const TIBIA = V('Inclinación de la tibia', 'condilo_{s}', 'maleolo_{s}')
const TRONCO = V('Inclinación del tronco', 'hombro_{s}', 'trocanter_{s}')

const CAM: Record<Camera, string> = {
  lado: 'Móvil apoyado de lado, a la altura de la cadera, a 3-4 metros. Que se te vea entero.',
  frente: 'Móvil apoyado de frente, a la altura de la cadera, a 3-4 metros. Que se te vea entero.',
  detras: 'Móvil apoyado detrás de ti, a la altura de la cadera, a 3-4 metros. Que se te vea entero.',
}
export const cameraTip = (c: Camera) => CAM[c]
export const CAMERA_LABEL: Record<Camera, string> = { lado: 'De lado', frente: 'De frente', detras: 'Desde detrás' }

export const LAB_TESTS: LabTest[] = [
  // Cadera
  { id: 'cad-ri', n: 1, group: 'Movilidad de cadera', name: 'Rotación interna de cadera', camera: 'frente', sides: true, how: 'Sentado en el borde de una mesa, rodillas a 90°. Lleva el pie hacia fuera todo lo que puedas sin mover la pelvis y aguanta 2 segundos.', measures: [TIBIA] },
  { id: 'cad-re', n: 2, group: 'Movilidad de cadera', name: 'Rotación externa de cadera', camera: 'frente', sides: true, how: 'Sentado en el borde de una mesa, rodillas a 90°. Lleva el pie hacia dentro todo lo que puedas sin mover la pelvis y aguanta 2 segundos.', measures: [TIBIA] },
  { id: 'cad-ff', n: 3, group: 'Movilidad de cadera', name: 'Fuerza de flexores de cadera', camera: 'lado', sides: true, how: 'Sentado con la espalda recta, sube la rodilla todo lo que puedas sin echarte hacia atrás y aguanta 10 segundos.', measures: [A('Ángulo tronco-muslo', 'hombro_{s}', 'trocanter_{s}', 'condilo_{s}')] },
  { id: 'cad-thomas', n: 4, group: 'Movilidad de cadera', name: 'Test de Thomas (flexores y psoas)', camera: 'lado', sides: true, how: 'Tumbado boca arriba al borde de una mesa, abraza una rodilla al pecho y deja caer la otra pierna relajada.', measures: [H('Muslo respecto a la horizontal', 'trocanter_{s}', 'condilo_{s}'), KNEE] },
  // Rodilla
  { id: 'rod-ext', n: 5, group: 'Movilidad de rodilla', name: 'Extensión de rodilla', camera: 'lado', sides: true, how: 'Sentado en el suelo con las piernas estiradas. Empuja la rodilla contra el suelo todo lo que puedas.', measures: [KNEE] },
  { id: 'rod-flex', n: 6, group: 'Movilidad de rodilla', name: 'Flexión de rodilla', camera: 'lado', sides: true, how: 'Tumbado boca arriba, lleva el talón hacia el glúteo todo lo que puedas.', measures: [KNEE] },
  { id: 'tib-ri', n: 7, group: 'Movilidad de rodilla', name: 'Rotación interna de tibia', camera: 'frente', sides: true, how: 'Sentado, rodilla a 90° y talón apoyado. Gira la punta del pie hacia dentro sin mover la rodilla.', measures: [V('Orientación del pie', 'calcaneo_{s}', 'meta5_{s}')] },
  { id: 'tib-re', n: 8, group: 'Movilidad de rodilla', name: 'Rotación externa de tibia', camera: 'frente', sides: true, how: 'Sentado, rodilla a 90° y talón apoyado. Gira la punta del pie hacia fuera sin mover la rodilla.', measures: [V('Orientación del pie', 'calcaneo_{s}', 'meta5_{s}')] },
  // Tobillo e isquios
  { id: 'tob-fd', n: 9, group: 'Movilidad de tobillo', name: 'Flexión dorsal de tobillo (rodilla a la pared)', camera: 'lado', sides: true, how: 'De frente a la pared, pie adelantado. Lleva la rodilla a la pared sin levantar el talón y aleja el pie hasta el máximo.', measures: [TIBIA] },
  { id: 'isq', n: 10, group: 'Flexibilidad de isquios', name: 'Elevación de pierna recta', camera: 'lado', sides: true, how: 'Tumbado boca arriba, sube una pierna estirada todo lo que puedas sin doblar la rodilla. La otra, pegada al suelo.', measures: [H('Ángulo de la pierna', 'trocanter_{s}', 'maleolo_{s}')] },
  // Saltos
  { id: 'sal-bajo2', n: 11, group: 'Saltos', name: 'Saltos bajos a dos pies', camera: 'lado', sides: false, how: 'Saltitos rápidos y bajos con los dos pies durante 15 segundos. Graba a cámara lenta.', measures: [KNEE, TIBIA], jump: true },
  { id: 'sal-bajo1', n: 12, group: 'Saltos', name: 'Saltos bajos a un pie', camera: 'lado', sides: true, how: 'Saltitos rápidos y bajos a una pierna durante 15 segundos. Graba a cámara lenta.', measures: [KNEE, TIBIA], jump: true },
  { id: 'sal-alto2', n: 13, group: 'Saltos', name: 'Salto alto a dos pies', camera: 'lado', sides: false, how: 'Manos en la cintura, baja un poco y salta lo más alto que puedas. 3 saltos. Graba a cámara lenta.', measures: [KNEE], jump: true },
  { id: 'sal-alto1', n: 14, group: 'Saltos', name: 'Salto alto a un pie', camera: 'lado', sides: true, how: 'Manos en la cintura, a una pierna, salta lo más alto que puedas. 3 saltos. Graba a cámara lenta.', measures: [KNEE], jump: true },
  // Heel raise
  { id: 'hr2', n: 15, group: 'Elevación de talones (Aquiles y fascitis)', name: 'Elevación de talones a dos pies', camera: 'lado', sides: false, how: 'Sube y baja de puntillas con los dos pies al ritmo del metrónomo hasta que no puedas más.', measures: [A('Ángulo del tobillo arriba', 'condilo_{s}', 'maleolo_{s}', 'meta5_{s}')] },
  { id: 'hr1', n: 16, group: 'Elevación de talones (Aquiles y fascitis)', name: 'Elevación de talón a un pie', camera: 'lado', sides: true, how: 'Sube y baja de puntillas a una pierna al ritmo del metrónomo hasta que no puedas más.', measures: [A('Ángulo del tobillo arriba', 'condilo_{s}', 'maleolo_{s}', 'meta5_{s}')] },
  // Rotuliano
  { id: 'dec2', n: 17, group: 'Rotuliano', name: 'Sentadilla en plano inclinado 25° a dos pies', camera: 'frente', sides: false, how: 'De pie sobre una tabla inclinada 25°, baja despacio en 3 segundos hasta donde puedas sin dolor y sube.', measures: [VALGO, PELVIS] },
  { id: 'dec1', n: 18, group: 'Rotuliano', name: 'Sentadilla en plano inclinado 25° a un pie', camera: 'frente', sides: true, how: 'A una pierna sobre la tabla inclinada 25°, baja despacio en 3 segundos y sube.', measures: [VALGO, PELVIS] },
  // Saltos de distancia y caída
  { id: 'sal-adel', n: 19, group: 'Saltos', name: 'Salto hacia delante', camera: 'lado', sides: true, how: 'A una pierna, salta lo más lejos que puedas y aterriza estable 2 segundos. 3 intentos.', measures: [KNEE, TRONCO], jump: true },
  { id: 'caj2', n: 20, group: 'Caída desde cajón', name: 'Caída desde cajón a dos pies', camera: 'frente', sides: false, how: 'Desde un cajón de unos 30 cm, déjate caer y salta hacia arriba nada más tocar el suelo.', measures: [VALGO, PELVIS], jump: true },
  { id: 'caj1', n: 21, group: 'Caída desde cajón', name: 'Caída desde cajón a un pie', camera: 'frente', sides: true, how: 'Desde un cajón bajo, déjate caer a una pierna y aguanta estable 2 segundos.', measures: [VALGO, PELVIS] },
  // Carrera
  { id: 'car-lado', n: 22, group: 'Técnica de carrera', name: 'Carrera de lado', camera: 'lado', sides: false, how: 'Corre a tu ritmo suave pasando por delante del móvil, 3 veces.', measures: [A('Rodilla al apoyar', 'trocanter_{s}', 'condilo_{s}', 'maleolo_{s}'), V('Tibia al apoyar (sobrezancada)', 'condilo_{s}', 'maleolo_{s}'), TRONCO] },
  { id: 'car-detras', n: 23, group: 'Técnica de carrera', name: 'Carrera desde detrás', camera: 'detras', sides: false, how: 'Corre alejándote del móvil en línea recta unos 10 metros, 3 veces.', measures: [PELVIS, VALGO] },
]

export const labTest = (id: string) => LAB_TESTS.find((t) => t.id === id)

/** Puntos que hace falta colocar para las medidas de un test */
export function pointsFor(t: LabTest, side: Side): string[] {
  const s = side === 'i' ? 'i' : 'd'
  return [...new Set(t.measures.flatMap((m) => m.pts.map((p) => p.replace('{s}', s))))]
}
export const pointLabel = (key: string) => {
  const [b, s] = key.split('_')
  return `${POINTS[b as PointBase] || b} ${s === 'd' ? 'dcho.' : 'izdo.'}`
}

/** Calcula una medida en grados. w y h: tamaño del vídeo (para no deformar los ángulos). */
export function measureValue(m: Measure, side: Side, pts: Record<string, Pt>, w = 1, h = 1): number | null {
  const s = side === 'i' ? 'i' : 'd'
  const P = m.pts.map((k) => pts[k.replace('{s}', s)])
  if (P.some((x) => !x)) return null
  const xy = (p: Pt) => [p[0] * w, p[1] * h]
  if (m.kind === 'angle') {
    const [a, b, c] = P.map(xy)
    const v1 = [a[0] - b[0], a[1] - b[1]]
    const v2 = [c[0] - b[0], c[1] - b[1]]
    const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2) || 1)
    return Math.round((Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI)
  }
  const [a, b] = P.map(xy)
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  if (m.kind === 'vert') return Math.round((Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI)
  return Math.round((Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI)
}

/** Altura de salto por tiempo de vuelo: h = g·t²/8 (en cm). slow = cuántas veces más lento se ve el vídeo. */
export function jumpHeight(flightSecs: number, slow = 1) {
  const t = flightSecs / slow
  return Math.round(((9.81 * t * t) / 8) * 1000) / 10
}

/** Índices del "muñequito" de MediaPipe para cada punto */
export const POSE_IDX: Record<string, number> = {
  hombro_i: 11, hombro_d: 12, cresta_i: 23, cresta_d: 24, trocanter_i: 23, trocanter_d: 24,
  condilo_i: 25, condilo_d: 26, maleolo_i: 27, maleolo_d: 28, calcaneo_i: 29, calcaneo_d: 30, meta5_i: 31, meta5_d: 32,
}

export const labKey = (req: string, test: string, side: Side) => `${req}|${test}|${side}`
export const sidesOf = (t: LabTest): Side[] => (t.sides ? ['d', 'i'] : ['-'])
export const SIDE_LABEL: Record<Side, string> = { d: 'Pierna derecha', i: 'Pierna izquierda', '-': '' }

/** El último pedido de tests y cuántos vídeos lleva grabados */
export function labProgress(p: { lab?: { id: string; label: string; tests: string[] }[]; labFiles?: Record<string, unknown> }) {
  const req = p.lab?.[p.lab.length - 1]
  if (!req) return null
  const keys = req.tests.flatMap((id) => {
    const t = labTest(id)
    return t ? sidesOf(t).map((s) => labKey(req.id, id, s)) : []
  })
  const done = keys.filter((k) => p.labFiles?.[k]).length
  return { req, total: keys.length, done }
}
