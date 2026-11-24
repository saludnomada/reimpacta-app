import { useState } from 'react'
import { fDM, parseD } from '../domain/dates'
import type { Ctx } from '../domain/logic'
import type { Patient } from '../domain/model'
import { PHASES } from '../domain/model'
import { phaseRequirements, TEST_STATUS } from '../domain/progress'
import { IcCheck, IcChevron } from './icons'

/** Lista de tests y hitos. Hecho = verde lima · pendiente = coral. */
function ReqList({ c, p, phase, future }: { c: Ctx; p: Patient; phase: number; future?: boolean }) {
  const q = phaseRequirements(c, p, phase)
  return (
    <div className={`preq ${future ? 'future' : ''}`}>
      {q.tests.length > 0 && (
        <>
          <span className="preq-sub">Tests</span>
          <ul>
            {q.tests.map((x) => (
              <li key={x.id} className={x.st === 'ok' ? 'ok' : 'pend'}>
                <i>{x.st === 'ok' ? <IcCheck /> : null}</i>
                <span>{x.label}</span>
                {!future && <em className={`st-${x.st}`}>{TEST_STATUS[x.st]}</em>}
              </li>
            ))}
          </ul>
        </>
      )}
      <span className="preq-sub">Hitos a lograr</span>
      <ul>
        {q.goals.map((g, i) => (
          <li key={i} className={g.ok ? 'ok' : 'pend'}>
            <i>{g.ok ? <IcCheck /> : null}</i>
            <span>{g.t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Solo lo necesario de la fase actual (para Hoy o resúmenes). */
export function PhaseReqs({ c, p }: { c: Ctx; p: Patient; compact?: boolean }) {
  if (p.done >= 5) return null
  return <ReqList c={c} p={p} phase={Math.min(p.done + 1, 5)} />
}

/** Las 5 fases desplegables: la actual abierta; al tocar cualquiera, se ven todos sus tests e hitos. */
export function PhasesAccordion({ c, p }: { c: Ctx; p: Patient }) {
  const cur = Math.min(p.done + 1, 5)
  const rec = p.done >= 5
  const [open, setOpen] = useState<number | null>(rec ? null : cur)
  return (
    <ol className="phacc">
      {PHASES.map((nm, i) => {
        const f = i + 1
        const st = f <= p.done ? 'ok' : f === cur && !rec ? 'cur' : 'next'
        const q = phaseRequirements(c, p, f)
        const isOpen = open === f
        return (
          <li key={f} className={`${st} ${isOpen ? 'open' : ''}`}>
            <button className="phacc-h" onClick={() => setOpen(isOpen ? null : f)} aria-expanded={isOpen}>
              <span className="n">{st === 'ok' ? <IcCheck /> : f}</span>
              <span className="t">
                <b>{nm}</b>
                <small>
                  {st === 'ok'
                    ? `Superada${p.phaseAt[f] ? ' el ' + fDM(parseD(p.phaseAt[f])) : ''}`
                    : st === 'cur'
                      ? `En curso · ${q.okN} de ${q.total} conseguidos`
                      : 'Próximamente'}
                </small>
              </span>
              {st === 'cur' && (
                <span className="phacc-bar" aria-hidden="true">
                  <i style={{ width: `${q.total ? (q.okN / q.total) * 100 : 0}%` }} />
                </span>
              )}
              <span className="chev">
                <IcChevron />
              </span>
            </button>
            {isOpen && (
              <div className="phacc-b">
                <ReqList c={c} p={p} phase={f} future={st === 'next'} />
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
