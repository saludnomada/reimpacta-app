import { useState } from 'react'
import { fDM, parseD, WD } from '../../domain/dates'
import { compliance, currentPhase, painOk, painSeries, recovered, streak, type Ctx } from '../../domain/logic'
import type { Patient } from '../../domain/model'
import { PHASES } from '../../domain/model'
import { bestStreak, improvements, muscleWork, totals, trainingDays, weeksGrid, type DayKind } from '../../domain/progress'
import { complianceTone, confidenceTone, painTone } from '../../domain/scales'
import { CONF_BANDS, PAIN_BANDS, TrendChart } from '../../ui/charts'
import { IcCheck, IcTarget } from '../../ui/icons'
import { PhaseReqs } from '../../ui/PhaseReqs'
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
const hours = (min: number) => (min >= 60 ? `${(Math.round((min / 60) * 10) / 10).toLocaleString('es-ES')} h` : `${min} min`)

/**
 * PROGRESO, en tono profesional:
 * resumen · antes → ahora · evolución por zonas · días de entreno · músculos ·
 * fases y lo que falta para pasar a la siguiente. Cada bloque con su (?) explicativo.
 */
export function Progress({ c, p }: { c: Ctx; p: Patient }) {
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

  return (
    <>
      <div className="h5-head">
        <h1 className="x-title">Tu progreso</h1>
        <p className="h5-sub">
          Semana {t.weeks} · {rec ? 'Recuperado/a' : `Fase ${ph} de 5`}
        </p>
      </div>

      {/* Resumen */}
      <section className="pg-card">
        <div className="pg-hrow">
          <h2 className="pg-h">Resumen</h2>
          <Info>
            Todo lo que llevas hecho desde que empezaste. El <b>cumplimiento</b> es el porcentaje de sesiones hechas de las que tenías
            programadas hasta hoy.
          </Info>
        </div>
        {lifeImp && lifeImp.pct > 0 && (
          <div className="pg-headline">
            <b>−{lifeImp.pct}%</b>
            <span>
              de dolor en tu día a día desde que empezaste ({lifeImp.from} → {lifeImp.to} sobre 10)
            </span>
          </div>
        )}
        <div className="pg-kpis">
          <div>
            <b>{t.sessions}</b>
            <span>sesiones</span>
          </div>
          <div>
            <b>{hours(t.minutes)}</b>
            <span>entrenando</span>
          </div>
          <div>
            <b className={comp[2] ? `kpi-t t-${complianceTone(comp[0])}` : ''}>{comp[2] ? comp[0] + '%' : '–'}</b>
            <span>cumplimiento</span>
          </div>
          <div>
            <b>{t.medals}/5</b>
            <span>fases</span>
          </div>
        </div>
      </section>

      {/* Antes → ahora */}
      {imp.length > 0 && (
        <section className="pg-card">
          <div className="pg-hrow">
            <h2 className="pg-h">Antes y ahora</h2>
            <Info>
              Tu primer cuestionario del viernes comparado con el último. Dolor y confianza van del 0 al 10. En el dolor, cuanto más bajo
              mejor; en la confianza, cuanto más alto mejor.
            </Info>
          </div>
          <div className="pg-deltas flat">
            {imp.map((x) => (
              <div key={x.key}>
                <span>{x.label}</span>
                <b>
                  <span className="pg-from">{x.from}</span>
                  <span className="arr">→</span>
                  <span className={`tchip t-${toneOf(x.key, x.to)}`}>
                    {x.to}
                    <small>/10</small>
                  </span>
                </b>
              </div>
            ))}
          </div>
        </section>
      )}

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

      {/* Fases y siguiente fase */}
      <section className="pg-card">
        <div className="pg-hrow">
          <h2 className="pg-h">Fases</h2>
          <Info>
            Tu recuperación tiene 5 fases. Pasas a la siguiente cuando cumples sus objetivos y superas sus tests. Los tests los grabas en
            vídeo y yo los reviso.
          </Info>
        </div>
        <ol className="pg-steps">
          {PHASES.map((nm, i) => {
            const st = i < p.done ? 'ok' : i === p.done && !rec ? 'cur' : ''
            return (
              <li key={nm} className={st}>
                <span className="n">{st === 'ok' ? <IcCheck /> : i + 1}</span>
                <small>{nm}</small>
                {st === 'ok' && p.phaseAt[i + 1] && <em>{fDM(parseD(p.phaseAt[i + 1]))}</em>}
              </li>
            )
          })}
        </ol>

        {!rec && <PhaseReqs c={c} p={p} />}
      </section>

      {p.objective && (
        <section className="pg-goal goal-ic">
          <i>
            <IcTarget />
          </i>
          <div>
            <span className="x-over">Tu meta</span>
            <p>{p.objective}</p>
          </div>
        </section>
      )}
    </>
  )
}
