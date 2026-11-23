import { useState } from 'react'
import { fDM, parseD } from '../../domain/dates'
import { currentPhase, painSeries, recovered, sessionsDone, streak, videoById, type Ctx } from '../../domain/logic'
import type { Patient } from '../../domain/model'
import { PHASES } from '../../domain/model'
import { achievements, bestStreak, improvements, trainingSeries, type TrainMetric } from '../../domain/progress'
import { BarChart, LineChart } from '../../ui/charts'
import { Medal } from '../../ui/Medal'
import { Sprite } from '../../ui/Sprite'

const TRAIN: [TrainMetric, string, string][] = [
  ['kg', 'Kilos movidos', 'kg'],
  ['min', 'Minutos', 'min'],
  ['pain', 'Dolor en la sesión', '/10'],
]

/** PROGRESO: cuánto has mejorado, tus gráficas, tus fases y tus logros. */
export function Progress({ c, p }: { c: Ctx; p: Patient }) {
  const [metric, setMetric] = useState<TrainMetric>('kg')
  const se = painSeries(p)
  const imp = improvements(p)
  const best = imp.filter((x) => x.lowGood && x.pct > 0).sort((a, b) => b.pct - a.pct)[0] || imp.find((x) => x.pct > 0)
  const ph = currentPhase(p)
  const rec = recovered(p)
  const goals = p.goals[ph] || []
  const ach = achievements(c, p)
  const got = ach.filter((a) => a.got).length
  const tr = TRAIN.find((x) => x[0] === metric)!
  const tests = Object.entries(p.recs).flatMap(([phx, r]) =>
    (r.tests || []).map((v) => ({ ph: +phx, v, st: (r.passed || {})[v] ? 'ok' : r.files.find((f) => f.id === v) ? 'rev' : 'pend' })),
  )

  return (
    <>
      <div className="h-top">
        <h1 className="h-hello">Tu progreso</h1>
      </div>

      {/* 1. La cifra que motiva */}
      {best ? (
        <section className="pg-hero">
          <span className="h-k">Tu mejoría desde que empezaste</span>
          <div className="pg-num">{best.pct}%</div>
          <p>
            {best.lowGood ? 'menos' : 'más'} {best.label.toLowerCase()}: de <b>{best.from}</b> a <b>{best.to}</b> sobre 10
          </p>
          <span className="pg-spr">
            <Sprite look={p.look} scale={2.4} />
          </span>
        </section>
      ) : (
        <section className="pg-flat">
          <span className="h-k2">Tu evolución</span>
          <p>Aquí verás lo mucho que mejoras. Aparece en cuanto rellenes tus dos primeros cuestionarios de los viernes.</p>
        </section>
      )}

      {/* 2. Números rápidos */}
      <div className="h-stats">
        <div className="fire">
          <b>🔥 {streak(c, p)}</b>
          <span>racha ahora · mejor {bestStreak(c, p)}</span>
        </div>
        <div>
          <b>✅ {sessionsDone(p)}</b>
          <span>sesiones hechas</span>
        </div>
        <div>
          <b>🏆 {got}</b>
          <span>logros de {ach.length}</span>
        </div>
      </div>

      {/* 3. Antes → ahora */}
      {imp.length > 0 && (
        <div className="pg-deltas">
          {imp.map((x) => (
            <div key={x.key} className={x.pct > 0 ? 'good' : x.pct < 0 ? 'bad' : ''}>
              <span>{x.label}</span>
              <b>
                <s>{x.from}</s> → {x.to}
              </b>
              <em>{x.pct > 0 ? `${x.pct}% mejor` : x.pct < 0 ? `${-x.pct}% peor` : 'igual'}</em>
            </div>
          ))}
        </div>
      )}

      {/* 4. Gráfica grande */}
      {se.length >= 2 && (
        <section className="pg-card">
          <span className="h-k2">Semana a semana</span>
          <h2 className="pg-h">Dolor y confianza</h2>
          <LineChart
            labels={se.map((x) => fDM(parseD(x.d)))}
            series={[
              { name: 'Dolor en ejercicios', color: 'var(--s-painex)', vals: se.map((x) => x.painEx) },
              { name: 'Dolor día a día', color: 'var(--s-painlife)', vals: se.map((x) => x.painLife), dash: true },
              { name: 'Confianza', color: 'var(--s-mind)', vals: se.map((x) => x.mind ?? 0) },
            ]}
          />
          <p className="pg-note">Lo ideal: las líneas de dolor bajan y la de confianza sube. Toca la gráfica para ver cada semana.</p>
        </section>
      )}

      {/* 5. Entrenamientos */}
      <section className="pg-card">
        <span className="h-k2">Tus entrenamientos</span>
        <h2 className="pg-h">{tr[1]} por sesión</h2>
        <div className="pg-chips">
          {TRAIN.map(([k, l]) => (
            <button key={k} className={metric === k ? 'on' : ''} onClick={() => setMetric(k)}>
              {l}
            </button>
          ))}
        </div>
        <BarChart data={trainingSeries(c, p, metric)} unit={tr[2]} color={metric === 'pain' ? 'var(--s-painex)' : 'var(--s-bar)'} />
      </section>

      {/* 6. Fases y medallas */}
      <section className="pg-card">
        <span className="h-k2">Tus fases</span>
        <h2 className="pg-h">{rec ? '¡5 de 5! Te has recuperado' : `Fase ${ph}: ${PHASES[ph - 1]}`}</h2>
        <div className="pg-medals">
          {PHASES.map((nm, i) => (
            <div key={nm} className={i < p.done ? 'on' : i === p.done && !rec ? 'cur' : ''}>
              <Medal n={i + 1} size={50} off={i >= p.done} />
              <small>{nm}</small>
              {i < p.done && p.phaseAt[i + 1] && <em>{fDM(parseD(p.phaseAt[i + 1]))}</em>}
            </div>
          ))}
        </div>
        {!rec && (
          <>
            <span className="pg-sub">
              Para ganar la medalla {ph} · {goals.filter((g) => g.ok).length}/{goals.length}
            </span>
            <ul className="pg-goals">
              {goals.map((g, i) => (
                <li key={i} className={g.ok ? 'ok' : ''}>
                  <span>{g.ok ? '✓' : ''}</span>
                  {g.t}
                </li>
              ))}
            </ul>
          </>
        )}
        {tests.length > 0 && (
          <>
            <span className="pg-sub">Tests</span>
            <ul className="pg-goals">
              {tests.map((x, i) => (
                <li key={i} className={x.st === 'ok' ? 'ok' : ''}>
                  <span>{x.st === 'ok' ? '✓' : x.st === 'rev' ? '…' : ''}</span>
                  {(videoById(c, x.v)?.title || '').replace('TEST: ', '')} · fase {x.ph}
                  <em>{x.st === 'ok' ? 'Superado' : x.st === 'rev' ? 'Jone lo está revisando' : 'Por grabar'}</em>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* 7. Logros */}
      <section className="pg-card">
        <span className="h-k2">Tus logros</span>
        <h2 className="pg-h">
          {got} de {ach.length} conseguidos
        </h2>
        <div className="pg-ach">
          {ach.map((a) => (
            <div key={a.id} className={a.got ? 'on' : ''} title={a.desc}>
              <span>{a.got ? a.icon : '🔒'}</span>
              <b>{a.title}</b>
              <small>{a.desc}</small>
            </div>
          ))}
        </div>
      </section>

      {p.objective && (
        <section className="pg-goal">
          <span className="h-k2">🏁 Tu meta</span>
          <p>{p.objective}</p>
        </section>
      )}
    </>
  )
}
