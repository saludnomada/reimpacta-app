import { useState } from 'react'
import { fDM, parseD, WD } from '../../domain/dates'
import { compliance, currentPhase, painOk, painSeries, recovered, sessionsDone, streak, videoById, type Ctx } from '../../domain/logic'
import type { Patient } from '../../domain/model'
import { PHASES } from '../../domain/model'
import { bestStreak, improvements, muscleWork, trainingDays, weeksGrid, type DayKind } from '../../domain/progress'
import { CONF_BANDS, PAIN_BANDS, TrendChart } from '../../ui/charts'
import { IcCheck, IcFlame } from '../../ui/icons'
import { Medal } from '../../ui/Medal'
import { Ring } from '../../ui/Ring'
import { Achieved } from '../../ui/Achieved'
import { TaskIcon } from '../../ui/TaskIcon'
import { complianceTone, confidenceTone, painTone, toneVar } from '../../domain/scales'

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
 * PROGRESO: lo justo y valioso, fácil de leer.
 * 1 cifra de mejoría · antes → ahora · gráfica de dolor y confianza ·
 * días de fuerza / movilidad / correr · músculos trabajados · fases y medallas.
 * Los detalles (objetivos, tests) se abren solo si los quieren ver.
 */
export function Progress({ c, p }: { c: Ctx; p: Patient }) {
  const [more, setMore] = useState(false)
  const [metric, setMetric] = useState<'painEx' | 'painLife' | 'mind'>('painLife')
  const comp = compliance(c, p)
  const thr = painOk(p)
  const toneOf = (k: string, v: number) => (k === 'mind' ? confidenceTone(v) : painTone(v, thr))
  const se = painSeries(p)
  const imp = improvements(p)
  const ph = currentPhase(p)
  const rec = recovered(p)
  const goals = p.goals[ph] || []
  const days = trainingDays(c, p)
  const grid = weeksGrid(c, p, 8)
  const mus = muscleWork(c, p, 28)
  const musMax = Math.max(1, ...mus.map((m) => m.sets))
  const tests = Object.entries(p.recs).flatMap(([phx, r]) =>
    (r.tests || []).map((v) => ({ ph: +phx, v, st: (r.passed || {})[v] ? 'ok' : r.files.find((f) => f.id === v) ? 'rev' : 'pend' })),
  )

  return (
    <>
      <div className="h-top">
        <h1 className="h-hello">Tu progreso</h1>
      </div>

      <Achieved c={c} p={p} />

      {/* Antes → ahora */}
      {imp.length > 0 && (
        <div className="pg-deltas">
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
      )}

      {/* Cumplimiento */}
      {comp[2] > 0 && (
        <section className="pg-comp">
          <Ring value={comp[0] / 100} size={74} stroke={8} color={toneVar(complianceTone(comp[0]))}>
            <b>{comp[0]}%</b>
          </Ring>
          <div>
            <h2 className="pg-h">Cumplimiento</h2>
            <p>
              {comp[1]} de {comp[2]} sesiones hechas
            </p>
          </div>
        </section>
      )}

      {/* Evolución: una métrica cada vez, con sus zonas de color */}
      {se.length >= 2 && (
        <section className="pg-card">
          <div className="pg-row">
            <h2 className="pg-h">Tu evolución</h2>
            {(() => {
              const x = imp.find((i) => i.key === metric)
              return x && x.pct !== 0 ? (
                <span className={`tchip ${x.pct > 0 ? 't-good' : 't-bad'}`}>
                  {x.pct > 0 ? 'Mejor' : 'Peor'} {Math.abs(x.pct)}%
                </span>
              ) : null
            })()}
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
          <p className="pg-note">{metric === 'mind' ? 'Lo ideal: que suba hacia la zona verde.' : 'Lo ideal: que baje hacia la zona verde. Toca la gráfica para ver cada semana.'}</p>
        </section>
      )}

      {/* Tus días */}
      <section className="pg-card">
        <div className="pg-row">
          <h2 className="pg-h">Tus días de entreno</h2>
          <span className="pg-streak" title={`Mejor racha: ${bestStreak(c, p)}`}>
            <IcFlame /> {streak(c, p)} {streak(c, p) === 1 ? 'seguida' : 'seguidas'}
          </span>
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
        <div className="pg-grid" role="img" aria-label={`Últimas ${grid.length} semanas: ${sessionsDone(p)} sesiones hechas en total`}>
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
                <i key={cell.day} className={`${cell.state} ${cell.kind ? 'k-' + cell.kind : ''}`} title={`${fDM(parseD(cell.day))}`}>
                  {cell.state === 'done' && cell.kind ? <TaskIcon k={cell.kind} /> : null}
                </i>
              ))}
            </div>
          ))}
        </div>
        <div className="pg-legend">
          <span><i className="done k-fuerza" /> Hecha</span>
          <span><i className="miss" /> Sin hacer</span>
          <span><i className="rest" /> Descanso</span>
        </div>
      </section>

      {/* Músculos */}
      {mus.length > 0 && (
        <section className="pg-card">
          <h2 className="pg-h">Músculos trabajados</h2>
          <span className="pg-cap">Series de las últimas 4 semanas</span>
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

      {/* Fases y medallas */}
      <section className="pg-card">
        <h2 className="pg-h">{rec ? 'Te has recuperado' : `Fase ${ph} · ${PHASES[ph - 1]}`}</h2>
        <div className="pg-medals">
          {PHASES.map((nm, i) => {
            const state = i < p.done ? 'on' : i === p.done && !rec ? 'cur' : 'off'
            return (
              <div key={nm} className={state}>
                <Medal n={i + 1} size={48} state={state} />
                <small>{nm}</small>
                {state === 'on' && p.phaseAt[i + 1] && <em>{fDM(parseD(p.phaseAt[i + 1]))}</em>}
              </div>
            )
          })}
        </div>
        {!rec && (
          <div className="pg-next">
            <span>Medalla {ph}</span>
            <span className="h-seg pg-seg" aria-hidden="true" style={{ ["--n" as string]: goals.length } as React.CSSProperties}>
              {goals.map((g, i) => (
                <i key={i} className={g.ok ? 'ok' : ''} />
              ))}
            </span>
            <b>
              {goals.filter((g) => g.ok).length}/{goals.length}
            </b>
          </div>
        )}
        <button className="pg-more" onClick={() => setMore(!more)} aria-expanded={more}>
          {more ? 'Ocultar detalles' : 'Ver objetivos y tests'}
        </button>
        {more && (
          <>
            {!rec && (
              <ul className="pg-goals">
                {goals.map((g, i) => (
                  <li key={i} className={g.ok ? 'ok' : ''}>
                    <span>{g.ok ? <IcCheck /> : null}</span>
                    {g.t}
                  </li>
                ))}
              </ul>
            )}
            {tests.length > 0 && (
              <ul className="pg-goals">
                {tests.map((x, i) => (
                  <li key={i} className={x.st === 'ok' ? 'ok' : ''}>
                    <span>{x.st === 'ok' ? <IcCheck /> : null}</span>
                    {(videoById(c, x.v)?.title || '').replace('TEST: ', '').toLowerCase()}
                    <em>{x.st === 'ok' ? 'Superado' : x.st === 'rev' ? 'En revisión' : 'Por grabar'}</em>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {p.objective && (
        <section className="pg-goal">
          <span className="h-k2">Tu meta</span>
          <p>{p.objective}</p>
        </section>
      )}
    </>
  )
}
