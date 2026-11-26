import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mode } from '../../data'
import { sendLabVideo, videoLink } from '../../data/videos'
import type { Ctx } from '../../domain/logic'
import { cameraTip, CAMERA_LABEL, labKey, labProgress, labTest, SIDE_LABEL, sidesOf, type Side } from '../../domain/lab'
import type { Patient } from '../../domain/model'
import { IcCamera, IcCheck } from '../../ui/icons'
import { PoseVideo } from '../../ui/PoseVideo'
import { VideoBox } from '../../ui/VideoBox'

/** TUS TESTS EN VÍDEO: la lista que ha elegido Jone, en orden. Ver cómo se hace, grabarse y ver el muñequito.
 *  Sin números: el análisis se lo explica Jone. */
export function LabTests({ c, p }: { c: Ctx; p: Patient }) {
  const nav = useNavigate()
  const lab = labProgress(p)
  const [local, setLocal] = useState<Record<string, string>>({}) // vídeos recién grabados (en este móvil)
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => () => Object.values(local).forEach((u) => URL.revokeObjectURL(u)), [local])

  if (!lab)
    return (
      <div className="phone">
        <Bar onBack={() => nav('/')} />
        <p className="muted">Ahora mismo no tienes tests en vídeo. Te avisaré cuando toque.</p>
      </div>
    )
  const { req, total, done } = lab
  return (
    <div className="phone">
      <Bar onBack={() => nav('/')} />
      <section className="lt-head">
        <span className="x-over">{req.label}</span>
        <h1 className="x-title">Tus tests en vídeo</h1>
        <p>
          Hazlos <b>en este orden</b>. En cada uno, mira primero cómo se hace y luego grábate. Cuando los tengas todos, te preparo tu análisis.
        </p>
        <div className="lt-bar" aria-label={`${done} de ${total} grabados`}>
          <i style={{ width: `${(done / Math.max(1, total)) * 100}%` }} />
        </div>
        <small>
          {done} de {total} grabados
        </small>
      </section>

      {done === total && (
        <section className="lt-done">
          <IcCheck /> ¡Listo! Me han llegado todos. Te mando tu análisis en unos días.
        </section>
      )}

      <ol className="lt-list">
        {req.tests.map((id, i) => {
          const t = labTest(id)
          if (!t) return null
          const sides = sidesOf(t)
          const allDone = sides.every((s) => p.labFiles?.[labKey(req.id, id, s)])
          const demo = c.st.labVideos?.[id] ? c.st.videos.find((v) => v.id === c.st.labVideos![id]) : undefined
          const isOpen = open === id || (open == null && !allDone && req.tests.findIndex((x) => !sidesOf(labTest(x)!).every((s) => p.labFiles?.[labKey(req.id, x, s)])) === i)
          return (
            <li key={id} className={`lt-it ${allDone ? 'ok' : ''} ${isOpen ? 'open' : ''}`}>
              <button className="lt-h" onClick={() => setOpen(isOpen ? '' : id)}>
                <span className="lt-n">{allDone ? <IcCheck /> : i + 1}</span>
                <span>
                  <b>{t.name}</b>
                  <small>
                    {CAMERA_LABEL[t.camera]}
                    {t.sides ? ' · cada pierna' : ''}
                  </small>
                </span>
              </button>
              {isOpen && (
                <div className="lt-b">
                  {demo && <VideoBox v={demo} />}
                  <p>{t.how}</p>
                  <p className="lt-cam">
                    <IcCamera /> {cameraTip(t.camera)}
                  </p>
                  {sides.map((s) => (
                    <Rec key={s} p={p} reqId={req.id} testId={id} side={s} local={local[labKey(req.id, id, s)]} onLocal={(u) => setLocal({ ...local, [labKey(req.id, id, s)]: u })} />
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
  return (
    <div className="lt-rec">
      {side !== '-' && <span className="lt-side">{SIDE_LABEL[side]}</span>}
      {src ? (
        <PoseVideo src={src} />
      ) : f ? (
        <div className="lt-sent">
          <span>
            <IcCheck /> Enviado
          </span>
          {mode === 'real' && f.path && (
            <button className="se-ghost" onClick={() => videoLink(f.path!).then(setRemote).catch(() => setErr('No he podido abrir el vídeo.'))}>
              Ver mi muñequito
            </button>
          )}
        </div>
      ) : null}
      <label className={`x-cta lt-btn ${busy ? 'busy' : ''} ${f ? 'again' : ''}`}>
        <IcCamera /> {busy ? 'Enviando…' : f ? 'Repetir vídeo' : 'Grabarme'}
        <input
          type="file"
          accept="video/*"
          capture="environment"
          hidden
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setErr('')
            onLocal(URL.createObjectURL(file))
            setBusy(true)
            try {
              await sendLabVideo(p.id, key, file)
            } catch (x) {
              setErr((x as Error).message)
            }
            setBusy(false)
          }}
        />
      </label>
      {err && <p className="au-err">{err}</p>}
    </div>
  )
}
