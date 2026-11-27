// Detección del "muñequito" (MediaPipe Pose, de Google). Se ejecuta en el propio
// móvil u ordenador: el vídeo no sale del dispositivo para analizarse.
// El modelo y su motor están en /public/mediapipe y solo se descargan al usarlo.
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import type { Pt } from '../domain/lab'

export type PoseModel = 'lite' | 'full'
const loading: Partial<Record<PoseModel, Promise<PoseLandmarker>>> = {}
const lastTs: Partial<Record<PoseModel, number>> = {}

/** lite = rápido (para ver el muñequito en directo) · full = más preciso (para el análisis de Jone) */
export function getPose(kind: PoseModel = 'lite'): Promise<PoseLandmarker> {
  if (!loading[kind]) {
    const p = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
      const fs = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
      const opts = (delegate: 'GPU' | 'CPU') =>
        PoseLandmarker.createFromOptions(fs, {
          baseOptions: { modelAssetPath: `/mediapipe/pose_landmarker_${kind}.task`, delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
      try {
        return await opts('GPU')
      } catch {
        return await opts('CPU')
      }
    })()
    loading[kind] = p
    p.catch(() => delete loading[kind])
  }
  return loading[kind]!
}

export type LMk = { x: number; y: number; z: number; v: number }
/** Puntos del cuerpo en el fotograma que se ve ahora (de 0 a 1), o null si no encuentra a nadie */
export async function detect(video: HTMLVideoElement, kind: PoseModel = 'lite'): Promise<LMk[] | null> {
  if (!video.videoWidth) return null
  const pose = await getPose(kind)
  lastTs[kind] = Math.max((lastTs[kind] || 0) + 1, performance.now())
  const r = pose.detectForVideo(video, lastTs[kind]!)
  const lm = r.landmarks?.[0]
  return lm ? lm.map((p) => ({ x: p.x, y: p.y, z: p.z, v: p.visibility ?? 1 })) : null
}

/** La pierna más cercana a la cámara (la que se ve mejor de lado): 'd' o 'i' */
export function nearSide(lm: LMk[]): 'd' | 'i' {
  const score = (ids: number[]) => ids.reduce((a, i) => a + (lm[i]?.v ?? 0) - (lm[i]?.z ?? 0), 0)
  return score([24, 26, 28, 30, 32]) >= score([23, 25, 27, 29, 31]) ? 'd' : 'i'
}

/** Empieza a cargar el muñequito en segundo plano (para que luego vaya rápido) */
export function prewarm(kind: PoseModel = 'lite') {
  const go = () => void getPose(kind).catch(() => {})
  const w = window as Window & { requestIdleCallback?: (f: () => void) => void }
  if (w.requestIdleCallback) w.requestIdleCallback(go)
  else setTimeout(go, 300)
}

type LM = { x: number; y: number }[]
// índices de MediaPipe: hombro 11/12, cadera 23/24, rodilla 25/26, tobillo 27/28, talón 29/30, punta del pie 31/32 (izdo/dcho)
const I = { hombro: [11, 12], cadera: [23, 24], rodilla: [25, 26], tobillo: [27, 28], talon: [29, 30], pie: [31, 32] }
const at = (lm: LM, k: keyof typeof I, s: 'd' | 'i') => lm[I[k][s === 'd' ? 1 : 0]]
const mix = (a: { x: number; y: number }, b: { x: number; y: number }, t: number): Pt => [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t]

/** Puntos anatómicos de partida a partir del muñequito (Jone los corrige después). Solo calcula los que se piden. */
export function toPoints(lm: LM, keys: string[]): Record<string, Pt> {
  const out: Record<string, Pt> = {}
  const midHip = mix(lm[23], lm[24], 0.5)
  const midSh = mix(lm[11], lm[12], 0.5)
  keys.forEach((key) => {
    const [base, side] = key.split('_') as [string, 'd' | 'i']
    const s = side === 'i' ? 'i' : 'd'
    const hip = at(lm, 'cadera', s)
    const knee = at(lm, 'rodilla', s)
    const ankle = at(lm, 'tobillo', s)
    const heel = at(lm, 'talon', s)
    const femur = Math.hypot(knee.x - hip.x, knee.y - hip.y) || 0.1
    let p: Pt | null = null
    switch (base) {
      case 'hombro': { const q = at(lm, 'hombro', s); p = [q.x, q.y]; break }
      case 'cresta': p = [hip.x, hip.y - femur * 0.22]; break
      case 'trocanter': p = [hip.x, hip.y]; break
      case 'condilo': case 'popliteo': p = [knee.x, knee.y]; break
      case 'tta': p = mix(knee, ankle, 0.12); break
      case 'maleolo': case 'tobillo': p = [ankle.x, ankle.y]; break
      case 'meta5': case 'meta2': { const q = at(lm, 'pie', s); p = [q.x, q.y]; break }
      case 'calcbase': p = [heel.x, heel.y]; break
      case 'calcsup': p = mix(heel, ankle, 0.55); break
      case 'eips': { const m = mix(hip, { x: midHip[0], y: midHip[1] }, 0.45); p = [m[0], m[1] - femur * 0.12]; break }
      case 'sacro': p = [midHip[0], midHip[1] - femur * 0.1]; break
      case 'c7': p = [midSh[0], midSh[1] - femur * 0.08]; break
    }
    if (p) out[key] = p
  })
  return out
}

const BONES: [number, number][] = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
  [24, 26], [26, 28], [28, 30], [30, 32], [28, 32],
  [11, 13], [13, 15], [12, 14], [14, 16],
]

/** Dibuja el muñequito en un canvas del mismo tamaño que el vídeo */
export function drawSkeleton(cv: HTMLCanvasElement, lm: { x: number; y: number; v: number }[] | null) {
  const ctx = cv.getContext('2d')
  if (!ctx) return
  const w = (cv.width = cv.clientWidth * devicePixelRatio)
  const h = (cv.height = cv.clientHeight * devicePixelRatio)
  ctx.clearRect(0, 0, w, h)
  if (!lm) return
  const lw = Math.max(3, w / 160)
  ctx.lineCap = 'round'
  ctx.lineWidth = lw
  ctx.strokeStyle = '#D0FB00'
  ctx.shadowColor = 'rgba(0,0,0,.6)'
  ctx.shadowBlur = lw
  BONES.forEach(([a, b]) => {
    const p = lm[a]
    const q = lm[b]
    if (!p || !q || p.v < 0.3 || q.v < 0.3) return
    ctx.beginPath()
    ctx.moveTo(p.x * w, p.y * h)
    ctx.lineTo(q.x * w, q.y * h)
    ctx.stroke()
  })
  ctx.fillStyle = '#fff'
  ;[11, 12, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32].forEach((i) => {
    const p = lm[i]
    if (!p || p.v < 0.3) return
    ctx.beginPath()
    ctx.arc(p.x * w, p.y * h, lw * 1.3, 0, Math.PI * 2)
    ctx.fill()
  })
}
