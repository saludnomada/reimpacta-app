import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addD, dow, fTime, isoD, monday, parseD } from '../../domain/dates'
import { estMin, routineFor, sessName, sType, weekNo, type Ctx } from '../../domain/logic'
import type { Patient } from '../../domain/model'
import { IcCheck, IcChevron } from '../../ui/icons'
import { Info } from '../../ui/Info'
import { TaskIcon } from '../../ui/TaskIcon'
import { BrandIcon } from '../../ui/BrandIcon'

const DAY = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/**
 * SEMANA: la agenda de la semana, día a día. Se puede mirar atrás;
 * la semana que viene se abre el domingo (como en el prototipo).
 */
export function Week({ c, p }: { c: Ctx; p: Patient }) {
  const nav = useNavigate()
  const thisMon = monday(c.today)
  const [off, setOff] = useState(0)
  const maxOff = dow(c.today) === 6 ? 1 : 0 // el domingo ya ven la semana siguiente
  const start = monday(parseD(p.start))
  const mon = addD(thisMon, off * 7)
  const canBack = addD(mon, -7) >= start
  const label = off === 0 ? 'Esta semana' : off === 1 ? 'La semana que viene' : off === -1 ? 'La semana pasada' : `Semana ${weekNo(c, p, mon)}`

  let total = 0,
    done = 0
  const rows = [...Array(7)].map((_, i) => {
    const d = addD(mon, i)
    const k = isoD(d)
    const r = d >= parseD(p.start) ? routineFor(c, p, d) : null
    const s = p.sessions[k]
    const isToday = k === isoD(c.today)
    const past = d < c.today && !isToday
    const st = !r ? 'rest' : s && s.status === 'done' ? 'done' : s && s.status === 'partial' ? 'partial' : isToday ? 'today' : past ? 'miss' : 'next'
    if (r) {
      total++
      if (st === 'done') done++
    }
    const fri = i === 4 && d >= parseD(p.start) ? (p.fridays[k] ? 'sent' : d <= c.today ? 'due' : 'soon') : null
    const call = c.st.bookings.find((b) => b.patient === p.id && isoD(new Date(b.at)) === k)
    return { d, k, r, st, isToday, fri, call }
  })

  return (
    <>
      <div className="h5-head">
        <h1 className="x-title">Tu semana</h1>
        <p className="h5-sub">Semana {weekNo(c, p, mon)} · {done} de {total} sesiones hechas</p>
      </div>

      <div className="wk-nav">
        <button onClick={() => setOff(off - 1)} disabled={!canBack} aria-label="Semana anterior">
          ‹
        </button>
        <b>{label}</b>
        <button onClick={() => setOff(off + 1)} disabled={off >= maxOff} aria-label="Semana siguiente">
          ›
        </button>
        <Info>
          Tu plan día a día. Toca un día para ver su sesión. La semana siguiente aparece el domingo, cuando Jone la deja preparada.
        </Info>
      </div>

      <ul className="wk-list">
        {rows.map(({ d, k, r, st, isToday, fri, call }, i) => (
          <li key={k} className={isToday ? 'wk-today' : ''}>
            <div className="wk-date">
              <small>{DAY[i].slice(0, 3)}</small>
              <b>{d.getDate()}</b>
            </div>
            <div className="wk-body">
              {r ? (
                <button className={`wk-sess st-${st} k-${sType(r) === 'movilidad' ? 'movilidad' : sType(r) === 'fuerza' ? 'fuerza' : 'correr'}`} onClick={() => nav(`/sesion/${k}`)}>
                  <span className="x-bic">
                    <BrandIcon k={sType(r) || 'fuerza'} size={42} />
                    {st === 'done' && (
                      <i className="bic-ok">
                        <IcCheck />
                      </i>
                    )}
                  </span>
                  <span className="wk-tx">
                    <b>{sessName(r)}</b>
                    <small>
                      {st === 'done' ? 'Hecha' : st === 'partial' ? 'A medias' : st === 'today' ? 'Hoy' : st === 'miss' ? 'Sin hacer' : 'Programada'} · {estMin(r)} min · {r.items.length}{' '}
                      {r.items.length === 1 ? 'ejercicio' : 'ejercicios'}
                    </small>
                  </span>
                  <IcChevron />
                </button>
              ) : (
                <span className="wk-rest">Descanso</span>
              )}
              {fri && (
                <span className={`wk-extra ${fri}`}>
                  <TaskIcon k="viernes" /> Cuestionario del viernes · {fri === 'sent' ? 'enviado' : fri === 'due' ? 'pendiente' : 'se abre ese día'}
                </span>
              )}
              {call && (
                <span className="wk-extra">
                  <TaskIcon k="llamada" /> Llamada con Jone · {fTime(new Date(call.at))}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
