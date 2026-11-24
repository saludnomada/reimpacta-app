import { BrandIcon } from '../../ui/BrandIcon'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  finishSession,
  leaveSession,
  openSession,
  setExerciseComment,
  setExerciseVideo,
  setPain,
  setSessionPain,
  setSetValue,
  tickSet,
  toggleExerciseDone,
} from '../../data/actions'
import { fShort, parseD } from '../../domain/dates'
import { doseText, estMin, painOk, painZone, routineFor, sessName, sessStats, sType, videoById, type Ctx } from '../../domain/logic'
import type { Patient, RoutineItem } from '../../domain/model'
import { painTone, toneVar } from '../../domain/scales'
import { IcCheck, IcChevron, IcClock } from '../../ui/icons'
import { TaskIcon } from '../../ui/TaskIcon'
import { VideoBox } from '../../ui/VideoBox'
import { VideoThumb } from '../../ui/VideoThumb'
import { sentence } from './Home'
import { finishPhrase } from '../../domain/patientHome'
import { getStore } from '../../data/store'

const itemName = (c: Ctx, it: RoutineItem) =>
  it.kind === 'caco' ? (+it.walk ? 'Correr y caminar' : 'Carrera continua') : sentence(videoById(c, it.v)?.title || 'Ejercicio')

