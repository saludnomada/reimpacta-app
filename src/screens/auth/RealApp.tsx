import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { store } from '../../data'
import { useStore } from '../../data/store'
import { sb, setAppMode } from '../../data/supabase'
import { SupabaseBackend } from '../../data/supabaseBackend'
import { Logo } from '../../ui/icons'
import { useApplyTheme } from '../../ui/theme'
import { JoneApp } from '../jone/JoneApp'
import { PatientApp } from '../patient/PatientApp'
import { Consent, Privacy } from './Consent'

type Phase = { k: 'checking' } | { k: 'login' } | { k: 'loading' } | { k: 'unknown'; email: string } | { k: 'ready' } | { k: 'error'; msg: string }

/** App de verdad: entrar con email → saber si es Jone o paciente → cargar sus datos de Supabase. */
export function RealApp() {
  const [ph, setPh] = useState<Phase>({ k: 'checking' })
  const s = useStore()

  useEffect(() => {
    let done = false
    const go = async () => {
      const { data } = await sb.auth.getSession()
      const u = data.session?.user
      if (!u) return setPh({ k: 'login' })
      if (done) return
      done = true
      setPh({ k: 'loading' })
      try {
        await sb.rpc('link_me') // si es paciente y entra por primera vez, se une a su ficha
        const staff = await sb.from('staff').select('user_id').eq('user_id', u.id).maybeSingle()
        const me = await sb.from('patients').select('id').eq('user_id', u.id).maybeSingle()
        if (staff.data) {
          store.backend = new SupabaseBackend({ role: 'jone', patientId: null })
          store.setSession({ role: 'jone' })
        } else if (me.data) {
          store.backend = new SupabaseBackend({ role: 'paciente', patientId: me.data.id })
          store.setSession({ role: 'paciente', patientId: me.data.id })
        } else return setPh({ k: 'unknown', email: u.email || '' })
        await store.init()
        setPh({ k: 'ready' })
      } catch (e) {
        done = false
        setPh({ k: 'error', msg: String((e as Error)?.message || e) })
      }
    }
    void go()
    const { data: sub } = sb.auth.onAuthStateChange((ev) => {
      if (ev === 'SIGNED_IN') void go()
      if (ev === 'SIGNED_OUT') location.href = '/'
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (location.pathname === '/privacidad') return <Privacy />
  if (ph.k === 'checking' || ph.k === 'loading') return <Wait />
  if (ph.k === 'login') return <Login />
  if (ph.k === 'unknown') return <Unknown email={ph.email} />
  if (ph.k === 'error') return <Problem msg={ph.msg} />
  if (!s.data) return <Wait />
  const p = s.data.patients.find((x) => x.id === s.session.patientId)
  return (
    <BrowserRouter>
      <SaveErrors />
      {s.session.role === 'jone' ? <JoneApp /> : p ? p.consentAt ? <PatientApp p={p} /> : <Consent p={p} /> : <Problem msg="No encuentro tu ficha." />}
    </BrowserRouter>
  )
}

function Brand() {
  return (
    <div className="brandm au-brand">
      <span className="mark">
        <Logo />
      </span>
      <span>REIMPACTA</span>
    </div>
  )
}
function Wait() {
  useApplyTheme('claro')
  return (
    <div className="phone au" aria-busy="true">
      <Brand />
      <p className="muted">Cargando…</p>
    </div>
  )
}

/** Entrar sin contraseña: te mando un código (o un enlace) a tu email. */
function Login() {
  useApplyTheme('claro')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const send = async () => {
    setBusy(true)
    setErr('')
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: location.origin } })
    setBusy(false)
    if (error) setErr(error.message.includes('rate') ? 'Has pedido varios códigos seguidos. Espera un minuto y vuelve a probar.' : 'No he podido enviar el email. Revisa que esté bien escrito.')
    else setSent(true)
  }
  const verify = async () => {
    setBusy(true)
    setErr('')
    const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setErr('Ese código no vale o ha caducado. Pide uno nuevo.')
  }
  return (
    <div className="phone au">
      <Brand />
      <section className="au-card">
        <h1 className="x-title">{sent ? 'Revisa tu email' : 'Entra en tu app'}</h1>
        {!sent ? (
          <>
            <p>Escribe tu email y te mando un código para entrar. Sin contraseñas.</p>
            <input className="au-in" type="email" inputMode="email" autoComplete="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && email.includes('@') && send()} />
            <button className="x-cta" disabled={!email.includes('@') || busy} onClick={send}>
              {busy ? 'Enviando…' : 'Enviarme el código'}
            </button>
          </>
        ) : (
          <>
            <p>
              Te he mandado un email a <b>{email}</b>. Escribe aquí el código que viene dentro, o toca el enlace del email.
            </p>
            <input className="au-in au-code" inputMode="numeric" autoComplete="one-time-code" placeholder="Código" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))} onKeyDown={(e) => e.key === 'Enter' && code.length >= 6 && verify()} />
            <button className="x-cta" disabled={code.length < 6 || busy} onClick={verify}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
            <button className="se-ghost" onClick={() => (setSent(false), setCode(''))}>
              Cambiar el email o pedir otro código
            </button>
          </>
        )}
        {err && <p className="au-err">{err}</p>}
      </section>
      <button className="au-demo" onClick={() => setAppMode('ejemplo')}>
        Ver la demostración con pacientes de ejemplo
      </button>
    </div>
  )
}

