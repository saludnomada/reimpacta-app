import { useState } from 'react'
import { saveProtocolPhase } from '../../data/actions'
import { useCtx } from '../../data/store'
import { coverage, MEASURE_LABEL, ruleText } from '../../domain/method'
import { INJURIES, PHASES, WORK_CATS, ZONES, type InjuryKey, type ProtoPhase, type ProtoTest, type TestSpec, type Video, type WorkCat } from '../../domain/model'
import { PROTOCOLS } from '../../domain/protocols'
import { IcSearch } from '../../ui/icons'
import { VideoThumb } from '../../ui/VideoThumb'
import { norm } from './VideoLab'

const sentence = (s: string) => {
  const t = s.replace(/^TEST:\s*/i, '').toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}
const CATS = Object.keys(WORK_CATS) as WorkCat[]
const KEYS = Object.keys(INJURIES) as InjuryKey[]

/** EL MÉTODO por lesión: en cada fase, qué buscas, qué se trabaja, los tests (con criterio) y los hitos. */
export function Method() {
  const c = useCtx()
  const [inj, setInj] = useState<InjuryKey>('cintilla')
  const [f, setF] = useState(1)
  const n = (k: InjuryKey) => c.st.patients.filter((p) => p.protocol === k).length
  return (
    <div className="jl">
      <p className="muted" style={{ margin: 0 }}>
        Tu método por lesión. Cada paciente sigue el protocolo de su lesión: sus tests y sus hitos salen de aquí. Los criterios y los resultados
        <b> solo los ves tú</b>. Lo que hay es una <b>propuesta inicial basada en la evidencia</b>: ajusta los valores a tu forma de trabajar.
      </p>
      <div className="row">
        {KEYS.map((k) => (
          <button key={k} className={`chip ${inj === k ? 'on' : ''}`} onClick={() => setInj(k)}>
            {INJURIES[k]}
            {n(k) > 0 && ` · ${n(k)}`}
          </button>
        ))}
      </div>
      <div className="me-tabs">
        {PHASES.map((nm, i) => (
          <button key={i} className={f === i + 1 ? 'on' : ''} onClick={() => setF(i + 1)}>
            <b>{i + 1}</b>
            <span>{nm}</span>
          </button>
        ))}
      </div>
      <PhaseEditor key={inj + f} inj={inj} f={f} videos={c.st.videos} />
    </div>
  )
}

