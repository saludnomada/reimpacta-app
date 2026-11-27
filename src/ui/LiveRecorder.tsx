import { useEffect, useRef, useState } from 'react'
import { detect, drawSkeleton, prewarm } from './pose'

/** CÁMARA CON MUÑEQUITO EN DIRECTO: se ve el esqueleto mientras se graba.
 *  El vídeo se graba limpio (sin líneas); el muñequito se vuelve a calcular al analizarlo. */
export function LiveRecorder({ onDone, onClose, tip }: { onDone: (f: File) => void; onClose: () => void; tip?: string }) {
  const v = useRef<HTMLVideoElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const rec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [ratio, setRatio] = useState(9 / 16)
  const [state, setState] = useState<'starting' | 'ready' | 'rec' | 'done' | 'error'>('starting')
  const [secs, setSecs] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [err, setErr] = useState('')

  // abrir la cámara
  useEffect(() => {
    prewarm('lite')
    let stream: MediaStream | null = null
    let stop = false
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } },
        })
        if (stop) return stream.getTracks().forEach((t) => t.stop())
        const el = v.current!
        el.srcObject = stream
        await el.play()
        setState('ready')
      } catch {
        setErr('No puedo abrir la cámara. Dale permiso a la app para usar la cámara, o sube un vídeo de tu galería.')
        setState('error')
      }
    })()
    return () => {
      stop = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [facing])

  // muñequito en directo
  useEffect(() => {
    let stop = false
    let busy = false
    const loop = async () => {
      if (stop) return
      const el = v.current
      if (el && cv.current && !busy && el.readyState >= 2 && state !== 'done') {
        busy = true
        try {
          drawSkeleton(cv.current, await detect(el, 'lite'))
        } catch {
          /* sin muñequito en este móvil: se graba igual */
        }
        busy = false
      }
      requestAnimationFrame(() => void loop())
    }
    void loop()
    return () => {
      stop = true
    }
  }, [state])

  useEffect(() => {
    if (state !== 'rec') return
    const t0 = Date.now()
    const i = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 250)
    return () => clearInterval(i)
  }, [state])

  const start = () => {
    const stream = v.current?.srcObject as MediaStream | null
    if (!stream) return
    const types = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    const mimeType = types.find((x) => window.MediaRecorder?.isTypeSupported?.(x))
    try {
      const r = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : undefined)
      chunks.current = []
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      r.onstop = () => {
        const type = r.mimeType || mimeType || 'video/webm'
        const ext = type.includes('mp4') ? 'mp4' : 'webm'
        setFile(new File(chunks.current, `test-${Date.now()}.${ext}`, { type }))
        setState('done')
      }
      r.start(500)
      rec.current = r
      setSecs(0)
      setState('rec')
    } catch {
      setErr('Este móvil no deja grabar desde la app. Graba con la cámara del móvil y súbelo de la galería.')
      setState('error')
    }
  }

  return (
    <div className="lr">
      <div className="lr-top">
        <button onClick={onClose} aria-label="Cerrar">
          ‹ Volver
        </button>
        {state !== 'rec' && state !== 'done' && (
          <button onClick={() => setFacing(facing === 'environment' ? 'user' : 'environment')}>Cambiar cámara</button>
        )}
      </div>
      <div className="lr-box" style={{ aspectRatio: String(ratio), width: `min(100%, calc(72dvh * ${ratio}))` }}>
        <video ref={v} muted playsInline onLoadedMetadata={(e) => setRatio(e.currentTarget.videoWidth / e.currentTarget.videoHeight || 9 / 16)} />
        <canvas ref={cv} />
        {state === 'rec' && <span className="lr-time">● {secs}s</span>}
      </div>
      {tip && state !== 'done' && <p className="lr-tip">{tip}</p>}
      {err && <p className="lr-err">{err}</p>}
      <div className="lr-ctl">
        {state === 'ready' && (
          <button className="lr-rec" onClick={start} aria-label="Empezar a grabar">
            <i />
          </button>
        )}
        {state === 'rec' && (
          <button className="lr-rec on" onClick={() => rec.current?.stop()} aria-label="Parar">
            <i />
          </button>
        )}
        {state === 'done' && file && (
          <>
            <button className="x-cta" onClick={() => onDone(file)}>
              Enviar este vídeo
            </button>
            <button className="se-ghost lr-again" onClick={() => (setFile(null), setState('ready'))}>
              Repetir
            </button>
          </>
        )}
        {state === 'starting' && <p className="lr-tip">Abriendo la cámara…</p>}
      </div>
    </div>
  )
}
