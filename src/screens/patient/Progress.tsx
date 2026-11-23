import { useState } from 'react'
import { fDM, parseD, WD } from '../../domain/dates'
import { currentPhase, painSeries, recovered, sessionsDone, streak, videoById, type Ctx } from '../../domain/logic'
import type { Patient } from '../../domain/model'
import { PHASES } from '../../domain/model'
import { bestStreak, improvements, muscleWork, trainingDays, weeksGrid, type DayKind } from '../../domain/progress'
import { LineChart } from '../../ui/charts'
import { IcCheck, IcFlame } from '../../ui/icons'
import { Medal } from '../../ui/Medal'

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
  const se = painSeries(p)
  const imp = improvements(p)
  const best = imp.filter((x) => x.lowGood && x.pct > 0).sort((a, b) => b.pct - a.pct)[0] || imp.find((x) => x.pct > 0)
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

      {/* La cifra */}
      {best ? (
        <section className="pg-hero">
          <span className="h-k">Desde que empezaste</span>
          <div className="pg-num">{best.pct}%</div>
          <p>
            {best.lowGood ? 'menos' : 'más'} {best.label.toLowerCase()}
          </p>
        </section>
      ) : (
        <section className="pg-flat">
          <span className="h-k2">Tu evolución</span>
          <p>Aparece en cuanto rellenes tus dos primeros cuestionarios de los viernes.</p>
        </section>
      )}

      {/* Antes → ahora */}
      {imp.length > 0 && (
        <div className="pg-deltas">
          {imp.map((x) => (
            <div key={x.key} className={x.pct > 0 ? 'good' : x.pct < 0 ? 'bad' : ''}>
              <span>{x.label}</span>
              <b>
                <s>{x.from}</s>→ {x.to}
                <small>/10</small>
              </b>
            </div>
          ))}
        </div>
      )}

      {/* Dolor y confianza */}
      {se.length >= 2 && (
        <section className="pg-card">
          <h2 className="pg-h">Dolor y confianza</h2>
          <LineChart
            labels={se.map((x) => fDM(parseD(x.d)))}
            series={[
              { name: 'Dolor en ejercicios', color: 'var(--s-painex)', vals: se.map((x) => x.painEx) },
              { name: 'Dolor día a día', color: 'var(--s-painlife)', vals: se.map((x) => x.painLife), dash: true },
              { name: 'Confianza', color: 'var(--s-mind)', vals: se.map((x) => x.mind ?? 0) },
            ]}
          />
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
                <i key={cell.day} className={`${cell.state} ${cell.kind ? 'k-' + cell.kind : ''}`} title={`${fDM(parseD(cell.day))}`} />
              ))}
            </div>
          ))}
        </div>
        <p className="pg-note">Relleno = hecho · contorno = sin hacer · vacío = descanso</p>
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
