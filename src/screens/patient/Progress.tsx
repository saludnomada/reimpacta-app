import { useEffect, useState } from 'react'
import { addD, fDM, parseD, WD } from '../../domain/dates'
import { compliance, currentPhase, endOf, painOk, painSeries, recovered, routineFor, streak, type Ctx } from '../../domain/logic'
import type { Patient } from '../../domain/model'
import { bestStreak, improvements, muscleWork, totals, trainingDays, weeksGrid, type DayKind } from '../../domain/progress'
import { complianceTone, confidenceTone, painTone, toneVar } from '../../domain/scales'
import { CONF_BANDS, PAIN_BANDS, TrendChart } from '../../ui/charts'
import { BrandIcon } from '../../ui/BrandIcon'
import { PhasesAccordion } from '../../ui/PhaseReqs'
import { Ring } from '../../ui/Ring'
import { Info } from '../../ui/Info'
import { TaskIcon } from '../../ui/TaskIcon'

const METRICS: ['painEx' | 'painLife' | 'mind', string][] = [
  ['painLife', 'Dolor día a día'],
  ['painEx', 'Dolor en ejercicios'],
  ['mind', 'Confianza'],
]
const KINDS: [DayKind, string][] = [
  ['fuerza', 'Fuerza'],
  ['movilidad', 'Movilidad'],
  ['correr', 'Correr'],
]

/**
 * PROGRESO, en tono profesional:
 * resumen · antes → ahora · evolución por zonas · días de entreno · músculos ·
 * fases y lo que falta para pasar a la siguiente. Cada bloque con su (?) explicativo.
 */
