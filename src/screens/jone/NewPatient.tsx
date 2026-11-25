import { useState } from 'react'
import { addPatient, newId } from '../../data/actions'
import { useCtx } from '../../data/store'
import { addD, isoD, monday } from '../../domain/dates'
import { PLANS, ZONES, type Patient, type PlanKey, type Sex, type Zone } from '../../domain/model'

/** Dar de alta a un paciente: con su email podrá entrar en la app. */
export function NewPatient({ onClose }: { onClose: () => void }) {
  const c = useCtx()
  const [f, setF] = useState({
    name: '',
    email: '',
    sex: 'chica' as Sex,
    zone: 'rodilla' as Zone,
    injury: '',
    start: isoD(addD(monday(c.today), 7)),
    program: c.st.programs[0]?.id || '',
    objective: '',
    plan: 'reimpacta' as PlanKey,
    price: PLANS.reimpacta[1],
    n: 3,
  })
  const set = (patch: Partial<typeof f>) => setF({ ...f, ...patch })
  const dup = c.st.patients.some((p) => p.email && p.email.toLowerCase() === f.email.trim().toLowerCase())
  const valid = f.name.trim() && /\S+@\S+\.\S+/.test(f.email) && f.program && !dup
  const save = () => {
    const goals: Patient['goals'] = {}
    Object.entries(c.st.defaultGoals).forEach(([ph, gs]) => (goals[+ph] = gs.map((t) => ({ t, ok: false }))))
    addPatient({
      id: newId('pt'),
      name: f.name.trim(),
      email: f.email.trim().toLowerCase(),
      sex: f.sex,
      look: f.sex === 'chica' ? 'chica-morena' : 'chico-moreno',
      zone: f.zone,
      injury: f.injury.trim(),
      start: f.start,
      program: f.program,
      objective: f.objective.trim(),
      done: 0,
      medalsSeen: 0,
      introSeen: false,
      goals,
      phaseAt: {},
      sessions: {},
      fridays: {},
      recs: {},
      notes: [],
      pay: { plan: f.plan, price: +f.price, n: f.n, paid: Array(f.n).fill(false) },
      follow: { talked: null, planDone: false, planUpdated: false },
      settings: { notif: 'push', reminder: '08:00', theme: 'claro' },
    })
    onClose()
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet ved" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <span className="lbl">Nuevo paciente</span>
        <div className="ved-row2">
          <label>
            <span>Nombre</span>
            <input className="search" value={f.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label>
            <span>Email (con él entra en la app)</span>
            <input className="search" type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} />
            {dup && <small className="np-err">Ya hay un paciente con ese email.</small>}
          </label>
        </div>
        <div className="ved-row2">
          <label>
            <span>Zona</span>
            <select className="search" value={f.zone} onChange={(e) => set({ zone: e.target.value as Zone })}>
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z.charAt(0).toUpperCase() + z.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Chica o chico (para los textos)</span>
            <select className="search" value={f.sex} onChange={(e) => set({ sex: e.target.value as Sex })}>
              <option value="chica">Chica</option>
              <option value="chico">Chico</option>
            </select>
          </label>
        </div>
        <label>
          <span>Lesión</span>
          <input className="search" value={f.injury} placeholder="Ej.: tendinopatía de Aquiles" onChange={(e) => set({ injury: e.target.value })} />
        </label>
        <label>
          <span>Su meta</span>
          <input className="search" value={f.objective} placeholder="Ej.: volver a correr la Behobia" onChange={(e) => set({ objective: e.target.value })} />
        </label>
        <div className="ved-row2">
          <label>
            <span>Empieza el (lunes)</span>
            <input className="search" type="date" value={f.start} onChange={(e) => set({ start: e.target.value })} />
          </label>
          <label>
            <span>Programa</span>
            <select className="search" value={f.program} onChange={(e) => set({ program: e.target.value })}>
              {c.st.programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.charAt(0) + p.name.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="ved-row2">
          <label>
            <span>Plan</span>
            <select className="search" value={f.plan} onChange={(e) => set({ plan: e.target.value as PlanKey, price: PLANS[e.target.value as PlanKey][1] || f.price })}>
              {(Object.keys(PLANS) as PlanKey[]).map((k) => (
                <option key={k} value={k}>
                  {PLANS[k][0]}
                </option>
              ))}
            </select>
          </label>
          <div className="ved-row2">
            <label>
              <span>Precio (€)</span>
              <input className="search" inputMode="decimal" value={f.price} onChange={(e) => set({ price: +e.target.value.replace(',', '.') || 0 })} />
            </label>
            <label>
              <span>Plazos</span>
              <select className="search" value={f.n} onChange={(e) => set({ n: +e.target.value })}>
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <p className="muted me-hint">Los plazos vencen cada 30 días desde el inicio. Márcalos como pagados en Facturación; si no, su app se pausa a los 3 días.</p>
        <div className="row">
          <button className="btn" disabled={!valid} onClick={save}>
            Dar de alta
          </button>
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
