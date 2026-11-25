import { useState } from 'react'
import { getStore } from '../../data/store'
import { sb } from '../../data/supabase'
import type { Patient } from '../../domain/model'
import { Logo } from '../../ui/icons'
import { useApplyTheme } from '../../ui/theme'

/** Consentimiento explícito la primera vez (datos de salud, RGPD). Sin marcarlo no se entra. */
export function Consent({ p }: { p: Patient }) {
  useApplyTheme('claro')
  const [ok, setOk] = useState(false)
  const accept = () =>
    getStore().change({ kind: 'patient', patientId: p.id }, (d) => {
      const x = d.patients.find((y) => y.id === p.id)
      if (x) x.consentAt = new Date().toISOString()
    })
  return (
    <div className="phone au">
      <div className="brandm au-brand">
        <span className="mark">
          <Logo />
        </span>
        <span>REIMPACTA</span>
      </div>
      <section className="au-card">
        <h1 className="x-title">Hola, {p.name}</h1>
        <p>
          Antes de empezar: en esta app guardo lo que necesito para guiar tu recuperación. Tus sesiones, el dolor que marcas, tus cuestionarios,
          los vídeos que me envías y tus tests. Son datos de salud y solo los vemos tú y yo.
        </p>
        <ul className="au-list">
          <li>Se guardan en servidores de la Unión Europea.</li>
          <li>No se los cedo a nadie ni los uso para publicidad.</li>
          <li>Puedes pedirme verlos, corregirlos o borrarlos cuando quieras.</li>
        </ul>
        <label className="au-check">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
          <span>
            He leído la{' '}
            <a href="/privacidad" target="_blank" rel="noopener">
              política de privacidad
            </a>{' '}
            y doy mi consentimiento explícito para que se traten mis datos de salud con este fin.
          </span>
        </label>
        <button className="x-cta" disabled={!ok} onClick={accept}>
          Empezar
        </button>
        <button className="se-ghost" onClick={() => sb.auth.signOut()}>
          Ahora no
        </button>
      </section>
    </div>
  )
}

/** BORRADOR de la política de privacidad: pendiente de revisión por un asesor. */
export function Privacy() {
  useApplyTheme('claro')
  return (
    <div className="phone au au-legal">
      <h1 className="x-title">Política de privacidad</h1>
      <p className="au-draft">Borrador pendiente de revisión.</p>
      <h2>Quién trata tus datos</h2>
      <p>Jone Agirre, fisioterapeuta (Salud Nómada · Método REIMPACTA®).</p>
      <h2>Qué datos y para qué</h2>
      <p>
        Tu nombre, email, lesión, programa de ejercicios, el registro de tus sesiones (incluido el dolor), los cuestionarios semanales, los
        vídeos que envías, los resultados de tus tests y tus pagos. Los uso solo para guiar y hacer seguimiento de tu recuperación y gestionar
        tu acceso a la app.
      </p>
      <h2>Base legal</h2>
      <p>Tu consentimiento explícito y la prestación del servicio de fisioterapia que has contratado.</p>
      <h2>Dónde se guardan</h2>
      <p>En servidores de la Unión Europea (Supabase, Frankfurt), con acceso restringido: cada paciente solo puede ver lo suyo.</p>
      <h2>Cuánto tiempo</h2>
      <p>Mientras dure el programa y después, el tiempo que obliga la ley para la documentación clínica (como mínimo 5 años desde el alta).</p>
      <h2>Tus derechos</h2>
      <p>
        Puedes pedir ver, corregir o borrar tus datos, limitar su uso, llevártelos o retirar tu consentimiento escribiéndome. Si crees que no se
        han respetado, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).
      </p>
    </div>
  )
}