function PhaseEditor({ inj, f, videos }: { inj: InjuryKey; f: number; videos: Video[] }) {
  const c = useCtx()
  const start = c.st.protocols?.[inj]?.[f] || PROTOCOLS[inj][f]
  const [m, setM] = useState<ProtoPhase>(() => structuredClone(start))
  const [saved, setSaved] = useState(false)
  const set = (patch: Partial<ProtoPhase>) => (setSaved(false), setM({ ...m, ...patch }))
  const setTest = (i: number, patch: Partial<ProtoTest>) => set({ tests: m.tests.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  const setSpec = (i: number, patch: Partial<TestSpec>) => setTest(i, { spec: { ...m.tests[i].spec, ...patch } })
  const v = (id?: string) => videos.find((x) => x.id === id)
  const cov = coverage(videos, f, ZONES.filter((z) => z !== 'hombro'), CATS.filter((k) => k !== 'test'))

  return (
    <>
      <div className="me-save">
        <span>
          {INJURIES[inj]} · Fase {f} · {PHASES[f - 1]}
        </span>
        <button
          className="btn small"
          onClick={() => {
            saveProtocolPhase(inj, f, { ...m, goals: m.goals.filter((g) => g.trim()), tests: m.tests.filter((t) => t.name.trim()) })
            setSaved(true)
          }}
        >
          {saved ? 'Guardado' : 'Guardar fase'}
        </button>
      </div>

      <section className="card">
        <span className="lbl">Objetivo de la fase</span>
        <textarea className="me-ta" rows={2} value={m.objective} onChange={(e) => set({ objective: e.target.value })} />
        <span className="lbl">Qué se trabaja</span>
        <textarea className="me-ta" rows={3} value={m.work} onChange={(e) => set({ work: e.target.value })} />
      </section>

      <section className="card">
        <span className="lbl">Tests para superar la fase · solo para ti</span>
        {m.tests.map((t, i) => (
          <div key={t.id} className="me-test">
            <div className="me-test-h">
              {t.video ? <VideoThumb v={v(t.video)} w={64} /> : <span className="me-novid">Sin vídeo</span>}
              <div>
                <input className="me-name" value={t.name} onChange={(e) => setTest(i, { name: e.target.value })} aria-label="Nombre del test" />
                <small className="me-rule">{ruleText(t.spec)}</small>
              </div>
              <button className="me-x" onClick={() => set({ tests: m.tests.filter((_, j) => j !== i) })} aria-label="Quitar test">
                ×
              </button>
            </div>
            <div className="me-test-f">
              <label className="me-note">
                <span>Cómo se hace</span>
                <input className="search" value={t.how} onChange={(e) => setTest(i, { how: e.target.value })} />
              </label>
              <label>
                <span>Se mide en</span>
                <select className="search" value={t.spec.measure} onChange={(e) => setSpec(i, { measure: e.target.value as TestSpec['measure'], rule: e.target.value === 'check' ? 'check' : t.spec.rule === 'check' ? 'min' : t.spec.rule })}>
                  {Object.entries(MEASURE_LABEL).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              {t.spec.measure !== 'check' && (
                <>
                  <label>
                    <span>Lo supera si</span>
                    <select className="search" value={t.spec.rule} onChange={(e) => setSpec(i, { rule: e.target.value as TestSpec['rule'] })}>
                      <option value="lsi">% de la pierna sana</option>
                      <option value="min">llega al menos a</option>
                      <option value="max">no pasa de</option>
                    </select>
                  </label>
                  <label className="me-val">
                    <span>{t.spec.rule === 'lsi' ? '%' : 'Valor'}</span>
                    <input className="search" inputMode="decimal" value={t.spec.value} onChange={(e) => setSpec(i, { value: +e.target.value.replace(',', '.') || 0 })} />
                  </label>
                </>
              )}
              <label className="me-note">
                <span>Nota (solo para ti)</span>
                <input className="search" value={t.spec.note} onChange={(e) => setSpec(i, { note: e.target.value })} />
              </label>
              <Picker
                placeholder="Vídeo que explica el test (opcional)…"
                pool={videos.filter((x) => x.type !== 'clase')}
                onPick={(id) => setTest(i, { video: id })}
              />
            </div>
          </div>
        ))}
        <button
          className="btn ghost small"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => set({ tests: [...m.tests, { id: `${inj.slice(0, 2)}${f}${Math.random().toString(36).slice(2, 6)}`, name: 'Nuevo test', how: '', spec: { measure: 'reps', rule: 'lsi', value: 90, note: '' } }] })}
        >
          + Añadir test
        </button>
      </section>

      <section className="card">
        <span className="lbl">Hitos a lograr</span>
        <p className="muted me-hint">Los ve el paciente. Se copian a cada paciente nuevo con esta lesión; en su ficha los puedes ajustar.</p>
        {m.goals.map((g, i) => (
          <div key={i} className="me-goal">
            <input className="search" value={g} onChange={(e) => set({ goals: m.goals.map((x, j) => (j === i ? e.target.value : x)) })} />
            <button className="me-x" onClick={() => set({ goals: m.goals.filter((_, j) => j !== i) })} aria-label="Quitar hito">
              ×
            </button>
          </div>
        ))}
        <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => set({ goals: [...m.goals, ''] })}>
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
              <button className="me-x" onClick={() => set({ key: m.key.filter((x) => x !== id) })} aria-label="Quitar">
                ×
              </button>
            </span>
          ))}
        </div>
        <Picker placeholder="Añadir un ejercicio clave…" pool={videos.filter((x) => x.type !== 'clase' && x.type !== 'test' && !m.key.includes(x.id))} onPick={(id) => set({ key: [...m.key, id] })} />
      </section>

      <section className="card">
        <span className="lbl">Tu biblioteca en la fase {f}</span>
        <p className="muted me-hint">Cuántos vídeos tienes de cada tipo y zona en esta fase. Las casillas vacías te dicen qué grabar o qué etiquetar.</p>
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
    <div className="me-pick">
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
    </div>
  )
}
