import { useNavigate } from 'react-router-dom'
import { diffDays, fLong, monday, parseD } from '../../domain/dates'
import { compliance, currentPhase, endOf, recovered, weekNo, type Ctx } from '../../domain/logic'
import type { Patient } from '../../domain/model'
import { PHASES } from '../../domain/model'
import { todayItems, type TodoItem } from '../../domain/patientHome'
import { MEDAL_MAIN } from '../../ui/RaceTrack'
import { Sprite } from '../../ui/Sprite'
import { goPath } from './goPath'
import { InstallBanner } from './InstallGuide'

/**
 * HOY: "Hoy tienes X tareas" en forma de lista.
 * La sesión de hoy en lima grande · lo pendiente en coral · lo hecho tachado con ✓ ·
 * abajo la fase con el corredor/a y su meta.
 */
export function Home({ c, p }: { c: Ctx; p: Patient }) {
  const nav = useNavigate()
  const items = todayItems(c, p)
  const pend = items.filter((x) => !x.done).length
  const [pct, , sch] = compliance(c, p)
  const end = endOf(p)
  const rec = recovered(p)
  const totalWeeks = end && !rec ? Math.round(diffDays(monday(parseD(p.start)), end) / 7) : null
  // la sesión de hoy (si la hay) siempre va la primera de la lista
  const first = items[0]
  const main = first && first.go.to === 'session' && (first.main || first.done) ? first : undefined
  const rest = items.filter((x) => x !== main)

  return (
    <>
      <div className="h-top">
        <span className="h-date">
          {fLong(c.today)} · semana {weekNo(c, p)}
          {totalWeeks ? ` de ${totalWeeks}` : ''}
        </span>
        <h1 className="h-hello">Hola, {p.name}</h1>
        <p className="h-count">
          <span>
          {pend ? (
            <>
              Hoy tienes <b>{pend} {pend === 1 ? 'tarea' : 'tareas'}</b>
            </>
          ) : items.length ? (
            <>
              <b>¡Hoy lo tienes todo hecho!</b> 🎉
            </>
          ) : (
            <>
              <b>Hoy es día libre.</b> Muévete a tu ritmo y disfruta.
            </>
          )}
          </span>
          {sch > 0 && <span className="h-pct">{pct}% cumplido</span>}
        </p>
      </div>

      {main && <SessionHero x={main} onClick={() => nav(goPath(main.go))} />}

      {rest.length > 0 && (
        <ul className="h-list">
          {rest.map((x, i) => (
            <li key={i}>
              <button className={`h-row ${x.done ? 'done' : x.co ? 'co' : ''}`} onClick={() => nav(goPath(x.go))}>
                <span className="h-tick">{x.done ? '✓' : ''}</span>
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

      <InstallBanner />
      <PhaseCard c={c} p={p} />
    </>
  )
}

function SessionHero({ x, onClick }: { x: TodoItem; onClick: () => void }) {
  if (x.done)
    return (
      <button className="h-hero done" onClick={onClick}>
        <span className="h-k">✓ Sesión de hoy hecha</span>
        <b className="h-t">{x.title}</b>
        <span className="h-s">{x.sub}</span>
      </button>
    )
  return (
    <button className="h-hero" onClick={onClick}>
      <span className="h-k">Hoy toca</span>
      <b className="h-t">{x.title}</b>
      <span className="h-s">{x.sub}</span>
      <span className="h-cta">▶ Empezar</span>
    </button>
  )
}

/** La fase: corredor/a con su punto de dolor, 5 tramos y su meta. */
function PhaseCard({ c, p }: { c: Ctx; p: Patient }) {
  const nav = useNavigate()
  const ph = currentPhase(p)
  const rec = recovered(p)
  const goals = p.goals[ph] || []
  const ok = goals.filter((g) => g.ok).length
  void c
  return (
    <button className="h-phase" onClick={() => nav('/carrera')}>
      <span className="h-runner">
        <Sprite look={p.look} zone={rec ? null : p.zone} scale={2.6} />
      </span>
      <span className="h-ph">
        <span className="h-k2">{rec ? '5 de 5 fases' : `Fase ${ph} de 5`}</span>
        <b>{rec ? '¡Te has recuperado!' : PHASES[ph - 1]}</b>
        <span className="h-seg" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((f) => (
            <i
              key={f}
              className={f <= p.done ? 'ok' : f === ph && !rec ? 'cur' : ''}
              style={f <= p.done ? { background: MEDAL_MAIN[f] } : f === ph && !rec ? { ['--fill' as string]: `${goals.length ? (ok / goals.length) * 100 : 0}%` } : undefined}
            />
          ))}
        </span>
        {!rec && (
          <small>
            {ok} de {goals.length} objetivos para tu medalla ›
          </small>
        )}
        {p.objective && (
          <span className="h-goal">
            🏁 <span>{p.objective}</span>
          </span>
        )}
      </span>
    </button>
  )
}
