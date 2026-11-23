import { useNavigate } from 'react-router-dom'
import { diffDays, monday, parseD } from '../../domain/dates'
import { currentPhase, doseText, endOf, estMin, recovered, routineFor, sessName, streak, sType, videoById, weekNo, type Ctx } from '../../domain/logic'
import type { Patient, Routine } from '../../domain/model'
import { PHASES } from '../../domain/model'
import { lastWeekSummary, motivation, todayItems, type TodoItem } from '../../domain/patientHome'
import { improvements, weeksGrid } from '../../domain/progress'
import { WD } from '../../domain/dates'
import { IcCheck, IcChevron, IcClock, IcPlay } from '../../ui/icons'
import { MEDAL } from '../../ui/Medal'
import { Ring } from '../../ui/Ring'
import { PhaseBadge, zoneLabel } from '../../ui/PhaseBadge'
import { TaskIcon } from '../../ui/TaskIcon'
import { VideoThumb } from '../../ui/VideoThumb'
import { goPath } from './goPath'
import { InstallBanner } from './InstallGuide'
import { Achieved } from '../../ui/Achieved'

/** "STEP DOWN DERECHO" → "Step down derecho" */
export const sentence = (t: string) => (t ? t.charAt(0) + t.slice(1).toLowerCase() : t)
const dayLabel = (d: Date) =>
  d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (x) => x.toUpperCase())

/**
 * HOY: "Hoy tienes X tareas" en forma de lista. Al grano.
 * La sesión de hoy destacada · lo pendiente en coral · lo hecho tachado ·
 * abajo la fase con el corredor/a y su meta. Lo no hecho no se acumula.
 */
