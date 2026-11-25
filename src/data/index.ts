import type { Backend } from './backend'
import { SampleBackend } from './sampleBackend'
import { setStore, Store } from './store'
import { appMode } from './supabase'

/** "real" = Supabase (pacientes de verdad) · "ejemplo" = datos inventados en este navegador */
export const mode = appMode()

/** En modo real el backend se pone al entrar (cuando ya sabemos si es Jone o un paciente). */
class NotYet implements Backend {
  readonly name = 'pendiente'
  async load(): Promise<never> {
    throw new Error('Sin sesión')
  }
  async persist() {}
}

const backend: Backend = mode === 'ejemplo' ? new SampleBackend() : new NotYet()
export const store = setStore(new Store(backend, { role: 'paciente', patientId: null }))
export { backend }
