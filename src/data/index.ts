import { SampleBackend } from './sampleBackend'
import { setStore, Store } from './store'

// ÚNICA línea que cambiará al conectar Supabase:
//   const backend = new SupabaseBackend(...)
const backend = new SampleBackend()

export const store = setStore(new Store(backend, { role: 'paciente', patientId: null }))
export { backend }
