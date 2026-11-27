import { useEffect, useRef, useState } from 'react'
import { deleteLabRequest, labAdHoc, requestLab, saveLabMarks, setLabVideo } from '../../data/actions'
import { mode } from '../../data'
import { useCtx } from '../../data/store'
import { sendLabVideo, videoLink } from '../../data/videos'
import { fShort, isoD, parseD } from '../../domain/dates'
import { jumpHeight, LAB_TESTS, labKey, labTest, measureValue, pointLabel, pointsFor, SIDE_LABEL, sidesOf, CAMERA_LABEL, type LabTest, type Pt, type Side } from '../../domain/lab'
import { weekNo } from '../../domain/logic'
import type { LabMark, Patient } from '../../domain/model'
import { detect, toPoints } from '../../ui/pose'
import { norm } from './VideoLab'

const GROUPS = [...new Set(LAB_TESTS.map((t) => t.group))]

/** LABORATORIO (solo Jone): pedir tests en vídeo, analizarlos y comparar antes y después. */
export function Lab() {
  const c = useCtx()
  const pts = c.st.patients
  const [pid, setPid] = useState(pts[0]?.id || '')
  const [tab, setTab] = useState<'paciente' | 'catalogo'>('paciente')
  const p = pts.find((x) => x.id === pid)
  return (
    <div className="jl">
      <div className="jl-bar">
        <div className="row">
          <button className={`chip ${tab === 'paciente' ? 'on' : ''}`} onClick={() => setTab('paciente')}>
            Por paciente
          </button>
          <button className={`chip ${tab === 'catalogo' ? 'on' : ''}`} onClick={() => setTab('catalogo')}>
            Catálogo de tests
          </button>
        </div>
        {tab === 'paciente' && (
          <select className="search lab-sel" value={pid} onChange={(e) => setPid(e.target.value)}>
            {pts.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {tab === 'catalogo' ? <Catalog /> : p ? <PatientLab key={p.id} p={p} /> : <Explore />}
    </div>
  )
}

function PatientLab({ p }: { p: Patient }) {
  const c = useCtx()
  const [sel, setSel] = useState<string[]>([])
  const [label, setLabel] = useState(`Semana ${weekNo(c, p)}`)
  const [an, setAn] = useState<{ key: string; t: LabTest; side: Side; src?: string; noSave?: boolean } | null>(null)
  const reqs = (p.lab || []).slice().reverse()
  const toggle = (id: string) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id].sort((a, b) => labTest(a)!.n - labTest(b)!.n))

  return (
    <>
      <Explore p={p} onOpen={setAn} />
      {p.mediaOk && <p className="pill ok lab-media">{p.name} permite usar sus vídeos o resultados de forma anónima como caso de éxito</p>}

      <section className="card">
        <span className="lbl">Pedir tests a {p.name}</span>
        <div className="lab-pick">
          {GROUPS.map((g) => (
            <div key={g}>
              <small>{g}</small>
              <div className="row">
                {LAB_TESTS.filter((t) => t.group === g).map((t) => (
                  <button key={t.id} className={`chip lab-chip ${sel.includes(t.id) ? 'on' : ''}`} onClick={() => toggle(t.id)} title={t.how}>
                    <b>{t.n}</b> {t.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="row">
          <input className="search lab-lbl" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Nombre del pedido" />
          <button
            className="btn"
            disabled={!sel.length}
            onClick={() => {
              requestLab(p.id, label.trim() || 'Tests', sel, isoD(c.today))
              setSel([])
            }}
          >
            Pedir {sel.length ? `${sel.length} tests (${sel.map((id) => labTest(id)!.n).join(', ')})` : 'tests'}
          </button>
        </div>
        <p className="muted me-hint">Le saldrán en este orden en su app, con el vídeo de cómo se hace (lo eliges en Catálogo de tests).</p>
      </section>

      {reqs.map((r) => (
        <section key={r.id} className="card">
          <div className="ib-h">
            <span className="lbl">
              {r.label} · pedido el {fShort(parseD(r.at))}
            </span>
            <button className="btn ghost small" onClick={() => confirm('¿Borrar este pedido de tests?') && deleteLabRequest(p.id, r.id)}>
              Borrar
            </button>
          </div>
          <div className="lab-list">
            {r.tests.map((id) => {
              const t = labTest(id)
              if (!t) return null
              return (
                <div key={id} className="lab-row">
                  <span className="lab-n">{t.n}</span>
                  <span className="lab-name">
                    {t.name}
                    <small>{CAMERA_LABEL[t.camera]}</small>
                  </span>
                  <span className="lab-sides">
                    {sidesOf(t).map((s) => {
                      const k = labKey(r.id, id, s)
                      const f = p.labFiles?.[k]
                      const n = p.labMarks?.[k]?.length || 0
                      return (
                        <button key={s} className={`btn small ${f ? '' : 'ghost'}`} disabled={!f && mode === 'real'} onClick={() => setAn({ key: k, t, side: s })}>
                          {s === '-' ? '' : s === 'd' ? 'Dcha · ' : 'Izda · '}
                          {f ? (n ? `${n} medida${n > 1 ? 's' : ''}` : 'Analizar') : 'Sin vídeo'}
                        </button>
                      )
                    })}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {reqs.length > 1 && <Compare p={p} />}
      {an && <Analyzer p={p} k={an.key} t={an.t} side={an.side} src0={an.src} noSave={an.noSave} onClose={() => setAn(null)} />}
    </>
  )
}

/** Antes y después: la primera medida guardada de cada test en cada pedido */
function Compare({ p }: { p: Patient }) {
  const reqs = p.lab || []
  const rows: { name: string; vals: (number | null)[] }[] = []
  const tests = [...new Set(reqs.flatMap((r) => r.tests))]
  tests.forEach((id) => {
    const t = labTest(id)
    if (!t) return
    sidesOf(t).forEach((s) => {
      const names = [...new Set(reqs.flatMap((r) => Object.keys(p.labMarks?.[labKey(r.id, id, s)]?.[0]?.values || {})))]
      names.forEach((nm) =>
        rows.push({
          name: `${t.n}. ${t.name}${s === '-' ? '' : ` · ${s === 'd' ? 'dcha' : 'izda'}`} · ${nm}`,
          vals: reqs.map((r) => p.labMarks?.[labKey(r.id, id, s)]?.[0]?.values[nm] ?? null),
        }),
      )
    })
  })
  if (!rows.length) return null
  return (
    <section className="card">
      <span className="lbl">Antes y después</span>
      <div className="lab-cmp">
        <div className="lab-cmp-r head">
          <span />
          {reqs.map((r) => (
            <span key={r.id}>{r.label}</span>
          ))}
          <span>Cambio</span>
        </div>
        {rows.map((r) => {
          const v = r.vals.filter((x): x is number => x != null)
          const d = v.length > 1 ? v[v.length - 1] - v[0] : null
          return (
            <div key={r.name} className="lab-cmp-r">
              <span>{r.name}</span>
              {r.vals.map((x, i) => (
                <b key={i}>{x ?? '–'}</b>
              ))}
              <em>{d == null ? '' : `${d > 0 ? '+' : ''}${Math.round(d * 10) / 10}`}</em>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** ANALIZADOR: vídeo fotograma a fotograma, muñequito, puntos que se arrastran, ángulos y altura de salto. */
function Analyzer({ p, k, t, side: side0, src0, noSave, onClose }: { p?: Patient; k: string; t: LabTest; side: Side; src0?: string; noSave?: boolean; onClose: () => void }) {
  const f = p?.labFiles?.[k]
  const [src, setSrc] = useState<string | null>(src0 || null)
  const [err, setErr] = useState('')
  const [side, setSide] = useState<Side>(side0 === '-' ? 'd' : side0)
  const [pts, setPts] = useState<Record<string, Pt>>({})
  const [marks, setMarks] = useState<LabMark[]>(p?.labMarks?.[k] || [])
  const [ratio, setRatio] = useState(9 / 16)
  const [dims, setDims] = useState<[number, number]>([1, 1])
  const [fps, setFps] = useState(30)
  const [slow, setSlow] = useState(1)
  const [up, setUp] = useState<number | null>(null)
  const [down, setDown] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [time, setTime] = useState(0)
  const v = useRef<HTMLVideoElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<string | null>(null)

  useEffect(() => {
    if (!src0 && mode === 'real' && f?.path) videoLink(f.path).then(setSrc).catch(() => setErr('No he podido abrir el vídeo.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f?.path])

  const need = pointsFor(t, side)
  const values: Record<string, number> = {}
  t.measures.forEach((m) => {
    const x = measureValue(m, side, pts, dims[0], dims[1])
    if (x != null) values[m.name] = x
  })
  const flight = up != null && down != null && down > up ? down - up : null
  if (t.jump && flight) values['Altura de salto (cm)'] = jumpHeight(flight, slow)

  const auto = async () => {
    if (!v.current) return
    setBusy(true)
    try {
      const lm = await detect(v.current)
      if (!lm) setErr('No encuentro a la persona en este fotograma.')
      else {
        setErr('')
        const all = toPoints(lm)
        setPts(Object.fromEntries(need.filter((n) => all[n]).map((n) => [n, all[n]])))
      }
    } catch {
      setErr('No he podido cargar el muñequito en este navegador.')
    }
    setBusy(false)
  }
  const step = (n: number) => {
    if (!v.current) return
    v.current.pause()
    v.current.currentTime = Math.max(0, v.current.currentTime + n / fps)
  }
  const move = (e: React.PointerEvent) => {
    if (!drag.current || !box.current) return
    const r = box.current.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    setPts({ ...pts, [drag.current]: [x, y] })
  }
  const save = (list: LabMark[]) => {
    setMarks(list)
    if (p && !noSave) saveLabMarks(p.id, k, list)
  }
  const lines = t.measures.map((m) => m.pts.map((x) => x.replace('{s}', side === 'i' ? 'i' : 'd')))

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet an" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="ib-h">
          <span className="lbl">
            {p ? p.name : 'Vídeo suelto'} · {t.n}. {t.name}
            {side0 !== '-' && ` · ${SIDE_LABEL[side0]}`}
          </span>
          <button className="btn ghost small" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="an-grid">
          <div>
            {!src && (
              <div className="an-empty">
                <p className="muted">
                  {mode === 'real' ? (f ? 'Cargando el vídeo…' : 'Aún no hay vídeo.') : 'En la demostración no se guardan los vídeos de los pacientes. Prueba el analizador con un vídeo tuyo:'}
                </p>
                <label className="btn small">
                  Abrir un vídeo de mi ordenador
                  <input type="file" accept="video/*" hidden onChange={(e) => e.target.files?.[0] && setSrc(URL.createObjectURL(e.target.files[0]))} />
                </label>
              </div>
            )}
            {src && (
              <div
                ref={box}
                className="an-box"
                style={{ aspectRatio: String(ratio) }}
                onPointerMove={move}
                onPointerUp={() => (drag.current = null)}
                onPointerLeave={() => (drag.current = null)}
              >
                <video
                  ref={v}
                  src={src}
                  playsInline
                  muted
                  onLoadedMetadata={(e) => {
                    const el = e.currentTarget
                    setRatio(el.videoWidth / el.videoHeight || 9 / 16)
                    setDims([el.videoWidth || 1, el.videoHeight || 1])
                  }}
                  onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                />
                <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
                  {lines.map((l, i) => {
                    const P = l.map((x) => pts[x]).filter(Boolean)
                    if (P.length < 2) return null
                    return <polyline key={i} points={P.map((q) => `${q[0] * 1000},${q[1] * 1000}`).join(' ')} />
                  })}
                </svg>
                {need.map((n) =>
                  pts[n] ? (
                    <span
                      key={n}
                      className="an-pt"
                      style={{ left: `${pts[n][0] * 100}%`, top: `${pts[n][1] * 100}%` }}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        drag.current = n
                      }}
                      title={pointLabel(n)}
                    >
                      <i />
                      <em>{pointLabel(n)}</em>
                    </span>
                  ) : null,
                )}
              </div>
            )}
            {src && (
              <div className="an-ctl">
                <button className="btn ghost small" onClick={() => (v.current?.paused ? v.current.play() : v.current?.pause())}>
                  Play / pausa
                </button>
                <button className="btn ghost small" onClick={() => step(-1)}>
                  ◀ fotograma
                </button>
                <button className="btn ghost small" onClick={() => step(1)}>
                  fotograma ▶
                </button>
                <span className="muted">{time.toFixed(2)} s</span>
                <select className="search an-sm" value={fps} onChange={(e) => setFps(+e.target.value)} aria-label="Fotogramas por segundo">
                  {[30, 60, 120, 240].map((x) => (
                    <option key={x} value={x}>
                      {x} fps
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="an-side">
            {side0 === '-' && (
              <div className="seg2">
                {(['d', 'i'] as Side[]).map((s) => (
                  <button key={s} className={side === s ? 'on' : ''} onClick={() => setSide(s)}>
                    Pierna {s === 'd' ? 'derecha' : 'izquierda'}
                  </button>
                ))}
              </div>
            )}
            <button className="btn" disabled={!src || busy} onClick={auto}>
              {busy ? 'Buscando…' : 'Poner puntos en este fotograma'}
            </button>
            <p className="muted me-hint">Pausa en el momento que quieras medir, pon los puntos y arrástralos para corregirlos.</p>
            {err && <p className="np-err">{err}</p>}

            <div className="an-vals">
              {t.measures.map((m) => (
                <div key={m.name}>
                  <span>{m.name}</span>
                  <b>{values[m.name] != null ? `${values[m.name]}°` : '–'}</b>
                </div>
              ))}
              {t.jump && (
                <>
                  <div className="an-jump">
                    <button className="btn ghost small" disabled={!src} onClick={() => setUp(v.current?.currentTime ?? null)}>
                      Despegue {up != null ? `(${up.toFixed(3)} s)` : ''}
                    </button>
                    <button className="btn ghost small" disabled={!src} onClick={() => setDown(v.current?.currentTime ?? null)}>
                      Aterrizaje {down != null ? `(${down.toFixed(3)} s)` : ''}
                    </button>
                    <select className="search an-sm" value={slow} onChange={(e) => setSlow(+e.target.value)} aria-label="Cámara lenta">
                      <option value={1}>Velocidad normal</option>
                      <option value={4}>Cámara lenta ×4</option>
                      <option value={8}>Cámara lenta ×8</option>
                    </select>
                  </div>
                  <div>
                    <span>Altura de salto</span>
                    <b>{values['Altura de salto (cm)'] != null ? `${values['Altura de salto (cm)']} cm` : '–'}</b>
                  </div>
                </>
              )}
            </div>
            <button className="btn" disabled={!Object.keys(values).length} onClick={() => save([...marks, { t: time, side, pts, values }])}>
              Guardar medida
            </button>

            {marks.length > 0 && (
              <div className="an-marks">
                <span className="lbl">Medidas guardadas</span>
                {marks.map((m, i) => (
                  <div key={i} className="an-mark">
                    <button
                      className="linkbtn"
                      onClick={() => {
                        if (v.current) v.current.currentTime = m.t
                        setSide(m.side === '-' ? 'd' : m.side)
                        setPts(m.pts)
                      }}
                    >
                      {m.t.toFixed(2)} s
                    </button>
                    <span>
                      {Object.entries(m.values)
                        .map(([n, x]) => `${n}: ${x}${n.includes('cm') ? '' : '°'}`)
                        .join(' · ')}
                    </span>
                    <button className="me-x" onClick={() => save(marks.filter((_, j) => j !== i))} aria-label="Borrar medida">
                      ×
                    </button>
                  </div>
                ))}
                <p className="muted me-hint">
                  {noSave || !p ? 'Vídeo suelto: estas medidas no se guardan.' : 'La primera medida de cada vídeo es la que se usa en "Antes y después".'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Catálogo: el vídeo de demostración de cada test (lo ve el paciente antes de grabarse) */
function Catalog() {
  const c = useCtx()
  const [q, setQ] = useState<Record<string, string>>({})
  return (
    <section className="card">
      <span className="lbl">Catálogo de tests · vídeo de cómo se hace</span>
      <p className="muted me-hint">Busca en tu biblioteca el vídeo que explica cada test. Es lo que verá el paciente antes de grabarse.</p>
      {LAB_TESTS.map((t) => {
        const cur = c.st.labVideos?.[t.id] ? c.st.videos.find((x) => x.id === c.st.labVideos![t.id]) : undefined
        const w = norm(q[t.id] || '').split(/\s+/).filter(Boolean)
        const found = w.length ? c.st.videos.filter((x) => w.every((s) => norm([x.title, ...x.keywords].join(' ')).includes(s))).slice(0, 5) : []
        return (
          <div key={t.id} className="lab-cat">
            <span className="lab-n">{t.n}</span>
            <div>
              <b>{t.name}</b>
              <small className="muted">
                {t.group} · {CAMERA_LABEL[t.camera]}
              </small>
              {cur ? (
                <span className="lab-cur">
                  Vídeo: {cur.title}
                  <button className="me-x" onClick={() => setLabVideo(t.id, null)} aria-label="Quitar vídeo">
                    ×
                  </button>
                </span>
              ) : (
                <input className="search an-sm" placeholder="Buscar el vídeo de este test…" value={q[t.id] || ''} onChange={(e) => setQ({ ...q, [t.id]: e.target.value })} />
              )}
              {found.map((x) => (
                <button
                  key={x.id}
                  className="re-add"
                  onClick={() => {
                    setLabVideo(t.id, x.id)
                    setQ({ ...q, [t.id]: '' })
                  }}
                >
                  <span>{x.title}</span>
                  <b>+ Elegir</b>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}

/** Analizar un vídeo cuando quieras: grabarlo ahora o subirlo de la galería.
 *  Con paciente: se guarda en su ficha (pedido "En consulta" de hoy). Sin paciente: solo para probar. */
function Explore({ p, onOpen }: { p?: Patient; onOpen?: (a: { key: string; t: LabTest; side: Side; src?: string; noSave?: boolean }) => void }) {
  const c = useCtx()
  const [testId, setTestId] = useState(LAB_TESTS[0].id)
  const [side, setSide] = useState<Side>('d')
  const [save, setSave] = useState(!!p)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [loose, setLoose] = useState<{ t: LabTest; side: Side; src: string } | null>(null)
  const t = labTest(testId)!
  const sd: Side = t.sides ? side : '-'
  const open = async (file: File) => {
    setErr('')
    const src = URL.createObjectURL(file)
    if (!p || !save) {
      if (onOpen) onOpen({ key: 'suelto', t, side: sd, src, noSave: true })
      else setLoose({ t, side: sd, src })
      return
    }
    const req = labAdHoc(p.id, isoD(c.today), testId)
    const key = labKey(req, testId, sd)
    onOpen?.({ key, t, side: sd, src })
    setBusy(true)
    try {
      await sendLabVideo(p.id, key, file)
    } catch (e) {
      setErr((e as Error).message)
    }
    setBusy(false)
  }
  return (
    <section className="card lab-ex">
      <span className="lbl">Analizar un vídeo ahora</span>
      <div className="row">
        <select className="search an-sm lab-ex-sel" value={testId} onChange={(e) => setTestId(e.target.value)} aria-label="Test">
          {LAB_TESTS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.n}. {x.name}
            </option>
          ))}
        </select>
        {t.sides && (
          <div className="seg2">
            {(['d', 'i'] as Side[]).map((s) => (
              <button key={s} className={side === s ? 'on' : ''} onClick={() => setSide(s)}>
                {s === 'd' ? 'Derecha' : 'Izquierda'}
              </button>
            ))}
          </div>
        )}
        <label className={`btn small ${busy ? 'busy' : ''}`}>
          {busy ? 'Guardando el vídeo…' : 'Grabar o subir un vídeo'}
          <input type="file" accept="video/*" hidden onChange={(e) => e.target.files?.[0] && open(e.target.files[0]).finally(() => (e.target.value = ''))} />
        </label>
      </div>
      {p && (
        <label className="vl-chk">
          <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /> Guardar en la ficha de {p.name} (sale en "Antes y después")
        </label>
      )}
      <p className="muted me-hint">En el móvil te deja grabar en el momento o elegir de la galería. En el ordenador, elegir un archivo.</p>
      {err && <p className="np-err">{err}</p>}
      {loose && <Analyzer k="suelto" t={loose.t} side={loose.side} src0={loose.src} noSave onClose={() => setLoose(null)} />}
    </section>
  )
}
