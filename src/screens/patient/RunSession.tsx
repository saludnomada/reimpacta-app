import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { openSession, saveRun, setSessionPain } from '../../data/actions'
import { fShort, parseD } from '../../domain/dates'
import { painOk, routineFor, sessName, type Ctx } from '../../domain/logic'
import type { CacoItem, Patient } from '../../domain/model'
import { finishPhrase } from '../../domain/patientHome'
import { BrandIcon } from '../../ui/BrandIcon'
import { IcPlay } from '../../ui/icons'
import { PainMsg, PainScale } from './Session'

/** Un tramo del plan: correr o caminar, en segundos */
interface Step {
  kind: 'run' | 'walk'
  secs: number
  block: number
}

function planSteps(items: CacoItem[]): Step[] {
  const out: Step[] = []
  let block = 0
  items.forEach((it) => {
    for (let k = 0; k < it.sets; k++) {
      block++
      out.push({ kind: 'run', secs: Math.round(+it.run * 60), block })
      if (+it.walk > 0) out.push({ kind: 'walk', secs: Math.round(+it.walk * 60), block })
    }
  })
  return out
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`
const minTxt = (m: number) => (m % 1 ? String(m).replace('.', ',') : String(m))

/** Pitido corto (funciona en iPhone porque el sonido lo arranca un toque del paciente) */
function useBeep() {
  const ctx = useRef<AudioContext | null>(null)
  const prime = () => {
    try {
      ctx.current = ctx.current || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      void ctx.current.resume()
    } catch {
      /* sin sonido */
    }
  }
  const beep = (n = 1) => {
    const a = ctx.current
    if (!a) return
    for (let i = 0; i < n; i++) {
      const o = a.createOscillator()
      const g = a.createGain()
      o.frequency.value = 880
      g.gain.value = 0.18
      o.connect(g).connect(a.destination)
      const t = a.currentTime + i * 0.25
      o.start(t)
      o.stop(t + 0.15)
    }
    try {
      navigator.vibrate?.(n > 1 ? [150, 80, 150] : 200)
    } catch {
      /* sin vibración */
    }
  }
  return { prime, beep }
}

/** SESIÓN DE CORRER (CaCo o carrera continua): el plan en gráfico, guía con tiempos y apuntar los km. */
export function RunSession({ c, p, day }: { c: Ctx; p: Patient; day: string }) {
  const nav = useNavigate()
  const r = routineFor(c, p, parseD(day))!
  const items = r.items.filter((it): it is CacoItem => it.kind === 'caco')
  const steps = planSteps(items)
  const total = steps.reduce((a, s) => a + s.secs, 0)
  const blocks = steps.length ? steps[steps.length - 1].block : 0
  const s = p.sessions[day]
  const future = parseD(day) > c.today
  const [mode, setMode] = useState<'plan' | 'guide' | 'log' | 'done'>(s?.status === 'done' ? 'done' : 'plan')
  useEffect(() => {
    if (!future) openSession(p.id, day)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day])

  const it = items[0]
  const summary = it ? (+it.walk ? `${it.sets} × (${minTxt(+it.run)}' corre + ${minTxt(+it.walk)}' camina)` : `${minTxt(+it.run * it.sets)}' de carrera continua`) : ''

  if (mode === 'guide') return <Guide steps={steps} total={total} blocks={blocks} onExit={() => setMode('plan')} onDone={() => setMode('log')} />
  if (mode === 'log') return <LogRun c={c} p={p} day={day} planMin={Math.round(total / 60)} onSaved={() => setMode('done')} onBack={() => setMode('plan')} />

  return (
    <div className="phone">
      <div className="sbar se-sbar">
        <button className="back" onClick={() => nav('/')} aria-label="Volver">
          ‹
        </button>
        <h2>{sessName(r) === 'CACO' ? 'Correr y caminar' : 'Correr'}</h2>
      </div>

      <section className="run-hero">
        <div className="run-top">
          <BrandIcon k="correr" size={44} />
          <div>
            <small>{future ? `Para el ${fShort(parseD(day))}` : mode === 'done' ? 'Hecha' : 'Tu salida de hoy'}</small>
            <b>{summary}</b>
          </div>
        </div>
        <div className="run-total">
          <b>{Math.round(total / 60)}</b>
          <span>minutos en total</span>
        </div>
        <div className="run-bar" aria-hidden="true">
          {steps.map((st, i) => (
            <i key={i} className={st.kind} style={{ flex: st.secs }} />
          ))}
        </div>
        <div className="run-leg">
          <span>
            <i className="run" /> Corre suave
          </span>
          {steps.some((x) => x.kind === 'walk') && (
            <span>
              <i className="walk" /> Camina
            </span>
          )}
        </div>
      </section>

      <ol className="run-steps">
        {items.map((x, i) =>
          +x.walk ? (
            <li key={i}>
              <span className="n">{x.sets}×</span>
              <span>
                <b>Corre {minTxt(+x.run)} min</b> suave, a un ritmo en el que puedas hablar
                <br />
                <b>Camina {minTxt(+x.walk)} min</b> para recuperar
              </span>
            </li>
          ) : (
            <li key={i}>
              <span className="n">1</span>
              <span>
                <b>Corre {minTxt(+x.run * x.sets)} min seguidos</b>, suave, a un ritmo en el que puedas hablar
              </span>
            </li>
          ),
        )}
      </ol>
      {it?.note && <p className="se-note">{it.note}</p>}

      {mode === 'done' && s?.run && (
        <section className="run-result">
          <div>
            <b>{s.run.km != null ? String(s.run.km).replace('.', ',') : '–'}</b>
            <span>km</span>
          </div>
          <div>
            <b>{s.run.min ?? Math.round((s.elapsed || 0) / 6e4)}</b>
            <span>minutos</span>
          </div>
          {s.painSession != null && (
            <div>
              <b>{s.painSession}/10</b>
              <span>dolor</span>
            </div>
          )}
        </section>
      )}

      {!future && mode !== 'done' && (
        <>
          <button className="x-cta" onClick={() => setMode('guide')}>
            <IcPlay /> Empezar con guía
          </button>
          <button className="se-ghost" onClick={() => setMode('log')}>
            Ya lo he hecho: apuntar km y tiempo
          </button>
          <p className="se-note">
            Te aviso con un pitido en cada cambio. Si quieres los km, graba la salida a la vez con tu reloj o con Strava y apúntalos al
            terminar.
          </p>
        </>
      )}
    </div>
  )
}