export function Progress({ c, p }: { c: Ctx; p: Patient }) {
  // si vienen desde la tarjeta de fase de Hoy, bajar directamente a la fase
  useEffect(() => {
    if (location.hash === '#fase') setTimeout(() => document.getElementById('fase')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [])
  const [metric, setMetric] = useState<'painEx' | 'painLife' | 'mind'>('painLife')
  const comp = compliance(c, p)
  const thr = painOk(p)
  const toneOf = (k: string, v: number) => (k === 'mind' ? confidenceTone(v) : painTone(v, thr))
  const se = painSeries(p)
  const imp = improvements(p)
  const ph = currentPhase(p)
  const rec = recovered(p)
  const t = totals(c, p)
  const days = trainingDays(c, p)
  const grid = weeksGrid(c, p, 6)
  const mus = muscleWork(c, p, 28)
  const musMax = Math.max(1, ...mus.map((m) => m.sets))
  const lifeImp = imp.find((x) => x.key === 'painLife')
  // sesiones previstas en todo el programa (para el anillo de sesiones)
  const end = endOf(p)
  let planned = 0
  if (end) for (let d = parseD(p.start); d < end; d = addD(d, 1)) if (routineFor(c, p, d)) planned++

  return (
    <>
      <div className="h5-head">
        <h1 className="x-title">Tu progreso</h1>
        <p className="h5-sub">
          Semana {t.weeks} · {rec ? 'Recuperado/a' : `Fase ${ph} de 5`}
        </p>
      </div>

      {/* Bloque principal: la mejoría, con su curva */}
      <section className="pv-hero">
        <div className="pv-top">
          <span className="pv-k">{lifeImp && lifeImp.pct > 0 ? 'Desde que empezaste' : 'Tu evolución'}</span>
          <Info>
            Tus cuestionarios de los viernes: el primero comparado con el último. El dolor va del 0 al 10 (cuanto más bajo, mejor) y la
            confianza también (cuanto más alta, mejor).
          </Info>
        </div>
        {lifeImp && lifeImp.pct > 0 ? (
          <>
            <div className="pv-big">
              <b>−{lifeImp.pct}%</b>
              <span>de dolor en tu día a día</span>
            </div>
            <Spark vals={se.map((x) => x.painLife)} />
          </>
        ) : (
          <p className="pv-empty">Aparece en cuanto rellenes tus dos primeros cuestionarios de los viernes.</p>
        )}
        {imp.length > 0 && (
          <div className="pv-mini">
            {imp.map((x) => (
              <div key={x.key}>
                <small>{x.key === 'painEx' ? 'Dolor en ejercicios' : x.key === 'painLife' ? 'Dolor diario' : 'Confianza'}</small>
                <span>
                  <em>{x.from}</em>
                  <i>→</i>
                  <b className={`t-${toneOf(x.key, x.to)}`}>{x.to}</b>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cifras en anillos */}
      <section className="pv-rings">
        <div>
          <Ring value={comp[2] ? comp[0] / 100 : 0} size={78} stroke={8} color={comp[2] ? toneVar(complianceTone(comp[0])) : undefined}>
            <b>{comp[2] ? comp[0] + '%' : '–'}</b>
          </Ring>
          <span>Cumplimiento</span>
        </div>
        <div>
          <Ring value={planned ? Math.min(1, t.sessions / planned) : 0} size={78} stroke={8}>
            <b>{t.sessions}</b>
          </Ring>
          <span>{planned ? `de ${planned} sesiones` : 'Sesiones'}</span>
        </div>
        <div>
          <Ring value={t.medals / 5} size={78} stroke={8}>
            <b>{t.medals}/5</b>
          </Ring>
          <span>Fases</span>
        </div>
      </section>

      {/* Evolución */}
      {se.length >= 2 && (
        <section className="pg-card">
          <div className="pg-hrow">
            <h2 className="pg-h">Evolución semanal</h2>
            <Info>
              Cada punto es un viernes. El fondo marca las zonas: <b>verde</b> va bien, <b>amarillo</b> vigila, <b>coral</b> conviene bajar la
              carga y <b>rojo</b> es para parar y avisarme. Toca la gráfica para ver cada semana.
            </Info>
          </div>
          <div className="pg-chips">
            {METRICS.map(([k, l]) => (
              <button key={k} className={metric === k ? 'on' : ''} onClick={() => setMetric(k)}>
                {l}
              </button>
            ))}
          </div>
          <TrendChart
            labels={se.map((x) => fDM(parseD(x.d)))}
            vals={se.map((x) => (metric === 'mind' ? (x.mind ?? 0) : x[metric]))}
            tone={(v) => toneOf(metric, v)}
            bands={metric === 'mind' ? CONF_BANDS : PAIN_BANDS}
          />
        </section>
      )}

      {/* Días de entreno */}
      <section className="pg-card">
        <div className="pg-hrow">
          <h2 className="pg-h">Días de entreno</h2>
          <Info>
            Cuántos días has hecho de cada tipo y tus últimas semanas, de lunes a domingo. Relleno: hecho. Contorno: sin hacer. Punto:
            descanso. <b>Seguidas</b> son las sesiones que llevas sin fallar ninguna (los descansos no cuentan); tu mejor marca es{' '}
            {bestStreak(c, p)}.
          </Info>
        </div>
        <div className="pg-kinds">
          {KINDS.map(([k, l]) => (
            <div key={k}>
              <i className={`k-${k}`} />
              <b>{days[k]}</b>
              <span>{l}</span>
            </div>
          ))}
        </div>
        <div className="pg-grid">
          <div className="pg-grow head">
            <span />
            {WD.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          {grid.map((w) => (
            <div key={w.label} className="pg-grow">
              <span>{w.label}</span>
              {w.cells.map((cell) => (
                <i key={cell.day} className={`${cell.state} ${cell.kind ? 'k-' + cell.kind : ''}`} title={fDM(parseD(cell.day))}>
                  {cell.state === 'done' && cell.kind ? <TaskIcon k={cell.kind} /> : null}
                </i>
              ))}
            </div>
          ))}
        </div>
        {streak(c, p) > 0 && (
          <p className="pg-note">
            Llevas {streak(c, p)} {streak(c, p) === 1 ? 'sesión seguida' : 'sesiones seguidas'}
          </p>
        )}
      </section>

      {/* Músculos */}
      {mus.length > 0 && (
        <section className="pg-card">
          <div className="pg-hrow">
            <h2 className="pg-h">Músculos trabajados</h2>
            <Info>Número de series que has hecho en las últimas 4 semanas para cada grupo muscular, según los ejercicios de tu plan.</Info>
          </div>
          <div className="pg-bars">
            {mus.map((m) => (
              <div key={m.name}>
                <span>{m.name}</span>
                <i>
                  <em style={{ width: `${(m.sets / musMax) * 100}%` }} />
                </i>
                <b>{m.sets}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fases desplegables */}
      <section className="pg-card" id="fase">
        <div className="pg-hrow">
          <h2 className="pg-h">Tus fases</h2>
          <Info>
            Tu recuperación tiene 5 fases. Para superar cada una tienes que cumplir sus hitos y superar sus tests (los grabas en vídeo y yo los
            reviso). Toca una fase para ver todo lo que incluye. Verde: conseguido. Coral: pendiente.
          </Info>
        </div>
        <PhasesAccordion c={c} p={p} />
      </section>

      {p.objective && (
        <section className="pg-goal goal-ic">
          <BrandIcon k="meta" size={40} />
          <div>
            <span className="x-over">Tu meta</span>
            <p>{p.objective}</p>
          </div>
        </section>
      )}
    </>
  )
}

/** Curva pequeña (sparkline) para el bloque principal. */
function Spark({ vals }: { vals: number[] }) {
  if (vals.length < 2) return null
  const W = 300,
    H = 64,
    n = vals.length
  const x = (i: number) => 4 + ((W - 8) * i) / (n - 1)
  const y = (v: number) => 6 + (H - 12) * (1 - v / 10)
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')
  return (
    <svg className="pv-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d} L${x(n - 1)},${H} L${x(0)},${H} Z`} className="a" />
      <path d={d} className="l" />
      <circle cx={x(n - 1)} cy={y(vals[n - 1])} r="4.5" className="p" />
    </svg>
  )
}
