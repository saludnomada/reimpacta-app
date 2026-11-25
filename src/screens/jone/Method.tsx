import { useState } from 'react'
import { saveMethod } from '../../data/actions'
import { useCtx } from '../../data/store'
import { coverage, MEASURE_LABEL, phaseOf, ruleText } from '../../domain/method'
import { PHASES, WORK_CATS, ZONES, type PhaseMethod, type TestSpec, type Video, type WorkCat } from '../../domain/model'
import { IcSearch } from '../../ui/icons'
import { VideoThumb } from '../../ui/VideoThumb'
import { norm } from './VideoLab'

const sentence = (s: string) => {
  const t = s.replace(/^TEST:\s*/i, '').toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}
const CATS = Object.keys(WORK_CATS) as WorkCat[]
const NEW_TEST: TestSpec = { measure: 'reps', rule: 'lsi', value: 90, note: '' }

/** EL MÉTODO: lo que define cada fase. Objetivo, tests con criterio, hitos y ejercicios clave. */
export function Method() {
  const c = useCtx()
  const [f, setF] = useState(1)
  return (
    <div className="jl">
      <p className="muted" style={{ margin: 0 }}>
        Aquí defines tu método: qué buscas en cada fase, qué tests tiene que superar el paciente (con un criterio medible) y qué ejercicios son
        la base. Los datos que ves son un <b>ejemplo</b>: cambia los objetivos y los valores por los tuyos.
      </p>
      <div className="me-tabs">
        {PHASES.map((nm, i) => (
          <button key={i} className={f === i + 1 ? 'on' : ''} onClick={() => setF(i + 1)}>
            <b>{i + 1}</b>
            <span>{nm}</span>
          </button>
        ))}
      </div>
      <PhaseEditor key={f} f={f} videos={c.st.videos} />
    </div>
  )
}

