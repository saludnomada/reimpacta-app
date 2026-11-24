import { useState } from 'react'
import { deleteRoutine, newId, saveRoutine } from '../../data/actions'
import { useCtx } from '../../data/store'
import { doseText, estMin, itemTitle, videoById } from '../../domain/logic'
import type { CacoItem, ExerciseItem, Routine, RoutineItem, SessionType } from '../../domain/model'
import { IcSearch } from '../../ui/icons'
import { TaskIcon } from '../../ui/TaskIcon'
import { VideoThumb } from '../../ui/VideoThumb'
import { norm } from './VideoLab'

export const TYPE_LABEL: Record<SessionType, string> = { fuerza: 'Fuerza', movilidad: 'Movilidad', caco: 'Correr y caminar', correr: 'Correr' }
export const kindOf = (t?: SessionType) => (t === 'movilidad' ? 'movilidad' : t === 'caco' || t === 'correr' ? 'correr' : 'fuerza')
const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

/** RUTINAS: cada sesión tipo (sus ejercicios, series, repeticiones o segundos, peso y nota). */
export function Routines() {
  const c = useCtx()
  const [edit, setEdit] = useState<Routine | null>(null)
  const [f, setF] = useState<SessionType | 'all'>('all')
  const used = (id: string) => c.st.programs.filter((p) => p.weeks.some((w) => w.includes(id))).map((p) => p.name)
  const list = c.st.routines.filter((r) => f === 'all' || r.type === f)

  if (edit) return <RoutineEditor r={edit} used={used(edit.id)} onClose={() => setEdit(null)} />
  return (
    <div className="jl">
      <div className="jl-bar">
        <div className="row">
          {(['all', 'fuerza', 'movilidad', 'caco', 'correr'] as const).map((k) => (
            <button key={k} className={`chip ${f === k ? 'on' : ''}`} onClick={() => setF(k)}>
              {k === 'all' ? 'Todas' : TYPE_LABEL[k]}
            </button>
          ))}
        </div>
        <button className="btn small" onClick={() => setEdit({ id: newId('r'), name: 'NUEVA RUTINA', type: 'fuerza', items: [] })}>
          + Nueva rutina
        </button>
      </div>
      <div className="grid">
        {list.map((r) => {
          const u = used(r.id)
          return (
            <button key={r.id} className={`rcard k-${kindOf(r.type)}`} onClick={() => setEdit(structuredClone(r))}>
              <span className="rcard-ic">
                <TaskIcon k={kindOf(r.type)} />
              </span>
              <span className="rcard-tx">
                <b>{sentence(r.name)}</b>
                <small>
                  {TYPE_LABEL[r.type || 'fuerza']} · {r.items.length} {r.items.length === 1 ? 'ejercicio' : 'ejercicios'} · {estMin(r)} min
                </small>
                <span className="rcard-ex">{r.items.map((it) => sentence(itemTitle(c, it))).join(' · ')}</span>
                <small className="rcard-used">{u.length ? `En ${u.length} ${u.length === 1 ? 'programa' : 'programas'}` : 'Sin usar todavía'}</small>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RoutineEditor({ r, used, onClose }: { r: Routine; used: string[]; onClose: () => void }) {
  const c = useCtx()
  const [d, setD] = useState<Routine>(r)
  const [q, setQ] = useState('')
  const set = (i: number, patch: Partial<ExerciseItem> | Partial<CacoItem>) =>
    setD({ ...d, items: d.items.map((it, j) => (j === i ? ({ ...it, ...patch } as RoutineItem) : it)) })
  const move = (i: number, k: number) => {
    const items = d.items.slice()
    const [x] = items.splice(i, 1)
    items.splice(i + k, 0, x)
    setD({ ...d, items })
  }
  const del = (i: number) => setD({ ...d, items: d.items.filter((_, j) => j !== i) })
  const words = norm(q).split(/\s+/).filter(Boolean)
  const found = words.length
    ? c.st.videos.filter((v) => v.type !== 'clase' && words.every((w) => norm([v.title, ...v.keywords].join(' ')).includes(w))).slice(0, 8)
    : []
  const isRun = d.type === 'caco' || d.type === 'correr'

  return (
    <div className="jl">
      <div className="jl-bar">
        <button className="btn ghost small" onClick={onClose}>
          ‹ Rutinas
        </button>
        <div className="row">
          <button
            className="btn ghost small"
            onClick={() => {
              saveRoutine({ ...structuredClone(d), id: newId('r'), name: d.name + ' (COPIA)' })
              onClose()
            }}
          >
            Duplicar
          </button>
          {!used.length && c.st.routines.some((x) => x.id === d.id) && (
            <button
              className="btn ghost small"
              onClick={() => {
                deleteRoutine(d.id)
                onClose()
              }}
            >
              Borrar
            </button>
          )}
          <button
            className="btn small"
            onClick={() => {
              saveRoutine(d)
              onClose()
            }}
          >
            Guardar
          </button>
        </div>
      </div>

      <section className="card">
        <div className="re-head">
          <label>
            <span className="lbl">Nombre</span>
            <input className="search" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value.toUpperCase() })} />
          </label>
          <label>
            <span className="lbl">Tipo de sesión</span>
            <select className="search" value={d.type || 'fuerza'} onChange={(e) => setD({ ...d, type: e.target.value as SessionType })}>
              {(Object.keys(TYPE_LABEL) as SessionType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {d.items.length} {d.items.length === 1 ? 'ejercicio' : 'ejercicios'} · unos {estMin(d)} minutos
          {used.length > 0 && ` · la usan: ${used.map(sentence).join(', ')}`}
        </p>
      </section>

      <ol className="re-list">
        {d.items.map((it, i) => (
          <li key={i} className="card re-item">
            <div className="re-top">
              <span className="re-n">{i + 1}</span>
              {it.kind === 'caco' ? (
                <span className="re-runic">
                  <TaskIcon k="correr" />
                </span>
              ) : (
                <VideoThumb v={videoById(c, it.v)} w={64} />
              )}
              <div className="re-name">
                <b>{sentence(itemTitle(c, it))}</b>
                <small>{doseText(it)}</small>
              </div>
              <div className="re-ord">
                <button disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir">
                  ↑
                </button>
                <button disabled={i === d.items.length - 1} onClick={() => move(i, 1)} aria-label="Bajar">
                  ↓
                </button>
                <button onClick={() => del(i)} aria-label="Quitar">
                  ×
                </button>
              </div>
            </div>
            {it.kind === 'caco' ? (
              <div className="re-fields">
                <Num label="Bloques" v={it.sets} on={(x) => set(i, { sets: x })} />
                <Num label="Corre (min)" v={it.run} on={(x) => set(i, { run: x })} step={0.5} />
                <Num label="Camina (min)" v={it.walk} on={(x) => set(i, { walk: x })} step={0.5} />
                <label className="re-note">
                  <span>Nota para el paciente</span>
                  <input value={it.note} onChange={(e) => set(i, { note: e.target.value })} placeholder="Ej.: ritmo en el que puedas hablar" />
                </label>
              </div>
            ) : (
              <div className="re-fields">
                <Num label="Series" v={it.sets} on={(x) => set(i, { sets: x })} />
                <div className="re-unit">
                  <span>Medida</span>
                  <div className="seg2">
                    <button className={it.unit === 'reps' ? 'on' : ''} onClick={() => set(i, { unit: 'reps' })}>
                      Repeticiones
                    </button>
                    <button className={it.unit === 'secs' ? 'on' : ''} onClick={() => set(i, { unit: 'secs' })}>
                      Segundos
                    </button>
                  </div>
                </div>
                <Num label={it.unit === 'secs' ? 'Segundos' : 'Repeticiones'} v={it.amount} on={(x) => set(i, { amount: x })} />
                <label className="re-kg">
                  <span>Kg</span>
                  <input value={it.kg} inputMode="decimal" placeholder="–" onChange={(e) => set(i, { kg: e.target.value })} />
                </label>
                <label className="re-note">
                  <span>Nota para el paciente</span>
                  <input value={it.note} onChange={(e) => set(i, { note: e.target.value })} placeholder="Ej.: baja en 3 segundos" />
                </label>
              </div>
            )}
          </li>
        ))}
      </ol>

      <section className="card">
        <span className="lbl">Añadir</span>
        {isRun && (
          <button
            className="btn ghost small"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => setD({ ...d, items: [...d.items, { kind: 'caco', sets: d.type === 'correr' ? 1 : 6, run: d.type === 'correr' ? 20 : 2, walk: d.type === 'correr' ? 0 : 1, note: '' }] })}
          >
            + Bloque de correr
          </button>
        )}
        <div className="vl-search">
          <IcSearch />
          <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca un ejercicio de tu biblioteca…" />
        </div>
        {found.map((v) => (
          <button
            key={v.id}
            className="re-add"
            onClick={() => {
              const secs = v.type === 'secs'
              setD({ ...d, items: [...d.items, { v: v.id, sets: 3, amount: secs ? 30 : 10, unit: secs ? 'secs' : 'reps', kg: '', note: '' }] })
              setQ('')
            }}
          >
            <VideoThumb v={v} w={48} />
            <span>{sentence(v.title)}</span>
            <b>+ Añadir</b>
          </button>
        ))}
        {words.length > 0 && !found.length && <p className="muted" style={{ margin: 0 }}>No encuentro ese ejercicio.</p>}
      </section>
    </div>
  )
}

function Num({ label, v, on, step = 1 }: { label: string; v: number; on: (v: number) => void; step?: number }) {
  return (
    <label className="re-num">
      <span>{label}</span>
      <div>
        <button onClick={() => on(Math.max(0, +(+v - step).toFixed(1)))} aria-label="Menos">
          −
        </button>
        <input value={v} inputMode="decimal" onChange={(e) => on(+e.target.value.replace(',', '.') || 0)} />
        <button onClick={() => on(+(+v + step).toFixed(1))} aria-label="Más">
          +
        </button>
      </div>
    </label>
  )
}
