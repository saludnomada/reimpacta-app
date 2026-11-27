import { getStore, useStore } from '../data/store'

/** Franja cuando Jone está viendo la app de un paciente desde su panel */
export function PreviewBar() {
  const s = useStore()
  if (!s.session.preview) return null
  const p = s.data?.patients.find((x) => x.id === s.session.patientId)
  return (
    <div className="pv-bar" role="status">
      <span>
        Estás viendo la app de <b>{p?.name}</b>. Lo que toques se guarda en su ficha.
      </span>
      <button onClick={() => getStore().setSession({ role: 'jone', preview: false })}>Volver a mi panel</button>
    </div>
  )
}
