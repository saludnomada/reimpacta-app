import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { backend, store } from '../data'
import { SampleBackend } from '../data/sampleBackend'
import { useStore } from '../data/store'
import { addD, isoD, monday } from '../domain/dates'
import { sampleState } from '../data/sample'
import { setPatientSetting } from '../data/actions'

/** Barra de prueba (solo con datos de ejemplo): ver como paciente o como Jone, y simular otro día. */
export function DemoBar() {
  const s = useStore()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  if (!(backend instanceof SampleBackend) || !s.data) return null
  const p = s.data.patients.find((x) => x.id === s.session.patientId)
  const today = store.today()
  if (!open)
    return (
      <div className="demo mini">
        <button className="demotog" onClick={() => setOpen(true)}>
          ⚙ Prueba · datos de ejemplo · {s.session.role === 'paciente' ? `App paciente (${p?.name})` : 'Panel de Jone'} <span>▾</span>
        </button>
      </div>
    )
  const go = (d: string | null) => {
    store.setDemoDate(d)
    nav('/')
  }
  return (
    <div className="demo">
      <button className="demotog" onClick={() => setOpen(false)}>
        ⚙ Prueba <span>▴</span>
      </button>
      <div className="seg">
        <button className={s.session.role === 'paciente' ? 'on' : ''} onClick={() => (store.setSession({ role: 'paciente' }), nav('/'))}>
          App paciente
        </button>
        <button className={s.session.role === 'jone' ? 'on' : ''} onClick={() => (store.setSession({ role: 'jone' }), nav('/'))}>
          Panel de Jone
        </button>
      </div>
      {s.session.role === 'paciente' && (
        <label>
          Ver como
          <select value={s.session.patientId ?? ''} onChange={(e) => (store.setSession({ patientId: e.target.value }), nav('/'))}>
            {s.data.patients.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {s.session.role === 'paciente' && p && (
        <div className="seg">
          {(['claro', 'oscuro'] as const).map((t) => (
            <button key={t} className={(p.settings.theme || 'auto') === t ? 'on' : ''} onClick={() => setPatientSetting(p.id, 'theme', t)}>
              {t === 'claro' ? 'Claro' : 'Oscuro'}
            </button>
          ))}
        </div>
      )}
      <label>
        Día simulado <input type="date" value={isoD(today)} onChange={(e) => go(e.target.value || null)} />
      </label>
      <button className="linkbtn" onClick={() => go(isoD(addD(monday(today), 4)))}>
        Ver viernes
      </button>
      <button className="linkbtn" onClick={() => go(isoD(addD(monday(today), 6)))}>
        Ver domingo
      </button>
      {s.demoDate && (
        <button className="linkbtn" onClick={() => go(null)}>
          Volver a hoy
        </button>
      )}
      <button
        className="linkbtn"
        onClick={() => {
          ;(backend as SampleBackend).reset()
          store.replaceData(sampleState())
          nav('/')
        }}
      >
        Reiniciar datos de ejemplo
      </button>
    </div>
  )
}
