// CAPA DE DATOS
// Las pantallas nunca hablan directamente con la base de datos: llaman a las
// "acciones" (src/data/actions.ts), que cambian el estado al instante y luego
// avisan al "backend" para que lo guarde por detrás.
//
// Hoy existe el backend de EJEMPLO (guarda en este navegador).
// Cuando Jone cree Supabase, se añade SupabaseBackend con la misma forma
// y se cambia una sola línea en src/data/index.ts.

import type { AppState } from '../domain/model'

/** Cada cambio que hace la app, descrito para que el backend sepa qué guardar. */
export type Op =
  | { kind: 'patient'; patientId: string } // algo de la ficha o del día a día de un paciente
  | { kind: 'library' } // vídeos, rutinas, programas, ajustes del método
  | { kind: 'jone' } // tareas, checklist, notas, pagos, ajustes de Jone
  | { kind: 'bookings' }

export interface Backend {
  readonly name: string
  load(): Promise<AppState>
  persist(op: Op, state: AppState): Promise<void>
}
