import { useNavigate } from 'react-router-dom'
import { diffDays, monday, parseD, WD } from '../../domain/dates'
import { doseText, endOf, estMin, recovered, routineFor, sessName, sType, videoById, weekNo, type Ctx } from '../../domain/logic'
import type { Patient, Routine } from '../../domain/model'
import { todayItems, weekSummary, type TodoItem } from '../../domain/patientHome'
import { weeksGrid } from '../../domain/progress'
import { IcCheck, IcChevron, IcClock, IcPlay } from '../../ui/icons'
import { TaskIcon } from '../../ui/TaskIcon'
import { VideoThumb } from '../../ui/VideoThumb'
import { goPath } from './goPath'
import { InstallBanner } from './InstallGuide'

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
  const pend = items.filter((x) => !x.done).length
  const end = endOf(p)
  const rec = recovered(p)
  const totalWeeks = end && !rec ? Math.round(diffDays(monday(parseD(p.start)), end) / 7) : null
  const first = items[0]
  const main = first && first.go.to === 'session' && (first.main || first.done) ? first : undefined
  const rest = items.filter((x) => x !== main)
  const wk = weekSummary(c, p, monday(c.today))

  return (
    <>
      <header className="h5-head">
        <span className="x-over">
          {dayLabel(c.today)} · Semana {weekNo(c, p)}
          {totalWeeks ? ` de ${totalWeeks}` : ''}
        </span>
        <h1 className="x-title">Hola, {p.name}</h1>
        <p className="h5-sub">{pend ? `Hoy tienes ${pend} ${pend === 1 ? 'tarea' : 'tareas'}` : items.length ? 'Hoy lo tienes todo hecho' : 'Hoy es día libre. Muévete a tu ritmo.'}</p>
        {wk.total > 0 && (
          <div className="h5-weekcount">
            <span>
              Esta semana: <b>{wk.done} de {wk.total} sesiones</b>
            </span>
            <span className="h5-wbar" aria-hidden="true">
              {[...Array(wk.total)].map((_, i) => (
                <i key={i} className={i < wk.done ? 'ok' : ''} />
              ))}
            </span>
          </div>
        )}
      </header>

      {main ? (
        <SessionCard x={main} r={routineFor(c, p, c.today)} c={c} onClick={() => nav(goPath(main.go))} />
      ) : (
        <section className="h5-rest">
          <b>Hoy descansas</b>
          <span>El descanso también es parte del tratamiento. Camina, muévete a tu ritmo y mañana seguimos.</span>
        </section>
      )}

      {rest.length > 0 && (
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
      )}

      <ThisWeek c={c} p={p} />
      <InstallBanner />
    </>
  )
}

const KIND_LABEL: Record<string, string> = { fuerza: 'Fuerza', movilidad: 'Movilidad', correr: 'Correr' }

/** ESTA SEMANA: al final, por si la quiere ver. Cada día con su tipo: fuerza, movilidad o correr. */
function ThisWeek({ c, p }: { c: Ctx; p: Patient }) {
  const nav = useNavigate()
  const week = weeksGrid(c, p, 1).slice(-1)[0]
  if (!week) return null
  const kinds = [...new Set(week.cells.map((x) => x.kind).filter(Boolean))] as string[]
  return (
    <section className="h5-week">
      <h2 className="x-h2">Esta semana</h2>
      <div className="h5-days">
        {week.cells.map((cell, i) => {
          const d = parseD(cell.day)
          return (
            <button
              key={cell.day}
              className={`h5-day ${cell.state} ${cell.kind ? 'k-' + cell.kind : 'free'}`}
              onClick={() => cell.kind && nav(`/sesion/${cell.day}`)}
              aria-label={`${WD[i]} ${d.getDate()}: ${cell.kind ? KIND_LABEL[cell.kind] : 'descanso'}${cell.state === 'done' ? ', hecha' : ''}`}
            >
              <small>{WD[i]}</small>
              <span className="h5-num">{d.getDate()}</span>
              <i>{cell.kind ? cell.state === 'done' ? <IcCheck /> : <TaskIcon k={cell.kind} /> : null}</i>
            </button>
          )
        })}
      </div>
      {kinds.length > 0 && (
        <div className="h5-leg">
          {kinds.map((k) => (
            <span key={k} className={`k-${k}`}>
              <i /> {KIND_LABEL[k]}
            </span>
          ))}
        </div>
      )}
    </section>
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
          <IcClock /> {estMin(r)} min · {r.items.length} {r.items.length === 1 ? 'ejercicio' : 'ejercicios'}
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

