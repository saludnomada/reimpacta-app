import { useEffect, useRef, useState } from 'react'
import { detect, drawSkeleton } from './pose'

/** Vídeo con el muñequito encima (lo que ve el paciente al grabarse). */
export function PoseVideo({ src }: { src: string }) {
  const v = useRef<HTMLVideoElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const [ratio, setRatio] = useState(9 / 16)
  const [st, setSt] = useState<'loading' | 'ok' | 'none' | 'error'>('loading')
  useEffect(() => {
    let stop = false
    let busy = false
    const loop = async () => {
      if (stop) return
      const el = v.current
      if (el && cv.current && !busy && el.readyState >= 2) {
        busy = true
        try {
          const lm = await detect(el)
          drawSkeleton(cv.current, lm)
          setSt(lm ? 'ok' : 'none')
        } catch {
          setSt('error')
        }
        busy = false
      }
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    return () => {
      stop = true
    }
  }, [src])
  return (
    <div className="pv">
      <div className="pv-box" style={{ aspectRatio: String(ratio), width: `min(100%, calc(70vh * ${ratio}))` }}>
        <video
          ref={v}
          src={src}
          playsInline
          muted
          loop
          autoPlay
          controls
          onLoadedMetadata={(e) => setRatio(e.currentTarget.videoWidth / e.currentTarget.videoHeight || 9 / 16)}
        />
        <canvas ref={cv} />
      </div>
      <small className="pv-st">
        {st === 'loading' ? 'Cargando…' : st === 'none' ? 'Que se te vea entero' : st === 'error' ? 'Vídeo recibido' : 'Puntos detectados'}
      </small>
    </div>
  )
}
