import { useNavigate } from 'react-router-dom'
import { diffDays, monday, parseD, WD } from '../../domain/dates'
import { doseText, endOf, estMin, recovered, routineFor, sessName, sType, videoById, weekNo, type Ctx } from '../../domain/logic'
import type { Patient, Routine } from '../../domain/model'
import { eveningNudge, todayItems, weekSummary, type TodoItem } from '../../domain/patientHome'
import { currentPhase } from '../../domain/logic'
import { PHASES } from '../../domain/model'
import { PhaseBadge } from '../../ui/PhaseBadge'
import { weeksGrid } from '../../domain/progress'
import { IcCheck, IcChevron, IcClock, IcPlay } from '../../ui/icons'
import { phaseRequirements } from '../../domain/progress'
import { BrandIcon } from '../../ui/BrandIcon'
import { TaskIcon } from '../../ui/TaskIcon'
import { Ring } from '../../ui/Ring'
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
  const eve = eveningNudge(c, p)
  const rToday = routineFor(c, p, c.today)
  const estMinToday = rToday ? estMin(rToday) : 0

  return (
    <>
      <header className="h5-head h5-row">
        <div>
        <span className="x-over">
          {dayLabel(c.today)} · Semana {weekNo(c, p)}
          {totalWeeks ? ` de ${totalWeeks}` : ''}
        </span>
        <h1 className="x-title">{greeting(c.now)}, {p.name}</h1>
        <p className="h5-sub">{pend ? `Hoy tienes ${pend} ${pend === 1 ? 'tarea' : 'tareas'}` : items.length ? 'Hoy lo tienes todo hecho' : 'Hoy es día libre. Muévete a tu ritmo.'}</p>
        {eve && <p className="h5-eve">{eve.title}: {estMinToday} minutos y cierras el día.</p>}
        </div>
        {wk.total > 0 && (
          <div className="h5-ring" aria-label={`Esta semana: ${wk.done} de ${wk.total} sesiones`}>
            <Ring value={wk.done / wk.total} size={68} stroke={7}>
              <b>
                {wk.done}/{wk.total}
              </b>
            </Ring>
            <small>esta semana</small>
          </div>
        )}
      </header>

      {main ? (
        <SessionCard x={main} r={routineFor(c, p, c.today)} c={c} onClick={() => nav(goPath(main.go))} />
      ) : (
        <section className="h5-rest rest-ic">
          <BrandIcon k="recuperar" size={44} />
          <div>
            <b>Día libre</b>
            <span>Aprovecha para desconectar, disfrutar, descansar y recargar energía. Tu cuerpo también se recupera hoy.</span>
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <ul className="x-list">
          {rest.map((x, i) => (
            <li key={i}>
              <button className={`x-row ${x.done ? 'done' : x.co ? 'co' : ''}`} onClick={() => nav(goPath(x.go))}>
                <span className="x-bic" aria-hidden="true">
                  <BrandIcon k={x.icon} size={44} />
                  {x.done && (
                    <i className="bic-ok">
                      <IcCheck />
                    </i>
                  )}
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

      <PhaseLine c={c} p={p} />
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
              <i>{cell.kind ? <TaskIcon k={cell.kind} /> : null}</i>
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


/** Saludo según la hora */
function greeting(now: number) {
  const h = new Date(now).getHours()
  return h < 6 ? 'Buenas noches' : h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches'
}

/** Su fase actual y su meta, en una tarjeta discreta. */
function PhaseLine({ c, p }: { c: Ctx; p: Patient }) {
  const nav = useNavigate()
  const rec = recovered(p)
  const ph = currentPhase(p)
  const q = phaseRequirements(c, p)
  return (
    <button className="h5-phase" onClick={() => nav('/progreso#fase')}>
      <PhaseBadge p={p} size={52} />
      <span className="h5-ph">
        <small>{rec ? "Programa completado" : `Fase ${ph} de 5`}</small>
        <b>{rec ? 'Te has recuperado' : PHASES[ph - 1]}</b>

      </span>
      <IcChevron />
      {!rec && q.total > 0 && (
        <span className="h5-reqs-link">
          Para superar esta fase: {q.okN} de {q.total} · <u>ver tests e hitos</u>
        </span>
      )}
      {p.objective && (
        <span className="h5-goal">
          <BrandIcon k="meta" size={36} />
          <span>
            <small>Tu meta</small>
            {p.objective}
          </span>
        </span>
      )}
    </button>
  )
}
