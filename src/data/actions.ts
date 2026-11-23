// ACCIONES: todo lo que la app puede cambiar. Cambian el estado al instante
// y el backend (ejemplo hoy, Supabase mañana) lo guarda por detrás.

import type { PatientSettings } from '../domain/model'
import { getStore } from './store'

export function setPatientSetting<K extends keyof PatientSettings>(patientId: string, key: K, value: PatientSettings[K]) {
  getStore().change({ kind: 'patient', patientId }, (d) => {
    const p = d.patients.find((x) => x.id === patientId)
    if (p) p.settings[key] = value
  })
}
