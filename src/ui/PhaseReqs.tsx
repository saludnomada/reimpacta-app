import type { Ctx } from '../domain/logic'
import type { Patient } from '../domain/model'
import { phaseRequirements, TEST_STATUS } from '../domain/progress'
import { IcCheck } from './icons'

/** «Para superar esta fase»: los tests y debajo los hitos a lograr. */
export function PhaseReqs({ c, p, compact = false }: { c: Ctx; p: Patient; compact?: boolean }) {
  const q = phaseRequirements(c, p)
  if (p.done >= 5 || !q.total) return null
  return (
    <div className={`preq ${compact ? 'compact' : ''}`}>
      <div className="preq-h">
        <b>Para superar esta fase</b>
        <span>
          {q.okN} de {q.total}
        </span>
      </div>
      {q.tests.length > 0 && (
        <>
          <span className="preq-sub">Tests</span>
          <ul>
            {q.tests.map((x) => (
              <li key={x.id} className={x.st === 'ok' ? 'ok' : ''}>
                <i>{x.st === 'ok' ? <IcCheck /> : null}</i>
                <span>{x.label}</span>
                <em className={`st-${x.st}`}>{TEST_STATUS[x.st]}</em>
              </li>
            ))}
          </ul>
        </>
      )}
      <span className="preq-sub">Hitos a lograr</span>
      <ul>
        {q.goals.map((g, i) => (
          <li key={i} className={g.ok ? 'ok' : ''}>
            <i>{g.ok ? <IcCheck /> : null}</i>
            <span>{g.t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
