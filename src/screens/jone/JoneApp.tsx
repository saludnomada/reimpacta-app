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
import { Lab } from './Lab'
import { NewPatient } from './NewPatient'
import { Inbox } from './Inbox'
import { mode } from '../../data'
import { sb, setAppMode } from '../../data/supabase'
import { TestSheet } from './TestSheet'
import { TaskList, VoiceButton } from './VoiceTask'
import { IcMoon, IcSun, Logo } from '../../ui/icons'
import { getStore } from '../../data/store'
import { PhaseBadge } from '../../ui/PhaseBadge'
import { useApplyTheme } from '../../ui/theme'
import { complianceTone } from '../../domain/scales'

const TABS: [string, string][] = [
  ['pacientes', 'Pacientes'],
  ['metodo', 'Método'],
  ['lab', 'Laboratorio'],
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
  // tu panel: claro u oscuro, lo eliges tú (se recuerda en este dispositivo)
  const [tema, setTema] = useState<'claro' | 'oscuro'>(() => {
    try {
      return localStorage.getItem('reimpacta-panel-tema') === 'oscuro' ? 'oscuro' : 'claro'
    } catch {
      return 'claro'
    }
  })
  useApplyTheme(tema)
  const toggleTema = () => {
    const t = tema === 'claro' ? 'oscuro' : 'claro'
    setTema(t)
    try {
      localStorage.setItem('reimpacta-panel-tema', t)
    } catch {
      /* sin almacenamiento */
    }
  }
  const c = useCtx()
  const [tab, setTab] = useState('pacientes')
  const [test, setTest] = useState<string | null>(null)
  const [newP, setNewP] = useState(false)
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
        <div className="atools">
          {mode === 'real' && (
            <button className="btn ghost small" onClick={() => setAppMode('ejemplo')} title="Ver la app con pacientes de ejemplo">
              Demostración
            </button>
          )}
          <button className="icon-btn" onClick={toggleTema} aria-label={tema === 'claro' ? 'Pasar a modo oscuro' : 'Pasar a modo claro'} title={tema === 'claro' ? 'Modo oscuro' : 'Modo claro'}>
            {tema === 'claro' ? <IcMoon /> : <IcSun />}
          </button>
          {mode === 'real' && (
            <button className="btn ghost small" onClick={() => sb.auth.signOut()}>
              Salir
            </button>
          )}
        </div>
      </div>
      <div className="ahead">
        <div>
          <span className="lbl">Hola, Jone</span>
          <h1>{tab === 'pacientes' ? 'Tus pacientes' : TABS.find((t) => t[0] === tab)![1]}</h1>
        </div>
        <div className="row">
          {tab === 'pacientes' && (
            <button className="btn small" onClick={() => setNewP(true)}>
              + Nuevo paciente
            </button>
          )}
        </div>
      </div>
      {newP && <NewPatient onClose={() => setNewP(false)} />}
      {tab === 'pacientes' && pts.length > 0 && <Inbox />}
      {tab === 'pacientes' && !pts.length && (
        <section className="card">
          <p style={{ margin: 0 }}>Aún no tienes pacientes. Pulsa <b>+ Nuevo paciente</b>: con su email podrá entrar en la app.</p>
        </section>
      )}
      {['agenda', 'ajustes'].includes(tab) && (
        <section className="card">
          <p className="muted" style={{ margin: 0 }}>
            Próximamente.
          </p>
        </section>
      )}
      {tab === 'videos' && <VideoLab />}
      {tab === 'tareas' && <TaskList />}
      {tab === 'rutinas' && <Routines />}
      {tab === 'programas' && <Programs />}
      {tab === 'factura' && <Billing />}
      {tab === 'metodo' && <Method />}
      {tab === 'lab' && <Lab />}
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
                  <div className="row" style={{ marginTop: 10 }}>
                    {!recovered(p) && (
                      <button className="btn ghost small" onClick={() => setTest(p.id)}>
                        Apuntar tests de la fase {ph}
                      </button>
                    )}
                    <button className="btn ghost small" onClick={() => getStore().setSession({ role: 'paciente', patientId: p.id, preview: true })}>
                      Ver su app
                    </button>
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
