// Detección del "muñequito" (MediaPipe Pose, de Google). Se ejecuta en el propio
// móvil u ordenador: el vídeo no sale del dispositivo para analizarse.
// El modelo y su motor están en /public/mediapipe y solo se descargan al usarlo.
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import { POSE_IDX, type Pt } from '../domain/lab'

let loading: Promise<PoseLandmarker> | null = null
let lastTs = 0

export function getPose(): Promise<PoseLandmarker> {
  if (!loading)
    loading = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
      const fs = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
      const opts = (delegate: 'GPU' | 'CPU') =>
        PoseLandmarker.createFromOptions(fs, {
          baseOptions: { modelAssetPath: '/mediapipe/pose_landmarker_lite.task', delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
        })
      try {
        return await opts('GPU')
      } catch {
        return await opts('CPU')
      }
    })()
  loading.catch(() => (loading = null))
  return loading
}

/** Puntos del cuerpo en el fotograma que se ve ahora (de 0 a 1), o null si no encuentra a nadie */
export async function detect(video: HTMLVideoElement): Promise<{ x: number; y: number; v: number }[] | null> {
  if (!video.videoWidth) return null
  const pose = await getPose()
  lastTs = Math.max(lastTs + 1, performance.now())
  const r = pose.detectForVideo(video, lastTs)
  const lm = r.landmarks?.[0]
  return lm ? lm.map((p) => ({ x: p.x, y: p.y, v: p.visibility ?? 1 })) : null
}

/** Puntos anatómicos de partida a partir del muñequito (Jone los corrige después) */
export function toPoints(lm: { x: number; y: number }[]): Record<string, Pt> {
  const out: Record<string, Pt> = {}
  Object.entries(POSE_IDX).forEach(([k, i]) => {
    const p = lm[i]
    if (!p) return
    // la cresta ilíaca queda algo por encima de la articulación de la cadera
    out[k] = k.startsWith('cresta') ? [p.x, p.y - 0.035] : [p.x, p.y]
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
