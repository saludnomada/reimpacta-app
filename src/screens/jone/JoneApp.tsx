import { useState } from 'react'
import { useCtx } from '../../data/store'
import { compliance, currentPhase, recovered, weekNo } from '../../domain/logic'
import { PHASES } from '../../domain/model'
import { Logo } from '../../ui/icons'
import { Sprite } from '../../ui/Sprite'
import { useApplyTheme } from '../../ui/theme'
import { complianceTone } from '../../domain/scales'

const TABS: [string, string][] = [
  ['pacientes', 'Pacientes'],
  ['tareas', 'Tareas'],
  ['videos', 'Vídeos y clases'],
  ['rutinas', 'Rutinas'],
  ['programas', 'Programas'],
  ['factura', 'Facturación'],
  ['agenda', 'Agenda'],
  ['ajustes', 'Grabaciones y fases'],
]

/** Panel de Jone. En el bloque 1 solo el esqueleto: el contenido llega en los bloques 3 y 4. */
export function JoneApp() {
  useApplyTheme('oscuro') // tu panel, siempre en oscuro
  const c = useCtx()
  const [tab, setTab] = useState('pacientes')
  // de menos a más semanas
  const pts = c.st.patients.slice().sort((a, b) => b.start.localeCompare(a.start) || a.name.localeCompare(b.name))
  return (
    <div className="admin">
      <div className="atop">
        <div className="brand">
          <i>
            <Logo />
          </i>
          REIMPACTA · PANEL
        </div>
        <div className="atabs">
          {TABS.map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="ahead">
        <div>
          <span className="lbl">Hola, Jone</span>
          <h1>{tab === 'pacientes' ? 'Tus pacientes' : TABS.find((t) => t[0] === tab)![1]}</h1>
        </div>
      </div>
      <section className="card">
        <p className="muted" style={{ margin: 0 }}>
          Tu panel llega en los bloques 3 y 4: alertas, checklist, fichas, tareas, biblioteca rápida, rutinas y programas. De momento puedes ver
          a tus pacientes de ejemplo.
        </p>
      </section>
      {tab === 'pacientes' && (
        <div className="grid">
          {pts.map((p) => {
            const ph = currentPhase(p)
            const [pct, , sch] = compliance(c, p)
            return (
              <div key={p.id} className="pcard">
                <Sprite look={p.look} zone={recovered(p) ? null : p.zone} scale={2.4} anim={false} />
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <h3>{p.name}</h3>
                    <span className="mono" style={{ fontSize: 11.5, color: 'var(--dim)' }}>
                      SEM {weekNo(c, p)}
                    </span>
                  </div>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {p.injury}
                  </span>
                  <div className="minibar">
                    {[1, 2, 3, 4, 5].map((f) => (
                      <i key={f} className={f <= p.done ? 'ok' : f === ph && !recovered(p) ? 'cur' : ''} />
                    ))}
                  </div>
                  <div className="row" style={{ marginTop: 8, gap: 5 }}>
                    <span className="pill ph">{recovered(p) ? 'Recuperado/a' : `F${ph} · ${PHASES[ph - 1]}`}</span>
                  </div>
                  <div className="stats">
                    <span>
                      Cumplimiento {sch ? <b className={`tchip t-${complianceTone(pct)}`}>{pct}%</b> : <b>–</b>}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