/** Guía en directo: CORRE / CAMINA con cuenta atrás, pitido en cada cambio y la pantalla encendida. */
function Guide({ steps, total, blocks, onExit, onDone }: { steps: Step[]; total: number; blocks: number; onExit: () => void; onDone: () => void }) {
  const { prime, beep } = useBeep()
  const [started, setStarted] = useState<number | null>(null)
  const [pausedAt, setPausedAt] = useState<number | null>(null)
  const [offset, setOffset] = useState(0) // ms en pausa acumulados
  const [, tick] = useState(0)
  const lastIdx = useRef(-1)
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 250)
    let lock: { release: () => Promise<void> } | null = null
    ;(navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
      ?.request('screen')
      .then((l) => (lock = l))
      .catch(() => {})
    return () => {
      clearInterval(t)
      void lock?.release().catch(() => {})
    }
  }, [])

  const now = Date.now()
  const elapsed = started == null ? 0 : ((pausedAt ?? now) - started - offset) / 1000
  let acc = 0,
    idx = steps.length
  for (let i = 0; i < steps.length; i++) {
    if (elapsed < acc + steps[i].secs) {
      idx = i
      break
    }
    acc += steps[i].secs
  }
  const finished = started != null && idx >= steps.length
  const cur = steps[Math.min(idx, steps.length - 1)]
  const left = finished ? 0 : acc + cur.secs - elapsed
  if (started != null && idx !== lastIdx.current) {
    if (lastIdx.current !== -1) beep(finished ? 3 : 2)
    lastIdx.current = idx
  }
  useEffect(() => {
    if (!finished) return
    const t = setTimeout(onDone, 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  return (
    <div className={`guide ${cur.kind}`}>
      <div className="guide-top">
        <button onClick={onExit} aria-label="Salir">
          ‹ Salir
        </button>
        <span>
          Bloque {cur.block} de {blocks}
        </span>
      </div>
      <div className="guide-mid">
        <span className="guide-kind">{finished ? '¡Hecho!' : started == null ? 'Preparado' : cur.kind === 'run' ? 'Corre' : 'Camina'}</span>
        <b className="guide-time">{started == null ? mmss(cur.secs) : mmss(left)}</b>
        {!finished && started != null && steps[idx + 1] && (
          <span className="guide-next">
            Después: {steps[idx + 1].kind === 'run' ? 'corre' : 'camina'} {mmss(steps[idx + 1].secs)}
          </span>
        )}
      </div>
      <div className="guide-bar" aria-hidden="true">
        <i style={{ width: `${Math.min(100, (elapsed / total) * 100)}%` }} />
      </div>
      <div className="guide-btns">
        {started == null ? (
          <button
            className="x-cta"
            onClick={() => {
              prime()
              beep()
              setStarted(Date.now())
            }}
          >
            Empezar
          </button>
        ) : (
          <>
            <button
              className="se-ghost"
              onClick={() => {
                if (pausedAt) {
                  setOffset(offset + Date.now() - pausedAt)
                  setPausedAt(null)
                } else setPausedAt(Date.now())
              }}
            >
              {pausedAt ? 'Seguir' : 'Pausa'}
            </button>
            <button className="se-ghost" onClick={onDone}>
              Terminar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** Apuntar la salida: km (opcional), minutos y dolor. */
function LogRun({ c, p, day, planMin, onSaved, onBack }: { c: Ctx; p: Patient; day: string; planMin: number; onSaved: () => void; onBack: () => void }) {
  const [km, setKm] = useState('')
  const [min, setMin] = useState(String(planMin))
  const [pain, setPain] = useState<number | null>(null)
  const thr = painOk(p)
  const save = () => {
    saveRun(p.id, day, km ? +km.replace(',', '.') : undefined, min ? +min : undefined)
    if (pain != null) setSessionPain(p.id, day, pain)
    onSaved()
  }
  return (
    <div className="phone">
      <div className="sbar se-sbar">
        <button className="back" onClick={onBack} aria-label="Volver">
          ‹
        </button>
        <h2>Apunta tu salida</h2>
      </div>
      <p className="fin-phrase">{finishPhrase(c, p, day)}</p>
      <section className="se-card run-log">
        <label>
          <span>Kilómetros</span>
          <input inputMode="decimal" placeholder="Ej.: 3,2" value={km} onChange={(e) => setKm(e.target.value)} />
          <small>Opcional. Míralo en tu reloj o en Strava.</small>
        </label>
        <label>
          <span>Minutos</span>
          <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} />
        </label>
      </section>
      <section className="se-card">
        <span className="se-q">¿Cuánto dolor has tenido corriendo?</span>
        <PainScale value={pain} thr={thr} onPick={setPain} />
        {pain != null && <PainMsg v={pain} thr={thr} />}
      </section>
      <button className="x-cta" onClick={save}>
        Guardar
      </button>
    </div>
  )
}
