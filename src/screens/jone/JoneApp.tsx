import { useState } from 'react'
import { useCtx } from '../../data/store'
import { accessOf, compliance, currentPhase, recovered, weekNo } from '../../domain/logic'
import { PHASES } from '../../domain/model'
import { fShort } from '../../domain/dates'
import { VideoLab } from './VideoLab'
import { Routines } from './Routines'
import { Programs } from './Programs'
import { Billing } from './Billing'
import { Method } from './Method'
import { TestSheet } from './TestSheet'
import { TaskList, VoiceButton } from './VoiceTask'
import { Logo } from '../../ui/icons'
import { PhaseBadge } from '../../ui/PhaseBadge'
import { useApplyTheme } from '../../ui/theme'
import { complianceTone } from '../../domain/scales'

const TABS: [string, string][] = [
  ['pacientes', 'Pacientes'],
  ['metodo', 'Método'],
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
  const [test, setTest] = useState<string | null>(null)
  const testFor = c.st.patients.find((x) => x.id === test)
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
      {!['videos', 'tareas', 'rutinas', 'programas', 'factura', 'metodo'].includes(tab) && (
        <section className="card">
          <p className="muted" style={{ margin: 0 }}>
            Tu panel llega en los bloques 3 y 4. Ya puedes probar: <b>Vídeos y clases</b>, <b>Rutinas</b>, <b>Programas</b>, <b>Facturación</b>, <b>Tareas</b> y el
            micrófono de abajo a la derecha para dictar tareas.
          </p>
        </section>
      )}
      {tab === 'videos' && <VideoLab />}
      {tab === 'tareas' && <TaskList />}
      {tab === 'rutinas' && <Routines />}
      {tab === 'programas' && <Programs />}
      {tab === 'factura' && <Billing />}
      {tab === 'metodo' && <Method />}
      {testFor && <TestSheet p={testFor} onClose={() => setTest(null)} />}
      <VoiceButton />
      {tab === 'pacientes' && (
        <div className="grid">
          {pts.map((p) => {
            const ph = currentPhase(p)
            const [pct, , sch] = compliance(c, p)
            return (
              <div key={p.id} className="pcard">
                <PhaseBadge p={p} size={56} />
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
                    {(() => {
                      const a = accessOf(c, p)
                      return a.ok ? (
                        <span className="pill">{a.until ? `App hasta el ${fShort(a.until)}` : 'App sin fecha de fin'}</span>
                      ) : (
                        <span className="pill lockpill">{a.reason === 'unpaid' ? 'App bloqueada: pago pendiente' : a.reason === 'expired' ? 'App caducada' : 'App en pausa'}</span>
                      )
                    })()}
                  </div>
                  <div className="stats">
                    <span>
                      Cumplimiento {sch ? <b className={`tchip t-${complianceTone(pct)}`}>{pct}%</b> : <b>–</b>}
                    </span>
                  </div>
                  {!recovered(p) && (
                    <button className="btn ghost small" style={{ marginTop: 10 }} onClick={() => setTest(p.id)}>
                      Apuntar tests de la fase {ph}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