export function Home({ c, p }: { c: Ctx; p: Patient }) {
  const nav = useNavigate()
  const items = todayItems(c, p)
  const done = items.filter((x) => x.done).length
  const pend = items.length - done
  const end = endOf(p)
  const rec = recovered(p)
  const totalWeeks = end && !rec ? Math.round(diffDays(monday(parseD(p.start)), end) / 7) : null
  const first = items[0]
  const main = first && first.go.to === 'session' && (first.main || first.done) ? first : undefined
  const rest = items.filter((x) => x !== main)
  const st = streak(c, p)
  const sum = lastWeekSummary(c, p)
  const imp = improvements(p).find((x) => x.key === 'painLife')
  const best = imp && imp.pct > 0 ? imp.pct : null
  const week = weeksGrid(c, p, 1).slice(-1)[0]

  return (
    <>
      <section className="x-hero">
      <header className="x-head">
        <div>
          <span className="x-over">
            {dayLabel(c.today)} · Semana {weekNo(c, p)}
            {totalWeeks ? `/${totalWeeks}` : ''}
          </span>
          <h1 className="x-title">Hola, {p.name}</h1>
          <p className="x-sub">{motivation(c, p, st, best)}</p>
        </div>
        {items.length > 0 && (
          <Ring value={done / items.length} size={60} stroke={6}>
            <b>
              {done}/{items.length}
            </b>
          </Ring>
        )}
      </header>

      {week && (
        <div className="x-weekstrip" aria-label="Tu semana">
          {week.cells.map((cell, i) => (
            <span key={cell.day} className={`ws ${cell.state} ${cell.kind ? 'k-' + cell.kind : ''}`}>
              <small>{WD[i]}</small>
              <i>{cell.state === 'done' ? <IcCheck /> : null}</i>
            </span>
          ))}
        </div>
      )}
      </section>

      {sum && (
        <button className="x-week" onClick={() => nav('/progreso')}>
          <span>
            <small>Semana pasada</small>
            <b>
              {sum.done} de {sum.total} sesiones
            </b>
          </span>
          <span className="x-wbar" aria-hidden="true">
            <i style={{ width: `${(sum.done / sum.total) * 100}%` }} />
          </span>
        </button>
      )}

      <h2 className="x-h2 big">{pend ? `Hoy tienes ${pend} ${pend === 1 ? 'tarea' : 'tareas'}` : items.length ? 'Hoy lo tienes todo hecho' : 'Hoy es día libre'}</h2>

      {main && <SessionCard x={main} r={routineFor(c, p, c.today)} c={c} onClick={() => nav(goPath(main.go))} />}

      {rest.length > 0 && (
        <section className="x-group">
          {main && <h2 className="x-h2">También hoy</h2>}
          <ul className="x-list">
            {rest.map((x, i) => (
              <li key={i}>
                <button className={`x-row ${x.done ? 'done' : x.co ? 'co' : ''}`} onClick={() => nav(goPath(x.go))}>
                  <span className="x-ic" aria-hidden="true">
                    {x.done ? <IcCheck /> : <TaskIcon k={x.icon} />}
                  </span>
                  <span className="x-tx">
                    <b>{x.title}</b>
                    <small>{x.sub}</small>
                  </span>
                  <span className="x-go">
                    <IcChevron />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Achieved c={c} p={p} compact />
      <PhaseCard p={p} />
      <InstallBanner />
    </>
  )
}

/** La sesión de hoy: tarjeta oscura con sus ejercicios y un botón claro para empezar. */
function SessionCard({ x, r, c, onClick }: { x: TodoItem; r: Routine | null; c: Ctx; onClick: () => void }) {
  if (!r) return null
  const kind = sType(r) || 'fuerza'
  const list = r.items.slice(0, 4)
  const more = r.items.length - list.length
  return (
    <section className={`x-session ${x.done ? 'done' : ''}`}>
      <div className="x-s-top">
        <span className="x-chip">
          <TaskIcon k={kind} /> {sessName(r)}
        </span>
        <span className="x-meta">
          <IcClock /> {estMin(r)} min · {r.items.length} ejercicios
        </span>
      </div>
      <h2 className="x-s-title">{x.done ? 'Sesión hecha' : 'Tu sesión de hoy'}</h2>
      <ol className="x-ex">
        {list.map((it, i) => {
          const v = it.kind === 'caco' ? null : videoById(c, it.v)
          return (
            <li key={i}>
              {it.kind === 'caco' ? (
                <span className="x-num">
                  <TaskIcon k="correr" />
                </span>
              ) : (
                <VideoThumb v={v} w={52} />
              )}
              <span className="x-exn">{it.kind === 'caco' ? (+it.walk ? 'Correr y caminar' : 'Carrera continua') : sentence(v?.title || 'Ejercicio')}</span>
              <span className="x-dose">{doseText(it)}</span>
            </li>
          )
        })}
        {more > 0 && <li className="x-more">y {more} más</li>}
      </ol>
      <button className="x-cta" onClick={onClick}>
        {x.done ? (
          'Ver la sesión'
        ) : (
          <>
            <IcPlay /> {x.sub.includes('sigue') ? 'Seguir' : 'Empezar'}
          </>
        )}
      </button>
    </section>
  )
}

/** La fase: su medalla con el anillo de lo que le falta, la zona de dolor y su meta. */
function PhaseCard({ p }: { p: Patient }) {
  const nav = useNavigate()
  const ph = currentPhase(p)
  const rec = recovered(p)
  const goals = p.goals[ph] || []
  const ok = goals.filter((g) => g.ok).length
  return (
    <button className="x-phase" onClick={() => nav('/progreso')}>
      <PhaseBadge p={p} size={72} />
      <span className="x-ph">
        <span className="x-over">{rec ? '5 de 5 fases' : ok === 0 ? `Fase ${ph} de 5 · a por tu medalla ${ph}` : `Fase ${ph} de 5 · ${ok} de ${goals.length} objetivos`}</span>
        <b>{rec ? 'Te has recuperado' : PHASES[ph - 1]}</b>
        <span className="x-seg" aria-hidden="true">
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
          <span className="zchip">
            <i /> {zoneLabel(p.zone)}
          </span>
        )}
      </span>
      <span className="x-go">
        <IcChevron />
      </span>
    </button>
  )
}
