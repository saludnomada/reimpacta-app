import { useState } from 'react'
import { sendExerciseVideo } from '../data/videos'
import { IcCamera } from './icons'

/** Botón "Grabarme": abre la cámara, sube el vídeo y avisa mientras se envía. */
export function VideoSend({ pid, day, i, label = 'Grabarme' }: { pid: string; day: string; i: number; label?: string }) {
  const [st, setSt] = useState<'idle' | 'busy' | 'ok'>('idle')
  const [err, setErr] = useState('')
  return (
    <>
      <label className={`se-ghost ${st === 'busy' ? 'busy' : ''}`}>
        <IcCamera /> {st === 'busy' ? 'Enviando…' : st === 'ok' ? 'Enviado · otro' : label}
        <input
          type="file"
          accept="video/*"
          capture="environment"
          hidden
          disabled={st === 'busy'}
          onChange={async (ev) => {
            const f = ev.target.files?.[0]
            ev.target.value = ''
            if (!f) return
            setErr('')
            setSt('busy')
            try {
              await sendExerciseVideo(pid, day, i, f)
              setSt('ok')
            } catch (e) {
              setErr((e as Error).message)
              setSt('idle')
            }
          }}
        />
      </label>
      {err && <p className="au-err vs-err">{err}</p>}
    </>
  )
}