function PhaseEditor({ f, videos }: { f: number; videos: Video[] }) {
  const c = useCtx()
  const [m, setM] = useState<PhaseMethod>(() => structuredClone(phaseOf(c.st, f)))
  const [tests, setTests] = useState<string[]>(() => [...(c.st.phaseTests[f] || [])])
  const [goals, setGoals] = useState<string[]>(() => [...(c.st.defaultGoals[f] || [])])
  const [saved, setSaved] = useState(false)
  const v = (id: string) => videos.find((x) => x.id === id)
  const touch = () => setSaved(false)
  const spec = (id: string) => m.tests[id] || NEW_TEST
  const setSpec = (id: string, patch: Partial<TestSpec>) => (touch(), setM({ ...m, tests: { ...m.tests, [id]: { ...spec(id), ...patch } } }))
  const inPhase = videos.filter((x) => x.phases?.includes(f))
  const cov = coverage(videos, f, ZONES.filter((z) => z !== 'hombro'), CATS.filter((k) => k !== 'test'))

  return (
    <>
      <div className="me-save">
        <span>
          Fase {f} · {PHASES[f - 1]}
        </span>
        <button
          className="btn small"
          onClick={() => {
            saveMethod(f, { ...m, tests: Object.fromEntries(tests.map((id) => [id, spec(id)])) }, tests, goals.filter((g) => g.trim()))
            setSaved(true)
          }}
        >
          {saved ? 'Guardado' : 'Guardar fase'}
        </button>
      </div>

      <section className="card">
        <span className="lbl">Objetivo de la fase</span>
        <textarea className="me-ta" rows={2} value={m.objective} placeholder="Qué buscas conseguir en esta fase" onChange={(e) => (touch(), setM({ ...m, objective: e.target.value }))} />
      </section>

      <section className="card">
        <span className="lbl">Tests para superar la fase</span>
        {tests.map((id) => {
          const t = spec(id)
          return (
            <div key={id} className="me-test">
              <div className="me-test-h">
                <VideoThumb v={v(id)} w={64} />
                <div>
                  <b>{sentence(v(id)?.title || 'Test')}</b>
                  <small className="me-rule">{ruleText(t)}</small>
                </div>
                <button className="me-x" onClick={() => (touch(), setTests(tests.filter((x) => x !== id)))} aria-label="Quitar test">
                  ×
                </button>
              </div>
              <div className="me-test-f">
                <label>
                  <span>Se mide en</span>
                  <select className="search" value={t.measure} onChange={(e) => setSpec(id, { measure: e.target.value as TestSpec['measure'], rule: e.target.value === 'check' ? 'check' : t.rule })}>
                    {Object.entries(MEASURE_LABEL).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                {t.measure !== 'check' && (
                  <>
                    <label>
                      <span>Lo supera si</span>
                      <select className="search" value={t.rule} onChange={(e) => setSpec(id, { rule: e.target.value as TestSpec['rule'] })}>
                        <option value="lsi">% de la pierna sana</option>
                        <option value="min">llega al menos a</option>
                        <option value="max">no pasa de</option>
                      </select>
                    </label>
                    <label className="me-val">
                      <span>{t.rule === 'lsi' ? '%' : 'Valor'}</span>
                      <input className="search" inputMode="decimal" value={t.value} onChange={(e) => setSpec(id, { value: +e.target.value.replace(',', '.') || 0 })} />
                    </label>
                  </>
                )}
                <label className="me-note">
                  <span>Cómo se hace (nota para ti)</span>
                  <input className="search" value={t.note} placeholder="Ej.: mejor de 3 intentos" onChange={(e) => setSpec(id, { note: e.target.value })} />
                </label>
              </div>
            </div>
          )
        })}
        <Picker
          placeholder="Añadir un test de tu biblioteca…"
          pool={videos.filter((x) => (x.type === 'test' || x.cat === 'test') && !tests.includes(x.id))}
          onPick={(id) => (touch(), setTests([...tests, id]))}
        />
      </section>

      <section className="card">
        <span className="lbl">Hitos a lograr</span>
        <p className="muted me-hint">Se copian a cada paciente nuevo; en su ficha los puedes ajustar.</p>
        {goals.map((g, i) => (
          <div key={i} className="me-goal">
            <input className="search" value={g} onChange={(e) => (touch(), setGoals(goals.map((x, j) => (j === i ? e.target.value : x))))} />
            <button className="me-x" onClick={() => (touch(), setGoals(goals.filter((_, j) => j !== i)))} aria-label="Quitar hito">
              ×
            </button>
          </div>
        ))}
        <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => (touch(), setGoals([...goals, '']))}>
          + Añadir hito
        </button>
      </section>

      <section className="card">
        <span className="lbl">Ejercicios clave</span>
        <div className="me-keys">
          {m.key.map((id) => (
            <span key={id} className="me-key">
              <VideoThumb v={v(id)} w={48} />
              <span>{sentence(v(id)?.title || '')}</span>
              <button className="me-x" onClick={() => (touch(), setM({ ...m, key: m.key.filter((x) => x !== id) }))} aria-label="Quitar">
                ×
              </button>
            </span>
          ))}
        </div>
        <Picker
          placeholder="Añadir un ejercicio clave…"
          pool={videos.filter((x) => x.type !== 'clase' && x.type !== 'test' && !m.key.includes(x.id))}
          onPick={(id) => (touch(), setM({ ...m, key: [...m.key, id] }))}
        />
      </section>

      <section className="card">
        <span className="lbl">Tu biblioteca en esta fase</span>
        <p className="muted me-hint">
          {inPhase.length} vídeos etiquetados con la fase {f}. Cada casilla es cuántos tienes de ese tipo para esa zona: las vacías te dicen qué
          grabar o qué etiquetar.
        </p>
        <div className="me-cov">
          <div className="me-cov-r head">
            <span />
            {CATS.filter((k) => k !== 'test').map((k) => (
              <span key={k}>{WORK_CATS[k]}</span>
            ))}
          </div>
          {cov.map((r) => (
            <div key={r.zone} className="me-cov-r">
              <span>{r.zone.charAt(0).toUpperCase() + r.zone.slice(1)}</span>
              {r.n.map((n, i) => (
                <b key={i} className={n ? 'has' : ''}>
                  {n || '–'}
                </b>
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function Picker({ pool, placeholder, onPick }: { pool: Video[]; placeholder: string; onPick: (id: string) => void }) {
  const [q, setQ] = useState('')
  const w = norm(q).split(/\s+/).filter(Boolean)
  const found = w.length ? pool.filter((x) => w.every((t) => norm([x.title, ...x.keywords].join(' ')).includes(t))).slice(0, 6) : []
  return (
    <>
      <div className="vl-search">
        <IcSearch />
        <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
      </div>
      {found.map((x) => (
        <button
          key={x.id}
          className="re-add"
          onClick={() => {
            onPick(x.id)
            setQ('')
          }}
        >
          <VideoThumb v={x} w={48} />
          <span>{sentence(x.title)}</span>
          <b>+ Añadir</b>
        </button>
      ))}
    </>
  )
}