function Unknown({ email }: { email: string }) {
  useApplyTheme('claro')
  const [copied, setCopied] = useState(false)
  const sql = `insert into public.staff (user_id) select id from auth.users where email = '${email}' on conflict do nothing;`
  return (
    <div className="phone au">
      <Brand />
      <section className="au-card">
        <h1 className="x-title">Aún no estás dado de alta</h1>
        <p>
          Has entrado como <b>{email}</b>, pero no encuentro tu programa. Escríbeme por WhatsApp para que lo revise.
        </p>
        <button className="se-ghost" onClick={() => sb.auth.signOut()}>
          Salir y probar con otro email
        </button>
      </section>
      <details className="au-admin">
        <summary>¿Eres Jone?</summary>
        <p>Para que este email sea el tuyo de administradora, pega esta línea en Supabase → SQL Editor → Run, y luego recarga esta página:</p>
        <code>{sql}</code>
        <button className="se-ghost" onClick={() => navigator.clipboard?.writeText(sql).then(() => setCopied(true))}>
          {copied ? 'Copiada' : 'Copiar la línea'}
        </button>
      </details>
    </div>
  )
}

function Problem({ msg }: { msg: string }) {
  useApplyTheme('claro')
  return (
    <div className="phone au">
      <Brand />
      <section className="au-card">
        <h1 className="x-title">Algo no ha ido bien</h1>
        <p>No he podido cargar tus datos. Revisa tu conexión y vuelve a intentarlo.</p>
        <small className="muted">{msg}</small>
        <button className="x-cta" onClick={() => location.reload()}>
          Volver a intentarlo
        </button>
        <button className="se-ghost" onClick={() => sb.auth.signOut()}>
          Salir
        </button>
      </section>
    </div>
  )
}

/** Aviso discreto si algo no se ha guardado */
function SaveErrors() {
  const [err, setErr] = useState('')
  useEffect(() => {
    const on = (e: Event) => setErr((e as CustomEvent).detail || 'error')
    window.addEventListener('reimpacta-error', on)
    return () => window.removeEventListener('reimpacta-error', on)
  }, [])
  if (!err) return null
  return (
    <div className="au-toast" role="alert" onClick={() => setErr('')}>
      No se ha podido guardar el último cambio. Revisa tu conexión.
    </div>
  )
}
