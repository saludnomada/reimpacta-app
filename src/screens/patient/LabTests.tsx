import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mode } from '../../data'
import { sendLabVideo, videoLink } from '../../data/videos'
import type { Ctx } from '../../domain/logic'
import { cameraTip, CAMERA_LABEL, labKey, labProgress, labTest, SIDE_LABEL, sidesOf, type Side } from '../../domain/lab'
import type { Patient } from '../../domain/model'
import { IcCamera, IcCheck } from '../../ui/icons'
import { PoseVideo } from '../../ui/PoseVideo'
import { LiveRecorder } from '../../ui/LiveRecorder'
import { prewarm } from '../../ui/pose'
import { VideoBox } from '../../ui/VideoBox'
import { Ring } from '../../ui/Ring'

/** TUS TESTS EN VÍDEO: la lista que ha elegido Jone, en orden. Ver cómo se hace, grabarse y ver sus puntos.
 *  Sin números: el análisis se lo explica Jone. */
export function LabTests({ c, p }: { c: Ctx; p: Patient }) {
  const nav = useNavigate()
  const lab = labProgress(p)
  const [local, setLocal] = useState<Record<string, string>>({}) // vídeos recién grabados (en este móvil)
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => () => Object.values(local).forEach((u) => URL.revokeObjectURL(u)), [local])
  useEffect(() => prewarm(), [])

  if (!lab)
    return (
      <div className="phone">
        <Bar onBack={() => nav('/')} />
        <p className="muted">Ahora mismo no tienes tests en vídeo. Te avisaré cuando toque.</p>
      </div>
    )
  const { req, total, done } = lab
  const next = req.tests.findIndex((x) => !sidesOf(labTest(x)!).every((sd) => p.labFiles?.[labKey(req.id, x, sd)]))
  return (
    <div className="phone">
      <Bar onBack={() => nav('/')} />
      <section className="lt2-hero">
        <Ring value={done / Math.max(1, total)} size={76} stroke={7}>
          <b>
            {done}/{total}
          </b>
        </Ring>
        <div>
          <span className="x-over">{req.label}</span>
          <h1 className="x-title">Tus tests</h1>
          <p>{done === total ? 'Todos enviados. Te mando tu análisis.' : 'En orden. Mira cómo se hace y grábate.'}</p>
        </div>
      </section>

      <ol className="lt-list">
        {req.tests.map((id, i) => {
          const t = labTest(id)
          if (!t) return null
          const sides = sidesOf(t)
          const nDone = sides.filter((sd) => p.labFiles?.[labKey(req.id, id, sd)]).length
          const allDone = nDone === sides.length
          const demo = c.st.labVideos?.[id] ? c.st.videos.find((v) => v.id === c.st.labVideos![id]) : undefined
          const isOpen = open === id || (open == null && i === next)
          return (
            <li key={id} className={`lt-it ${allDone ? 'ok' : ''} ${isOpen ? 'open' : ''} ${i === next ? 'next' : ''}`}>
              <button className="lt-h" onClick={() => setOpen(isOpen ? '' : id)}>
                <span className="lt-n">{allDone ? <IcCheck /> : i + 1}</span>
                <span className="lt-tt">
                  <b>{t.name}</b>
                  <span className="lt-chips">
                    <em>
                      <IcCamera /> {CAMERA_LABEL[t.camera]}
                    </em>
                    {t.sides && <em>{nDone}/2 piernas</em>}
                  </span>
                </span>
              </button>
              {isOpen && (
                <div className="lt-b">
                  {demo && <VideoBox v={demo} />}
                  <p className="lt-how">{t.how}</p>
                  {sides.map((sd) => (
                    <Rec key={sd} p={p} reqId={req.id} testId={id} side={sd} local={local[labKey(req.id, id, sd)]} onLocal={(u) => setLocal({ ...local, [labKey(req.id, id, sd)]: u })} />
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Bar({ onBack }: { onBack: () => void }) {
  return (
    <div className="sbar se-sbar">
      <button className="back" onClick={onBack} aria-label="Volver">
        ‹
      </button>
      <h2>Tests en vídeo</h2>
    </div>
  )
}

/** Grabar un lado y ver el muñequito */
function Rec({ p, reqId, testId, side, local, onLocal }: { p: Patient; reqId: string; testId: string; side: Side; local?: string; onLocal: (u: string) => void }) {
  const key = labKey(reqId, testId, side)
  const f = p.labFiles?.[key]
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [remote, setRemote] = useState<string | null>(null)
  const src = local || remote
  const [live, setLive] = useState(false)
  const t = labTest(testId)
  const tip = t ? cameraTip(t.camera) : undefined
  const send = async (file: File) => {
    setErr('')
    onLocal(URL.createObjectURL(file))
    setBusy(true)
    try {
      await sendLabVideo(p.id, key, file)
    } catch (x) {
      setErr((x as Error).message)
    }
    setBusy(false)
  }
  return (
    <div className={`lt-rec ${f ? 'sent' : ''}`}>
      <div className="lt-rec-h">
        {side !== '-' ? <b>{SIDE_LABEL[side]}</b> : <b>Vídeo</b>}
        {f && (
          <em className="lt-ok">
            <IcCheck /> Enviado
          </em>
        )}
      </div>
      {src ? (
        <PoseVideo src={src} />
      ) : f && mode === 'real' && f.path ? (
        <button className="se-ghost" onClick={() => videoLink(f.path!).then(setRemote).catch(() => setErr('No he podido abrir el vídeo.'))}>
          Ver mi vídeo con los puntos
        </button>
      ) : null}
      <div className="lt-act">
        <button className={`x-cta lt-btn ${busy ? 'busy' : ''} ${f ? 'again' : ''}`} disabled={busy} onClick={() => setLive(true)}>
          <IcCamera /> {busy ? 'Enviando…' : f ? 'Repetir' : 'Grabarme'}
        </button>
        <label className={`se-ghost lt-gal ${busy ? 'busy' : ''}`} aria-label="Subir de la galería">
          Galería
          <input
            type="file"
            accept="video/*"
            hidden
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void send(file)
            }}
          />
        </label>
      </div>
      {live && (
        <LiveRecorder
          tip={tip}
          onClose={() => setLive(false)}
          onDone={(file) => {
            setLive(false)
            void send(file)
          }}
        />
      )}
      {err && <p className="au-err">{err}</p>}
    </div>
  )
}
