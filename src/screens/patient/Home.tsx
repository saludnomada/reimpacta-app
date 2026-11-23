import { useNavigate } from 'react-router-dom'
import { diffDays, fLong, monday, parseD } from '../../domain/dates'
import { currentPhase, endOf, recovered, routineFor, streak, videoById, weekNo, type Ctx } from '../../domain/logic'
import type { Patient, Routine } from '../../domain/model'
import { PHASES } from '../../domain/model'
import { lastWeekSummary, todayItems, type TodoItem } from '../../domain/patientHome'
import { IcFlame } from '../../ui/icons'
import { MEDAL } from '../../ui/Medal'
import { Sprite } from '../../ui/Sprite'
import { TaskIcon } from '../../ui/TaskIcon'
import { ytId } from '../../ui/VideoBox'
import { goPath } from './goPath'
import { InstallBanner } from './InstallGuide'

/**
 * HOY: "Hoy tienes X tareas" en forma de lista. Al grano.
 * La sesión de hoy en lima grande · lo pendiente en coral · lo hecho tachado ·
 * abajo la fase con el corredor/a y su meta. Lo no hecho no se acumula.
 */
export function Home({ c, p }: { c: Ctx; p: Patient }) {
  const nav = useNavigate()
  const items = todayItems(c, p)
  const pend = items.filter((x) => !x.done).length
  const end = endOf(p)
  const rec = recovered(p)
  const totalWeeks = end && !rec ? Math.round(diffDays(monday(parseD(p.start)), end) / 7) : null
  const first = items[0]
  const main = first && first.go.to === 'session' && (first.main || first.done) ? first : undefined
  const rest = items.filter((x) => x !== main)
  const st = streak(c, p)
  const sum = lastWeekSummary(c, p)

  return (
    <>
      <div className="h-top">
        <div className="h-line">
          <span className="h-date">
            {fLong(c.today)} · semana {weekNo(c, p)}
            {totalWeeks ? ` de ${totalWeeks}` : ''}
          </span>
          {st > 0 && (
            <span className="h-streak" aria-label={`${st} sesiones seguidas`}>
              <IcFlame /> {st}
            </span>
          )}
        </div>
        <h1 className="h-hello">Hola, {p.name}</h1>
      </div>

      {sum && (
        <button className="h-week" onClick={() => nav('/progreso')}>
          <span className="h-k2">Tu semana pasada</span>
          <b>
            {sum.done} de {sum.total} sesiones
          </b>
          <span className="h-wbar" aria-hidden="true">
            <i style={{ width: `${(sum.done / sum.total) * 100}%` }} />
          </span>
          <small>{sum.done === sum.total ? 'Semana completa. Así se hace.' : 'Semana nueva, empezamos de cero.'}</small>
        </button>
      )}

      <h2 className="h-count">{pend ? `Hoy tienes ${pend} ${pend === 1 ? 'tarea' : 'tareas'}` : items.length ? 'Hoy lo tienes todo hecho' : 'Hoy es día libre'}</h2>

      {main && <SessionHero x={main} r={routineFor(c, p, c.today)} c={c} onClick={() => nav(goPath(main.go))} />}

      {rest.length > 0 && (
        <ul className="h-list">
          {rest.map((x, i) => (
            <li key={i}>
              <button className={`h-row ${x.done ? 'done' : x.co ? 'co' : ''}`} onClick={() => nav(goPath(x.go))}>
                <span className="h-ic" aria-hidden="true">
                  {x.done ? '✓' : <TaskIcon k={x.icon} />}
                </span>
                <span className="h-tx">
                  <b>{x.title}</b>
                  <small>{x.sub}</small>
                </span>
                <span className="h-go">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <PhaseCard p={p} />
      <InstallBanner />
    </>
  )
}

/** La sesión de hoy en grande, con la imagen de cada ejercicio. */
function SessionHero({ x, r, c, onClick }: { x: TodoItem; r: Routine | null; c: Ctx; onClick: () => void }) {
  const thumbs = (r?.items || []).slice(0, 4)
  const more = (r?.items.length || 0) - thumbs.length
  return (
    <button className={`h-hero ${x.done ? 'done' : ''}`} onClick={onClick}>
      <span className="h-k">{x.done ? 'Hecha hoy' : 'Hoy toca'}</span>
      <b className="h-t">{x.title}</b>
      <span className="h-s">{x.sub}</span>
      {thumbs.length > 0 && (
        <span className="h-thumbs" aria-hidden="true">
          {thumbs.map((it, i) => {
            if (it.kind === 'caco')
              return (
                <span key={i} className="h-th ph">
                  <TaskIcon k="correr" />
                </span>
              )
            const v = videoById(c, it.v)
            const id = ytId(v?.url)
            return id ? (
              <span key={i} className="h-th" style={{ backgroundImage: `url(https://i.ytimg.com/vi/${id}/mqdefault.jpg)` }} />
            ) : (
              <span key={i} className="h-th ph">
                <small>{(v?.title || '').split(' ').slice(0, 2).join(' ').toLowerCase()}</small>
              </span>
            )
          })}
          {more > 0 && <span className="h-th more">+{more}</span>}
        </span>
      )}
      {!x.done && <span className="h-cta">Empezar</span>}
    </button>
  )
}

/** La fase: corredor/a con su punto de dolor, 5 tramos y su meta. */
function PhaseCard({ p }: { p: Patient }) {
  const nav = useNavigate()
  const ph = currentPhase(p)
  const rec = recovered(p)
  const goals = p.goals[ph] || []
  const ok = goals.filter((g) => g.ok).length
  return (
    <button className="h-phase" onClick={() => nav('/progreso')}>
      <span className="h-runner">
        <Sprite look={p.look} zone={rec ? null : p.zone} scale={2.6} />
      </span>
      <span className="h-ph">
        <span className="h-k2">{rec ? '5 de 5 fases' : `Fase ${ph} de 5`}</span>
        <b>{rec ? 'Te has recuperado' : PHASES[ph - 1]}</b>
        <span className="h-seg" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((f) => (
            <i
              key={f}
              className={f <= p.done ? 'ok' : f === ph && !rec ? 'cur' : ''}
              style={
                f <= p.done
                  ? { background: MEDAL[f].fill }
                  : f === ph && !rec
                    ? ({ '--fill': `${goals.length ? (ok / goals.length) * 100 : 0}%` } as React.CSSProperties)
                    : undefined
              }
            />
          ))}
        </span>
        {!rec && (
          <small>
            {ok} de {goals.length} objetivos para la medalla
          </small>
        )}
        {p.objective && <span className="h-goal">{p.objective}</span>}
      </span>
    </button>
  )
}
