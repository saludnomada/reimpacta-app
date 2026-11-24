import type { AppState } from '../domain/model'
import type { Backend } from './backend'
import { sampleState } from './sample'

const KEY = 'reimpacta-ejemplo-v5'

/** Backend de ejemplo: datos inventados guardados solo en este navegador. */
export class SampleBackend implements Backend {
  readonly name = 'ejemplo'
  private timer: ReturnType<typeof setTimeout> | undefined

  async load(): Promise<AppState> {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) return JSON.parse(raw) as AppState
    } catch {
      /* navegador sin almacenamiento: empezamos de cero */
    }
    return sampleState()
  }

  async persist(_op: unknown, state: AppState): Promise<void> {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state))
      } catch {
        /* sin almacenamiento: los cambios duran hasta cerrar la pestaña */
      }
    }, 300)
  }

  reset() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* nada que borrar */
    }
  }
}
