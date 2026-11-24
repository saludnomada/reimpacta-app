import { useState } from 'react'
import { newId, saveProgram } from '../../data/actions'
import { useCtx } from '../../data/store'
import { WD } from '../../domain/dates'
import type { Program } from '../../domain/model'
import { TaskIcon } from '../../ui/TaskIcon'
import { kindOf, TYPE_LABEL } from './Routines'

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

/** PROGRAMAS: el calendario de 13 semanas que sigue cada paciente (qué rutina toca cada día). */
export function Programs() {
  const c = useCtx()
  const [edit, setEdit] = useState<Program | null>(null)
  const users = (id: string) => c.st.patients.filter((p) => p.program === id).map((p) => p.name)
  const rt = (id: string | null) => (id ? c.st.routines.find((r) => r.id === id) : undefined)

  if (edit) return <ProgramEditor pr={edit} users={users(edit.id)} onClose={() => setEdit(null)} />
  return (
    <div className="jl">
      <div className="jl-bar">
        <p className="muted" style={{ margin: 0 }}>
          Cada programa dice qué rutina toca cada día. El paciente lo sigue desde su primer lunes.
        </p>
        <button className="btn small" onClick={() => setEdit({ id: newId('p'), name: 'NUEVO PROGRAMA', weeks: [[null, null, null, null, null, null, null]] })}>
          + Nuevo programa
        </button>
      </div>
      <div className="grid">
        {c.st.programs.map((pr) => {
          const u = users(pr.id)
          return (
            <button key={pr.id} className="prcard" onClick={() => setEdit(structuredClone(pr))}>
              <b>{sentence(pr.name)}</b>
              <small>
                {pr.weeks.length} {pr.weeks.length === 1 ? 'semana' : 'semanas'} · {u.length ? u.join(', ') : 'nadie lo usa aún'}
              </small>
              <div className="pr-mini">
                {pr.weeks.slice(0, 6).map((w, i) => (
                  <div key={i}>
                    {w.map((id, j) => {
                      const r = rt(id)
                      return <i key={j} className={r ? `k-${kindOf(r.type)}` : 'free'} />
                    })}
                  </div>
                ))}
                {pr.weeks.length > 6 && <small>+{pr.weeks.length - 6} semanas</small>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ProgramEditor({ pr, users, onClose }: { pr: Program; users: string[]; onClose: () => void }) {
  const c = useCtx()
  const [d, setD] = useState<Program>(pr)
  const rt = (id: string | null) => (id ? c.st.routines.find((r) => r.id === id) : undefined)
  const setCell = (w: number, day: number, id: string | null) => setD({ ...d, weeks: d.weeks.map((row, i) => (i === w ? row.map((x, j) => (j === day ? id : x)) : row)) })
  const count = (w: (string | null)[]) => w.filter(Boolean).length
  const byType = (Object.keys(TYPE_LABEL) as (keyof typeof TYPE_LABEL)[]).map((t) => [t, c.st.routines.filter((r) => (r.type || 'fuerza') === t)] as const)

  return (
    <div className="jl">
      <div className="jl-bar">
        <button className="btn ghost small" onClick={onClose}>
          ‹ Programas
        </button>
        <div className="row">
          <button
            className="btn ghost small"
            onClick={() => {
              saveProgram({ ...structuredClone(d), id: newId('p'), name: d.name + ' (COPIA)' })
              onClose()
            }}
          >
            Duplicar
          </button>
          <button
            className="btn small"
            onClick={() => {
              saveProgram(d)
              onClose()
            }}
          >
            Guardar
          </button>
        </div>
      </div>

      <section className="card">
        <label>
          <span className="lbl">Nombre</span>
          <input className="search" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value.toUpperCase() })} />
        </label>
        <p className="muted" style={{ margin: 0 }}>
          {d.weeks.length} {d.weeks.length === 1 ? 'semana' : 'semanas'}
          {users.length > 0 && ` · lo siguen: ${users.join(', ')}`}. Si un paciente pasa de la última semana, se repite la última hasta que
          lo cambies.
        </p>
      </section>

      <div className="pr-table">
        <div className="pr-row head">
          <span />
          {WD.map((x) => (
            <span key={x}>{x}</span>
          ))}
          <span />
        </div>
        {d.weeks.map((w, i) => (
          <div key={i} className="pr-row">
            <span className="pr-wk">
              S{i + 1}
              <small>{count(w)} ses.</small>
            </span>
            {w.map((id, j) => {
              const r = rt(id)
              return (
                <label key={j} className={`pr-cell ${r ? 'k-' + kindOf(r.type) : 'free'}`} title={r ? sentence(r.name) : 'Día libre'}>
                  {r ? <TaskIcon k={kindOf(r.type)} /> : <i />}
                  <em>{r ? sentence(r.name) : 'Libre'}</em>
                  <select value={id || ''} onChange={(e) => setCell(i, j, e.target.value || null)} aria-label={`Semana ${i + 1}, ${WD[j]}`}>
                    <option value="">Día libre</option>
                    {byType.map(([t, rs]) =>
                      rs.length ? (
                        <optgroup key={t} label={TYPE_LABEL[t]}>
                          {rs.map((x) => (
                            <option key={x.id} value={x.id}>
                              {sentence(x.name)}
                            </option>
                          ))}
                        </optgroup>
                      ) : null,
                    )}
                  </select>
                </label>
              )
            })}
            <span className="pr-acts">
              <button onClick={() => setD({ ...d, weeks: [...d.weeks.slice(0, i + 1), [...w], ...d.weeks.slice(i + 1)] })} title="Duplicar semana">
                Copiar
              </button>
              {d.weeks.length > 1 && (
                <button onClick={() => setD({ ...d, weeks: d.weeks.filter((_, k) => k !== i) })} title="Quitar semana">
                  ×
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
      <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setD({ ...d, weeks: [...d.weeks, [...(d.weeks[d.weeks.length - 1] || Array(7).fill(null))]] })}>
        + Añadir semana
      </button>
    </div>
  )
}
