import type { Ctx } from '../domain/logic'
import type { Patient } from '../domain/model'
import { milestones, totals, type Milestone } from '../domain/progress'
import { IcCalendar, IcCheck, IcDown, IcDumbbell, IcFlag, IcFlame, IcMedal } from './icons'

const MI: Record<Milestone['icon'], () => React.ReactElement> = {
  flag: IcFlag,
  calendar: IcCalendar,
  dumbbell: IcDumbbell,
  flame: IcFlame,
  medal: IcMedal,
  check: IcCheck,
  down: IcDown,
}

const hours = (min: number) => (min >= 60 ? `${(Math.round((min / 60) * 10) / 10).toLocaleString('es-ES')} h` : `${min} min`)

/** LO QUE YA HAS CONSEGUIDO: números grandes y los hitos desbloqueados. Para celebrar. */
export function Achieved({ c, p, compact = false }: { c: Ctx; p: Patient; compact?: boolean }) {
  const t = totals(c, p)
  const ms = milestones(c, p)
  if (!t.sessions) return null
  const tiles: [string, string, boolean?][] = [
    ...(t.painDrop ? ([[`−${t.painDrop}%`, 'de dolor en tu día a día', true]] as [string, string, boolean][]) : []),
    [String(t.sessions), t.sessions === 1 ? 'sesión hecha' : 'sesiones hechas'],
    [hours(t.minutes), 'entrenando'],
    [String(t.sets), 'series'],
    [String(t.medals), t.medals === 1 ? 'medalla' : 'medallas'],
    [String(t.best), 'mejor racha'],
    [String(t.weeks), t.weeks === 1 ? 'semana' : 'semanas'],
  ]
  return (
    <section className={`ach ${compact ? 'compact' : ''}`}>
      <h2 className="x-h2">Lo que ya has conseguido</h2>
      <div className="ach-tiles">
        {tiles.map(([n, l, hero], i) => (
          <div key={i} className={`ach-t ${hero ? 'hero' : ''}`}>
            <b>{n}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>
      {ms.length > 0 && (
        <div className="ach-ms">
          {ms.map((m) => {
            const I = MI[m.icon]
            return (
              <span key={m.id} className="ach-m">
                <i>
                  <I />
                </i>
                {m.title}
              </span>
            )
          })}
        </div>
      )}
    </section>
  )
}
