import { useNavigate } from 'react-router-dom'
import { setPatientSetting } from '../../data/actions'
import type { Patient } from '../../domain/model'
import type { ThemeChoice } from '../../ui/theme'

const OPTS: [ThemeChoice, string, string][] = [
  ['claro', 'Claro', '#F3F5EF'],
  ['oscuro', 'Oscuro', '#0A140D'],
  ['auto', 'Como mi móvil', 'linear-gradient(90deg,#F3F5EF 50%,#0A140D 50%)'],
]

/** AJUSTES (de momento: el fondo; el resto llega en el bloque 2) */
export function Settings({ p }: { p: Patient }) {
  const nav = useNavigate()
  const cur = p.settings.theme || 'claro'
  return (
    <div className="phone">
      <div className="sbar">
        <button className="back" onClick={() => nav(-1)}>
          ‹ Volver
        </button>
        <h2>Ajustes</h2>
      </div>
      <section className="card">
        <span className="lbl">Fondo de la app</span>
        <div className="t-pick">
          {OPTS.map(([k, l, bg]) => (
            <button key={k} className={cur === k ? 'on' : ''} aria-pressed={cur === k} onClick={() => setPatientSetting(p.id, 'theme', k)}>
              <span className="t-sw" style={{ background: bg, boxShadow: 'inset 0 0 0 1px var(--line)' }} />
              {l}
            </button>
          ))}
        </div>
      </section>
      <section className="card">
        <p className="muted" style={{ margin: 0 }}>
          Los avisos, tu corredor/a y el resto de ajustes llegan en el bloque 2.
        </p>
      </section>
    </div>
  )
}
