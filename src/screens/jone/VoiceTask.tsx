import { useRef, useState } from 'react'
import { addTask, toggleTask } from '../../data/actions'
import { useCtx } from '../../data/store'
import { IcMic, IcStop } from '../../ui/icons'
import { norm } from './VideoLab'

interface Rec {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void
  onend: () => void
  onerror: (e: { error: string }) => void
  start: () => void
  stop: () => void
}
const SR = (): (new () => Rec) | null => {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

/** Botón de micrófono fijo en todo tu panel: hablas y se crea una tarea. Si nombras a un paciente, se le asigna. */
export function VoiceButton() {
  const c = useCtx()
  const [open, setOpen] = useState(false)
  const [txt, setTxt] = useState('')
  const [live, setLive] = useState(false)
  const [err, setErr] = useState('')
  const rec = useRef<Rec | null>(null)
  const who = c.st.patients.find((p) => norm(txt).split(/\s+/).includes(norm(p.name)))

  const start = () => {
    setOpen(true)
    setErr('')
    setTxt('')
    const C = SR()
    if (!C) {
      setErr('Este navegador no deja dictar aquí. Toca el micrófono del teclado y dicta la tarea.')
      return
    }
    const r = new C()
    r.lang = 'es-ES'
    r.interimResults = true
    r.continuous = false
    r.onresult = (e) => setTxt(Array.from(e.results).map((x) => x[0].transcript).join(' '))
    r.onend = () => setLive(false)
    r.onerror = (e) => {
      setLive(false)
      if (e.error === 'not-allowed') setErr('Necesito permiso para usar el micrófono.')
    }
    rec.current = r
    r.start()
    setLive(true)
  }
  const save = () => {
    const t = txt.trim()
    if (!t) return
    addTask(t.charAt(0).toUpperCase() + t.slice(1), who?.id || null, 'voz')
    setOpen(false)
    setTxt('')
  }

  return (
    <>
      <button className={`vfab ${live ? 'live' : ''}`} aria-label="Dictar una tarea" onClick={() => (live ? rec.current?.stop() : start())}>
        {live ? <IcStop /> : <IcMic />}
      </button>
      {open && (
        <div className="overlay" onClick={() => !live && setOpen(false)}>
          <div className="sheet vsheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <span className="lbl">{live ? 'Te escucho…' : 'Nueva tarea'}</span>
            <textarea rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Ej.: llamar a Mikel el jueves para revisar los saltos" autoFocus={!!err} />
            {err && <p className="muted" style={{ margin: 0 }}>{err}</p>}
            {who && <p className="vwho">Para: <b>{who.name}</b></p>}
            <div className="row">
              {live ? (
                <button className="btn" onClick={() => rec.current?.stop()}>
                  He terminado
                </button>
              ) : (
                <button className="btn" disabled={!txt.trim()} onClick={save}>
                  Guardar tarea
                </button>
              )}
              {!live && SR() && (
                <button className="btn ghost" onClick={start}>
                  Repetir
                </button>
              )}
              <button className="btn ghost" onClick={() => (rec.current?.stop(), setOpen(false))}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** Lista de tareas (las dictadas llevan la marca "voz"). */
export function TaskList() {
  const c = useCtx()
  const name = (id: string | null) => c.st.patients.find((p) => p.id === id)?.name
  const list = c.st.tasks.slice().sort((a, b) => +a.done - +b.done)
  return (
    <ul className="tlist">
      {list.map((t) => (
        <li key={t.id} className={t.done ? 'done' : ''}>
          <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} aria-label="Hecha" />
          <span>
            {t.text}
            <small>
              {name(t.patient) ? name(t.patient) : 'General'}
              {t.src === 'voz' ? ' · dictada' : ''}
            </small>
          </span>
        </li>
      ))}
      {!list.length && <li className="muted">Sin tareas. Toca el micrófono y dicta una.</li>}
    </ul>
  )
}
