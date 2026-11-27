import { useEffect, useRef, useState } from 'react'
import { deleteLabRequest, labAdHoc, requestLab, saveLabMarks, setLabVideo } from '../../data/actions'
import { mode } from '../../data'
import { useCtx } from '../../data/store'
import { sendLabVideo, videoLink } from '../../data/videos'
import { fShort, isoD, parseD } from '../../domain/dates'
import { jumpHeight, LAB_TESTS, labKey, labTest, measureValue, pointLabel, pointsFor, SIDE_LABEL, sidesOf, CAMERA_LABEL, type LabTest, type Measure, type Pt, type Side } from '../../domain/lab'
import { weekNo } from '../../domain/logic'
import type { LabMark, Patient } from '../../domain/model'
import { detect, prewarm, toPoints } from '../../ui/pose'
import { analyzeRun, countReps, requestFindings, runNote, type Frame, type RunResult } from '../../domain/labInsights'
import { IcPlay } from '../../ui/icons'
import { norm } from './VideoLab'

const GROUPS = [...new Set(LAB_TESTS.map((t) => t.group))]

/** LABORATORIO (solo Jone): pedir tests en vídeo, analizarlos y comparar antes y después. */
export function Lab() {
  const c = useCtx()
  const pts = c.st.patients
  const [pid, setPid] = useState(pts[0]?.id || '')
  const [tab, setTab] = useState<'paciente' | 'catalogo'>('paciente')
  const p = pts.find((x) => x.id === pid)
  useEffect(() => prewarm(), [])
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
          <Conclusions p={p} req={r} />
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

/** ANALIZADOR
 *  · Automático: al reproducir, los puntos siguen al cuerpo en cada fotograma y se ven los ángulos en vivo,
 *    con su mínimo y máximo (ideal para la carrera y los saltos).
 *  · Manual: pausas, pones los puntos y los arrastras tú. Siempre ángulos entre dos líneas.
 *  · Ángulo libre: dibujas tus propias dos líneas.  */
function Analyzer({ p, k, t, side: side0, src0, noSave, onClose }: { p?: Patient; k: string; t: LabTest; side: Side; src0?: string; noSave?: boolean; onClose: () => void }) {
  const f = p?.labFiles?.[k]
  const [src, setSrc] = useState<string | null>(src0 || null)
  const [err, setErr] = useState('')
  const [side, setSide] = useState<Side>(side0 === '-' ? 'd' : side0)
  const [pts, setPts] = useState<Record<string, Pt>>({})
  const [free, setFree] = useState(0) // nº de ángulos libres
  const [marks, setMarks] = useState<LabMark[]>(p?.labMarks?.[k] || [])
  const [ratio, setRatio] = useState(9 / 16)
  const [dims, setDims] = useState<[number, number]>([1, 1])
  const [dur, setDur] = useState(0)
  const [fps, setFps] = useState(30)
  const [rate, setRate] = useState(1)
  const [slow, setSlow] = useState(1)
  const [up, setUp] = useState<number | null>(null)
  const [down, setDown] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [time, setTime] = useState(0)
  const [paused, setPaused] = useState(true)
  const [auto, setAuto] = useState(false)
  const [range, setRange] = useState<Record<string, [number, number]>>({})
  const v = useRef<HTMLVideoElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<string | null>(null)
  const autoRef = useRef(false)
  autoRef.current = auto
  const frames = useRef<Frame[]>([])
  const series = useRef<number[]>([])
  const [reps, setReps] = useState('')
  const [autoReps, setAutoReps] = useState(0)
  const [run, setRun] = useState<RunResult | null>(null)
  const isRun = t.id.startsWith('car-')
  const repTest = ['hr1', 'hr2', 'dec1', 'dec2', 'sal-bajo1', 'sal-bajo2', 'cad-ff'].includes(t.id)

  useEffect(() => {
    prewarm()
    if (!src0 && mode === 'real' && f?.path) videoLink(f.path).then(setSrc).catch(() => setErr('No he podido abrir el vídeo.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f?.path])

  const need = pointsFor(t, side)
  const freeKeys = [...Array(free)].flatMap((_, i) => ['a', 'b', 'c', 'd'].map((x) => `libre${i + 1}_${x}`))
  const measures: Measure[] = [
    ...t.measures,
    ...[...Array(free)].map((_, i) => ({ name: `Ángulo libre ${i + 1}`, kind: 'lines' as const, pts: ['a', 'b', 'c', 'd'].map((x) => `libre${i + 1}_${x}`) })),
  ]
  const calc = (P: Record<string, Pt>) => {
    const out: Record<string, number> = {}
    measures.forEach((m) => {
      const x = measureValue(m, side, P, dims[0], dims[1])
      if (x != null) out[m.name] = x
    })
    return out
  }
  const values = calc(pts)
  const flight = up != null && down != null && down > up ? down - up : null
  if (t.jump && flight) values['Altura de salto (cm)'] = jumpHeight(flight, slow)

  // automático: en cada fotograma, colocar los puntos y guardar el mínimo y el máximo de cada ángulo
  useEffect(() => {
    if (!auto || !v.current) return
    const el = v.current as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }
    let stop = false
    let busyF = false
    const tick = async () => {
      if (stop || !autoRef.current) return
      if (!busyF && el.readyState >= 2) {
        busyF = true
        try {
          const lm = await detect(el)
          if (lm) {
            const lastT = frames.current[frames.current.length - 1]?.t
            if (lastT == null || el.currentTime > lastT) frames.current.push({ t: el.currentTime, lm: lm.map((q) => ({ x: q.x, y: q.y })) })
            const P = { ...toPoints(lm, need) }
            setPts((old) => ({ ...Object.fromEntries(Object.entries(old).filter(([kk]) => kk.startsWith('libre'))), ...P }))
            const vals = calc(P)
            const first = vals[t.measures[0]?.name]
            if (first != null) {
              series.current.push(first)
              setAutoReps(countReps(series.current))
            }
            setRange((r) => {
              const n = { ...r }
              Object.entries(vals).forEach(([nm, x]) => (n[nm] = n[nm] ? [Math.min(n[nm][0], x), Math.max(n[nm][1], x)] : [x, x]))
              return n
            })
          }
        } catch {
          setErr('No he podido cargar el muñequito en este navegador.')
        }
        busyF = false
      }
      if (el.requestVideoFrameCallback && !el.paused) el.requestVideoFrameCallback(() => void tick())
      else requestAnimationFrame(() => void tick())
    }
    void tick()
    return () => {
      stop = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, side, src, dims[0]])

  const placeHere = async () => {
    if (!v.current) return
    setBusy(true)
    try {
      const lm = await detect(v.current)
      if (!lm) setErr('No encuentro a la persona en este fotograma.')
      else {
        setErr('')
        setPts((old) => ({ ...Object.fromEntries(Object.entries(old).filter(([kk]) => kk.startsWith('libre'))), ...toPoints(lm, need) }))
      }
    } catch {
      setErr('No he podido cargar el muñequito en este navegador.')
    }
    setBusy(false)
  }
  const play = () => {
    const el = v.current
    if (!el) return
    if (el.paused) void el.play()
    else el.pause()
  }
  const step = (n: number) => {
    if (!v.current) return
    v.current.pause()
    v.current.currentTime = Math.max(0, Math.min(dur || 1e9, v.current.currentTime + n / fps))
  }
  const addFree = () => {
    const i = free + 1
    setFree(i)
    setAuto(false)
    setPts({ ...pts, [`libre${i}_a`]: [0.35, 0.3], [`libre${i}_b`]: [0.35, 0.6], [`libre${i}_c`]: [0.45, 0.45], [`libre${i}_d`]: [0.75, 0.45] })
  }
  const move = (e: React.PointerEvent) => {
    if (!drag.current || !box.current) return
    const r = box.current.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    setPts((o) => ({ ...o, [drag.current!]: [x, y] }))
  }
  const save = (list: LabMark[]) => {
    setMarks(list)
    if (p && !noSave) saveLabMarks(p.id, k, list)
  }
  const sd = side === 'i' ? 'i' : 'd'
  const lines = [
    ...t.measures.flatMap((m) => {
      const P = m.pts.map((x) => x.replace('{s}', sd))
      return m.kind === 'angle' ? [[P[0], P[1]], [P[1], P[2]]] : m.kind === 'lines' ? [[P[0], P[1]], [P[2], P[3]]] : [[P[0], P[1]]]
    }),
    ...[...Array(free)].flatMap((_, i) => [[`libre${i + 1}_a`, `libre${i + 1}_b`], [`libre${i + 1}_c`, `libre${i + 1}_d`]]),
  ]
  const shown = [...need, ...freeKeys]
  const fmtV = (n: string, x: number) => `${x}${n.includes('cm') ? ' cm' : /Repeticiones|Cadencia|Apoyos/.test(n) ? '' : '°'}`

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="sheet an"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return
          if (e.key === ' ') (e.preventDefault(), play())
          if (e.key === 'ArrowRight') (e.preventDefault(), step(1))
          if (e.key === 'ArrowLeft') (e.preventDefault(), step(-1))
        }}
      >
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
                  {mode === 'real' ? (f ? 'Cargando el vídeo…' : 'Aún no hay vídeo.') : 'En la demostración no se guardan los vídeos de los pacientes. Prueba con un vídeo tuyo:'}
                </p>
                <label className="btn small">
                  Grabar o subir un vídeo
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
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('.an-pt')) return
                  play()
                }}
              >
                <video
                  ref={v}
                  src={src}
                  playsInline
                  muted
                  preload="auto"
                  onLoadedMetadata={(e) => {
                    const el = e.currentTarget
                    setRatio(el.videoWidth / el.videoHeight || 9 / 16)
                    setDims([el.videoWidth || 1, el.videoHeight || 1])
                    setDur(el.duration || 0)
                    el.playbackRate = rate
                  }}
                  onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                  onPlay={() => setPaused(false)}
                  onPause={() => setPaused(true)}
                />
                <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
                  {lines.map(([a, b], i) =>
                    pts[a] && pts[b] ? (
                      <line key={i} className={a.startsWith('libre') ? 'free' : ''} x1={pts[a][0] * 1000} y1={pts[a][1] * 1000} x2={pts[b][0] * 1000} y2={pts[b][1] * 1000} />
                    ) : null,
                  )}
                </svg>
                {shown.map((n) =>
                  pts[n] ? (
                    <span
                      key={n}
                      className={`an-pt ${n.startsWith('libre') ? 'free' : ''}`}
                      style={{ left: `${pts[n][0] * 100}%`, top: `${pts[n][1] * 100}%` }}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (auto) setAuto(false)
                        v.current?.pause()
                        drag.current = n
                      }}
                      title={pointLabel(n)}
                    >
                      <i />
                      <em>{pointLabel(n)}</em>
                    </span>
                  ) : null,
                )}
                {paused && (
                  <span className="an-bigplay" aria-hidden="true">
                    <IcPlay />
                  </span>
                )}
              </div>
            )}
            {src && (
              <>
                <input
                  className="an-scrub"
                  type="range"
                  min={0}
                  max={dur || 1}
                  step={1 / fps}
                  value={time}
                  onChange={(e) => {
                    if (v.current) v.current.currentTime = +e.target.value
                  }}
                  aria-label="Posición del vídeo"
                />
                <div className="an-ctl">
                  <button className="btn small an-play" onClick={play}>
                    {paused ? 'Play' : 'Pausa'}
                  </button>
                  <button className="btn ghost small" onClick={() => step(-1)} aria-label="Fotograma anterior">
                    ◀
                  </button>
                  <button className="btn ghost small" onClick={() => step(1)} aria-label="Fotograma siguiente">
                    ▶
                  </button>
                  <span className="muted">{time.toFixed(2)} s</span>
                  <div className="seg2 an-rate">
                    {[0.25, 0.5, 1].map((r) => (
                      <button
                        key={r}
                        className={rate === r ? 'on' : ''}
                        onClick={() => {
                          setRate(r)
                          if (v.current) v.current.playbackRate = r
                        }}
                      >
                        {r === 1 ? '×1' : r === 0.5 ? '×½' : '×¼'}
                      </button>
                    ))}
                  </div>
                  <select className="search an-sm" value={fps} onChange={(e) => setFps(+e.target.value)} aria-label="Fotogramas por segundo del vídeo">
                    {[30, 60, 120, 240].map((x) => (
                      <option key={x} value={x}>
                        {x} fps
                      </option>
                    ))}
                  </select>
                </div>
                <p className="muted me-hint">Toca el vídeo para play/pausa. En el ordenador: barra espaciadora, y flechas para ir fotograma a fotograma.</p>
              </>
            )}
          </div>

          <div className="an-side">
            <div className="seg2 an-mode">
              <button
                className={auto ? 'on' : ''}
                onClick={() => {
                  frames.current = []
                  series.current = []
                  setAutoReps(0)
                  setRun(null)
                  setAuto(true)
                  setRange({})
                  if (isRun && v.current) {
                    v.current.playbackRate = 0.25
                    setRate(0.25)
                    v.current.currentTime = 0
                  }
                }}
                disabled={!src}
              >
                Automático
              </button>
              <button className={!auto ? 'on' : ''} onClick={() => setAuto(false)}>
                Manual
              </button>
            </div>
            <p className="muted me-hint">
              {auto
                ? 'Dale a Play: los puntos siguen el movimiento y verás los ángulos en vivo, con su mínimo y su máximo. Ideal para la carrera.'
                : 'Pausa donde quieras medir, pon los puntos y arrástralos para corregirlos.'}
            </p>
            {side0 === '-' && (
              <div className="seg2">
                {(['d', 'i'] as Side[]).map((s) => (
                  <button key={s} className={side === s ? 'on' : ''} onClick={() => (setSide(s), setRange({}))}>
                    Pierna {s === 'd' ? 'derecha' : 'izquierda'}
                  </button>
                ))}
              </div>
            )}
            {!auto && (
              <div className="row">
                <button className="btn" disabled={!src || busy} onClick={placeHere}>
                  {busy ? 'Buscando…' : 'Poner puntos aquí'}
                </button>
                <button className="btn ghost" disabled={!src} onClick={addFree}>
                  + Ángulo libre
                </button>
              </div>
            )}
            {err && <p className="np-err">{err}</p>}

            <div className="an-vals">
              {measures.map((m) => (
                <div key={m.name}>
                  <span>
                    {m.name}
                    {auto && range[m.name] && (
                      <small>
                        mín {range[m.name][0]}° · máx {range[m.name][1]}°
                      </small>
                    )}
                  </span>
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
            {repTest && (
              <div className="an-reps">
                <label>
                  <span>Repeticiones</span>
                  <input className="search an-sm" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value.replace(/\D/g, ''))} />
                </label>
                {autoReps > 0 && (
                  <button className="btn ghost small" onClick={() => setReps(String(autoReps))}>
                    Contadas solas: {autoReps} · usar
                  </button>
                )}
                <small className="muted">En Automático las cuento al reproducir el vídeo entero. Revísalas siempre.</small>
              </div>
            )}

            {isRun && (
              <div className="an-run">
                <span className="lbl">Análisis de carrera</span>
                <p className="muted me-hint">
                  1) Si es cámara lenta, indícalo aquí. 2) Pon <b>Automático</b> y reproduce el vídeo entero (mejor a ×¼). 3) Pulsa Analizar.
                </p>
                <div className="row">
                  <select className="search an-sm" value={slow} onChange={(e) => setSlow(+e.target.value)} aria-label="Cámara lenta">
                    <option value={1}>Velocidad normal</option>
                    <option value={4}>Cámara lenta ×4 (120 fps)</option>
                    <option value={8}>Cámara lenta ×8 (240 fps)</option>
                  </select>
                  <button className="btn small" disabled={frames.current.length < 8} onClick={() => setRun(analyzeRun(frames.current, t.camera === 'detras' ? 'detras' : 'lado', slow, dims[0], dims[1]))}>
                    Analizar carrera ({frames.current.length} fotogramas)
                  </button>
                </div>
                {run && run.contacts === 0 && run.cadence == null && null}
                {run && (
                  <>
                    <ul className="lab-find">
                      {run.findings.map((x, i) => (
                        <li key={i} className={x.level}>
                          <b>{x.title}</b>
                          <span>{x.text}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      className="btn small"
                      onClick={() =>
                        save([
                          ...marks,
                          {
                            t: time,
                            side,
                            pts,
                            values: Object.fromEntries(
                              (
                                [
                                  ['Cadencia (pasos/min)', run.cadence],
                                  ['Tibia al apoyar', run.shank],
                                  ['Ángulo del pie al apoyar', run.foot],
                                  ['Tronco', run.trunk],
                                  ['Apoyos que cruzan', run.crossover],
                                  ['Caída de pelvis', run.pelvicDrop],
                                ] as [string, number | null][]
                              ).filter(([, x]) => x != null) as [string, number][],
                            ),
                            note: runNote(run),
                          },
                        ])
                      }
                    >
                      Guardar análisis de carrera
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="row">
              <button
                className="btn"
                disabled={!Object.keys(values).length && !reps}
                onClick={() => save([...marks, { t: time, side, pts, values: { ...values, ...(reps ? { Repeticiones: +reps } : {}) } }])}
              >
                Guardar este fotograma
              </button>
              {auto && Object.keys(range).length > 0 && (
                <button
                  className="btn ghost"
                  onClick={() =>
                    save([
                      ...marks,
                      {
                        t: time,
                        side,
                        pts,
                        values: Object.fromEntries(Object.entries(range).flatMap(([n, [a, b]]) => [[`${n} (mín)`, a], [`${n} (máx)`, b]])),
                        note: 'Mínimo y máximo durante el vídeo',
                      },
                    ])
                  }
                >
                  Guardar mín y máx
                </button>
              )}
            </div>

            {marks.length > 0 && (
              <div className="an-marks">
                <span className="lbl">Medidas guardadas</span>
                {marks.map((m, i) => (
                  <div key={i} className="an-mark">
                    <button
                      className="linkbtn"
                      onClick={() => {
                        setAuto(false)
                        if (v.current) v.current.currentTime = m.t
                        setSide(m.side === '-' ? 'd' : m.side)
                        setPts(m.pts)
                      }}
                    >
                      {m.t.toFixed(2)} s
                    </button>
                    <span>
                      {m.note && <b>{m.note}: </b>}
                      {Object.entries(m.values)
                        .map(([n, x]) => `${n}: ${fmtV(n, x)}`)
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

/** CONCLUSIONES de un pedido: asimetrías, % entre piernas para pasar de fase y análisis de carrera */
function Conclusions({ p, req }: { p: Patient; req: { id: string; label: string; at: string; tests: string[] } }) {
  const f = requestFindings(p, req)
  if (!f.length) return null
  return (
    <div className="lab-concl">
      <span className="lbl">Conclusiones</span>
      <ul className="lab-find">
        {f.map((x, i) => (
          <li key={i} className={x.level}>
            <b>{x.title}</b>
            <span>{x.text}</span>
          </li>
        ))}
      </ul>
      <p className="muted me-hint">Propuesta automática con umbrales iniciales. Tú decides.</p>
    </div>
  )
}