function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** LA SESIÓN: lista de ejercicios con su vídeo, al estilo de las apps de fisio, y botón de terminar. */
export function Session({ c, p }: { c: Ctx; p: Patient }) {
  const { day = '' } = useParams()
  const nav = useNavigate()
  const r = routineFor(c, p, parseD(day))
  const s = p.sessions[day]
  const [open, setOpen] = useState<number | null>(null)
  const [fin, setFin] = useState(false)
  const [, tick] = useState(0)
  const future = parseD(day) > c.today

  useEffect(() => {
    if (r && !future) openSession(p.id, day)
    const t = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day])

  if (!r)
    return (
      <div className="phone">
        <Bar title="Día libre" onBack={() => nav('/')} />
        <section className="h5-rest rest-ic">
          <BrandIcon k="recuperar" size={44} />
          <div>
            <b>Día libre</b>
            <span>Aprovecha para desconectar, disfrutar, descansar y recargar energía. Tu cuerpo también se recupera hoy.</span>
          </div>
        </section>
      </div>
    )

  if (open != null) return <Exercise c={c} p={p} day={day} i={open} onBack={() => setOpen(null)} onNext={() => setOpen(open + 1 < r.items.length ? open + 1 : null)} />

  const doneN = s ? s.ex.filter((e) => e.done).length : 0
  const live = s && s.status === 'active' && s.startedAt ? c.now - s.startedAt : s?.elapsed || 0
  const back = () => {
    if (!future) leaveSession(p.id, day)
    nav('/')
  }

  return (
    <div className="phone">
      <Bar
        title={sessName(r)}
        onBack={back}
        right={
          s?.status === 'done' ? (
            <span className="se-time done">Hecha</span>
          ) : s?.status === 'active' ? (
            <span className="se-time live">{fmtClock(live)}</span>
          ) : (
            <span className="se-time">
              <IcClock /> {estMin(r)} min
            </span>
          )
        }
      />
      <div className="se-head">
        <span className="x-chip solid">
          <TaskIcon k={sType(r) || 'fuerza'} /> {sessName(r)}
        </span>
        <span className="se-count">
          {doneN}/{r.items.length} {r.items.length === 1 ? 'ejercicio' : 'ejercicios'}
        </span>
      </div>
      <div className="se-bar" aria-hidden="true">
        {r.items.map((_, i) => (
          <i key={i} className={s?.ex[i]?.done ? 'ok' : ''} />
        ))}
      </div>
      {future && <p className="se-note">Es la sesión del {fShort(parseD(day))}. Puedes verla para prepararte; ese día podrás apuntar tus series.</p>}
      {!future && s?.status === 'preview' && <p className="se-note">Molestias de hasta {painOk(p)}/10 están permitidas y son buenas. La sesión arranca sola al apuntar tu primera serie.</p>}

      <ul className="se-list">
        {r.items.map((it, i) => {
          const e = s?.ex[i]
          const v = it.kind === 'caco' ? null : videoById(c, it.v)
          return (
            <li key={i}>
              <button className={`se-item ${e?.done ? 'done' : ''}`} onClick={() => setOpen(i)}>
                <VideoThumb v={v} w={92} />
                <span className="se-tx">
                  <small>Ejercicio {i + 1}</small>
                  <b>{itemName(c, it)}</b>
                  <span>{doseText(it)}</span>
                  {e?.pain && e.lvl != null && (
                    <em className={`tchip t-${painTone(e.lvl, painOk(p))}`}>Dolor {e.lvl}/10</em>
                  )}
                </span>
                <span className={`se-check ${e?.done ? 'on' : ''}`} aria-label={e?.done ? 'Hecho' : 'Sin hacer'}>
                  {e?.done ? <IcCheck /> : <IcChevron />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {!future && s?.status !== 'done' && (
        <button
          className="x-cta"
          onClick={() => {
            finishSession(p.id, day)
            setFin(true)
          }}
        >
          Terminar sesión · {doneN}/{r.items.length}
        </button>
      )}
      {fin && <FinishSheet c={c} p={p} day={day} onClose={() => (setFin(false), nav('/'))} />}
    </div>
  )
}

function Bar({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <div className="sbar se-sbar">
      <button className="back" onClick={onBack} aria-label="Volver">
        ‹
      </button>
      <h2>{title}</h2>
      {right}
    </div>
  )
}

/** UN EJERCICIO: vídeo grande, series, dolor 0-10 con su color, comentario y vídeo para Jone. */
function Exercise({ c, p, day, i, onBack, onNext }: { c: Ctx; p: Patient; day: string; i: number; onBack: () => void; onNext: () => void }) {
  const r = routineFor(c, p, parseD(day))!
  const it = r.items[i]
  const e = p.sessions[day]?.ex[i]
  const ro = parseD(day) > c.today
  const v = it.kind === 'caco' ? undefined : videoById(c, it.v)
  const [cmt, setCmt] = useState(!!e?.comment)
  const thr = painOk(p)
  const last = i === r.items.length - 1
  return (
    <div className="phone">
      <Bar title={`${i + 1} de ${r.items.length}`} onBack={onBack} />
      {it.kind === 'caco' ? (
        <div className="se-caco">
          {[...Array(it.sets)].map((_, k) => (
            <span key={k}>
              <i className="r" style={{ flex: it.run }} />
              {+it.walk > 0 && <i className="w" style={{ flex: it.walk }} />}
            </span>
          ))}
        </div>
      ) : (
        <div className="se-video">
          <VideoBox v={v} />
        </div>
      )}
      <div>
        <h1 className="x-title" style={{ fontSize: 22 }}>
          {itemName(c, it)}
        </h1>
        <span className="se-dose">{doseText(it)}</span>
        {it.note && <p className="se-note">{it.note}</p>}
      </div>

      {it.kind !== 'caco' ? (
        <section className="se-card">
          <div className="se-sets head">
            <span>Serie</span>
            <span>{it.unit === 'secs' ? 'Segundos' : 'Reps'}</span>
            <span>Kg</span>
            <span />
          </div>
          {(e?.sets || []).map((x, j) => {
            const ok = String(x.v).trim() !== ''
            return (
              <div key={j} className={`se-sets ${ok ? 'ok' : ''}`}>
                <span className="n">{j + 1}</span>
                <input inputMode="numeric" type="number" min={0} placeholder={String(it.amount)} value={x.v} disabled={ro} aria-label={`Serie ${j + 1}`} onChange={(ev) => setSetValue(p.id, day, i, j, 'v', ev.target.value)} />
                <input inputMode="decimal" type="number" min={0} step={0.5} placeholder={it.kg || '–'} value={x.kg} disabled={ro} aria-label={`Kilos serie ${j + 1}`} onChange={(ev) => setSetValue(p.id, day, i, j, 'kg', ev.target.value)} />
                <button className="tk" disabled={ro} onClick={() => tickSet(p.id, day, i, j)} aria-label={`Serie ${j + 1} hecha como estaba pautada`}>
                  <IcCheck />
                </button>
              </div>
            )
          })}
        </section>
      ) : (
        !ro && (
          <button className={`se-donebtn ${e?.done ? 'on' : ''}`} onClick={() => toggleExerciseDone(p.id, day, i)}>
            <IcCheck /> {e?.done ? 'Hecho' : 'Marcar como hecho'}
          </button>
        )
      )}

      {!ro && (
        <section className="se-card">
          <span className="se-q">¿Te ha dolido?</span>
          <div className="se-yn">
            <button className={e?.pain === false ? 'on' : ''} onClick={() => setPain(p.id, day, i, e?.pain === false ? null : false)}>
              No
            </button>
            <button className={e?.pain === true ? 'on' : ''} onClick={() => setPain(p.id, day, i, e?.pain === true ? null : true, e?.lvl ?? null)}>
              Sí
            </button>
          </div>
          {e?.pain && (
            <>
              <PainScale value={e.lvl} thr={thr} onPick={(lv) => setPain(p.id, day, i, true, lv)} />
              {e.lvl != null && <PainMsg v={e.lvl} thr={thr} />}
            </>
          )}
        </section>
      )}

      {!ro && (
        <div className="se-actions">
          {cmt ? (
            <textarea rows={2} defaultValue={e?.comment || ''} placeholder="Cuéntale a Jone lo que notes" onBlur={(ev) => setExerciseComment(p.id, day, i, ev.target.value.trim())} />
          ) : (
            <button className="se-ghost" onClick={() => setCmt(true)}>
              Comentar
            </button>
          )}
          {e?.video ? (
            <button className="se-ghost" onClick={() => setExerciseVideo(p.id, day, i, null)}>
              Vídeo enviado · cambiar
            </button>
          ) : (
            <label className="se-ghost">
              Enviar vídeo a Jone
              <input type="file" accept="video/*" capture="environment" hidden onChange={(ev) => ev.target.files?.[0] && setExerciseVideo(p.id, day, i, { name: ev.target.files[0].name, size: ev.target.files[0].size })} />
            </label>
          )}
        </div>
      )}

      <button className="x-cta" onClick={onNext}>
        {last ? 'Volver a la sesión' : 'Siguiente ejercicio'}
      </button>
    </div>
  )
}

export function PainScale({ value, thr, onPick }: { value: number | null; thr: number; onPick: (v: number) => void }) {
  return (
    <div className="pscale" role="group" aria-label="Dolor de 0 a 10">
      {[...Array(11)].map((_, v) => (
        <button key={v} className={value === v ? 'on' : ''} style={{ ['--tc' as string]: toneVar(painTone(v, thr)) }} aria-pressed={value === v} onClick={() => onPick(v)}>
          {v}
        </button>
      ))}
    </div>
  )
}

const WA = (t: string) => `https://wa.me/${(getStore().get().data?.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(t)}`
export function PainMsg({ v, thr }: { v: number; thr: number }) {
  const z = painZone(v, thr)
  const t = painTone(v, thr)
  const msg =
    z === 'ok'
      ? `Bien: hasta ${thr}/10 es una molestia buena, forma parte de tu recuperación.`
      : z === 'warn'
        ? 'Vigílalo: si en la siguiente serie sube, baja un poco el peso o las repeticiones.'
        : z === 'hi'
          ? `Con un ${v}/10, en la próxima serie baja el peso, las repeticiones o el rango.`
          : `Un ${v}/10 es demasiado. No lo repitas sin avisarme.`
  return (
    <div className={`pmsg2 t-${t}`}>
      <p>{msg}</p>
      {z === 'stop' && (
        <a className="se-wa" href={WA(z === 'stop' ? `Hola Jone, me ha dolido ${v}/10 en un ejercicio y no lo repito hasta hablar contigo` : `Hola Jone, en un ejercicio me ha dolido ${v}/10`)} target="_blank" rel="noopener">
          Avisar a Jone por WhatsApp
        </a>
      )}
    </div>
  )
}

function FinishSheet({ c, p, day, onClose }: { c: Ctx; p: Patient; day: string; onClose: () => void }) {
  const s = p.sessions[day]
  const r = routineFor(c, p, parseD(day))
  const [cm, setCm] = useState(s?.comment || '')
  if (!s || !r) return null
  const st = sessStats(s, r)
  return (
    <div className="overlay">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="finh">
        <span className="x-over">Sesión completada</span>
        <h2 id="finh" className="x-title" style={{ fontSize: 24 }}>
          Bien hecho, {p.name}
        </h2>
        <p className="fin-phrase">{finishPhrase(c, p, day)}</p>
        <div className="fin-stats">
          <div>
            <b>{fmtClock(s.elapsed || 0)}</b>
            <span>tiempo</span>
          </div>
          <div>
            <b>{st.sets}</b>
            <span>series</span>
          </div>
          <div>
            <b>{s.ex.filter((e) => e.done).length}</b>
            <span>ejercicios</span>
          </div>
        </div>
        <span className="se-q">¿Cuánto dolor has tenido hoy en el entrenamiento?</span>
        <PainScale value={s.painSession ?? null} thr={painOk(p)} onPick={(v) => setSessionPain(p.id, day, v)} />
        {s.painSession != null && <PainMsg v={s.painSession} thr={painOk(p)} />}
        <textarea rows={2} value={cm} placeholder="Algo que contarle a Jone (opcional)" onChange={(ev) => setCm(ev.target.value)} />
        <button
          className="x-cta"
          onClick={() => {
            if (s.painSession != null) setSessionPain(p.id, day, s.painSession, cm.trim())
            onClose()
          }}
        >
          Guardar
        </button>
      </div>
    </div>
  )
}
