import { setAccess, setPaid } from '../../data/actions'
import { useCtx } from '../../data/store'
import { addD, fShort, isoD } from '../../domain/dates'
import { accessOf, PAY_GRACE, payPlan } from '../../domain/logic'
import { PLANS } from '../../domain/model'

const eur = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' €'
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** FACTURACIÓN: control de cobros por plazos y acceso a la app. (Las facturas legales llegan en la fase 2.) */
export function Billing() {
  const c = useCtx()
  const t = c.today
  const all = c.st.patients.flatMap((p) => payPlan(p).map((x) => ({ ...x, p })))
  const sameMonth = (d: Date) => d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
  const late = all.filter((x) => !x.paid && addD(x.due, PAY_GRACE) < t)
  const month = all.filter((x) => sameMonth(x.due))
  const paidMonth = month.filter((x) => x.paid).reduce((a, x) => a + x.amount, 0)
  const pendMonth = month.filter((x) => !x.paid).reduce((a, x) => a + x.amount, 0)
  const lateSum = late.reduce((a, x) => a + x.amount, 0)
  const next = all
    .filter((x) => !x.paid && x.due >= addD(t, -PAY_GRACE))
    .sort((a, b) => +a.due - +b.due)
    .slice(0, 8)

  return (
    <div className="jl">
      <div className="bi-kpis">
        <div>
          <span>Cobrado en {MONTHS[t.getMonth()]}</span>
          <b className="ok">{eur(paidMonth)}</b>
        </div>
        <div>
          <span>Por cobrar este mes</span>
          <b>{eur(pendMonth)}</b>
        </div>
        <div>
          <span>Vencido (app bloqueada)</span>
          <b className={late.length ? 'bad' : ''}>{eur(lateSum)}</b>
          <small>
            {late.length} {late.length === 1 ? 'plazo' : 'plazos'}
          </small>
        </div>
      </div>

      {late.length > 0 && (
        <section className="card bi-late">
          <span className="lbl">Pagos vencidos</span>
          {late.map((x) => (
            <div key={x.p.id + x.i} className="bi-line">
              <span>
                <b>{x.p.name}</b> · plazo {x.i + 1} de {x.p.pay!.n} · venció el {fShort(x.due)}
              </span>
              <b>{eur(x.amount)}</b>
              <button className="btn small" onClick={() => setPaid(x.p.id, x.i, true)}>
                Marcar pagado
              </button>
            </div>
          ))}
          <p className="muted" style={{ margin: 0 }}>
            Al marcarlo pagado, su app se desbloquea al momento.
          </p>
        </section>
      )}

      <section className="card">
        <span className="lbl">Próximos cobros</span>
        {next.length ? (
          next.map((x) => (
            <div key={x.p.id + x.i} className="bi-line">
              <span>
                <b>{x.p.name}</b> · plazo {x.i + 1} de {x.p.pay!.n} · {fShort(x.due)}
              </span>
              <b>{eur(x.amount)}</b>
              <button className="btn ghost small" onClick={() => setPaid(x.p.id, x.i, true)}>
                Marcar pagado
              </button>
            </div>
          ))
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No hay cobros pendientes.
          </p>
        )}
      </section>

      <section className="card">
        <span className="lbl">Pacientes</span>
        <div className="bi-table">
          <div className="bi-row head">
            <span>Paciente</span>
            <span>Plan</span>
            <span>Plazos (toca para marcar)</span>
            <span>App</span>
          </div>
          {c.st.patients.map((p) => {
            const plan = payPlan(p)
            const a = accessOf(c, p)
            return (
              <div key={p.id} className="bi-row">
                <span>
                  <b>{p.name}</b>
                </span>
                <span className="muted">
                  {p.pay ? PLANS[p.pay.plan][0] : '–'}
                  {p.pay && <small>{eur(p.pay.price)}</small>}
                </span>
                <span className="bi-plazos">
                  {plan.map((x) => {
                    const st = x.paid ? 'paid' : addD(x.due, PAY_GRACE) < t ? 'late' : 'pend'
                    return (
                      <button key={x.i} className={`bi-pz ${st}`} onClick={() => setPaid(p.id, x.i, !x.paid)} title={x.paid ? 'Pagado: toca para desmarcar' : 'Toca para marcar pagado'}>
                        <b>{eur(x.amount)}</b>
                        <small>{x.paid ? 'Pagado' : st === 'late' ? 'Vencido' : fShort(x.due)}</small>
                      </button>
                    )
                  })}
                </span>
                <span className="bi-app">
                  <em className={`pill ${a.ok ? 'ok' : 'red'}`}>
                    {a.ok ? 'Activa' : a.reason === 'unpaid' ? 'Bloqueada · pago' : a.reason === 'expired' ? 'Caducada' : 'En pausa'}
                  </em>
                  <label>
                    <small>Hasta</small>
                    <input type="date" value={a.until ? isoD(a.until) : ''} onChange={(e) => setAccess(p.id, { until: e.target.value || undefined })} />
                  </label>
                  <button className="btn ghost small" onClick={() => setAccess(p.id, { paused: !p.access?.paused })}>
                    {p.access?.paused ? 'Reactivar' : 'Pausar'}
                  </button>
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Aquí controlas quién ha pagado. Las facturas legales (con Verifactu) llegan en la fase 2. Si un plazo pasa {PAY_GRACE} días sin pagar, su
        app se bloquea sola.
      </p>
    </div>
  )
}
