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

/* ---------- SESIÓN ---------- */
// Igual que en el prototipo: la sesión se abre "en vista previa" y arranca sola
// en cuanto apuntan algo (o a los 2 minutos). Si salen más de 5 min, queda a medias.

import { isoD as _iso, parseD as _parse } from '../domain/dates'
import { routineFor } from '../domain/logic'
import type { AppState, Patient, SessionLog } from '../domain/model'

function withSession(patientId: string, day: string, fn: (s: SessionLog, p: Patient, d: AppState) => void) {
  const st = getStore()
  st.change({ kind: 'patient', patientId }, (d) => {
    const p = d.patients.find((x) => x.id === patientId)
    if (!p) return
    const r = routineFor({ st: d, today: st.today(), now: st.now() }, p, _parse(day))
    if (!r) return
    let s = p.sessions[day]
    if (!s) s = p.sessions[day] = { status: 'preview', previewSince: st.now(), ex: [] }
    // asegurar que hay una fila por ejercicio y por serie
    r.items.forEach((it, i) => {
      const e = s.ex[i] || (s.ex[i] = { done: false, pain: null, lvl: null, sets: [] })
      const n = it.kind === 'caco' ? 0 : it.sets
      while (e.sets.length < n) e.sets.push({ v: '', kg: '' })
      e.sets.length = n
    })
    s.ex.length = r.items.length
    fn(s, p, d)
  })
}
const start = (s: SessionLog) => {
  const now = getStore().now()
  if (s.status === 'preview') {
    s.status = 'active'
    s.startedAt = now
  } else if (s.status === 'partial') {
    s.status = 'active'
    s.startedAt = now - (s.elapsed || 0)
  }
}
const refreshDone = (s: SessionLog, i: number) => {
  const e = s.ex[i]
  if (e.sets.length) e.done = e.sets.every((x) => String(x.v).trim() !== '')
}

export const openSession = (pid: string, day: string) => withSession(pid, day, () => {})

export function setSetValue(pid: string, day: string, i: number, j: number, field: 'v' | 'kg', value: string) {
  withSession(pid, day, (s) => {
    start(s)
    s.ex[i].sets[j][field] = value
    refreshDone(s, i)
  })
}
/** ✓ de una serie: la marca como hecha tal como estaba pautada (o la vacía si ya estaba) */
export function tickSet(pid: string, day: string, i: number, j: number) {
  withSession(pid, day, (s, p, d) => {
    start(s)
    const r = routineFor({ st: d, today: getStore().today(), now: 0 }, p, _parse(day))!
    const it = r.items[i]
    const x = s.ex[i].sets[j]
    if (String(x.v).trim()) {
      x.v = ''
      x.kg = ''
    } else if (it.kind !== 'caco') {
      x.v = String(it.amount)
      if (!x.kg && it.kg) x.kg = String(it.kg)
    }
    refreshDone(s, i)
  })
}
export function toggleExerciseDone(pid: string, day: string, i: number) {
  withSession(pid, day, (s) => {
    start(s)
    s.ex[i].done = !s.ex[i].done
  })
}
export function setPain(pid: string, day: string, i: number, pain: boolean | null, lvl: number | null = null) {
  withSession(pid, day, (s) => {
    start(s)
    s.ex[i].pain = pain
    s.ex[i].lvl = pain ? lvl : null
  })
}
export function setExerciseComment(pid: string, day: string, i: number, comment: string) {
  withSession(pid, day, (s) => {
    s.ex[i].comment = comment
  })
}
export function setExerciseVideo(pid: string, day: string, i: number, file: { name: string; size: number } | null) {
  withSession(pid, day, (s) => {
    start(s)
    if (file) s.ex[i].video = file
    else delete s.ex[i].video
  })
}
export function finishSession(pid: string, day: string) {
  withSession(pid, day, (s) => {
    const now = getStore().now()
    if (s.status !== 'active') {
      s.status = 'active'
      s.startedAt = s.startedAt || now
    }
    s.elapsed = now - (s.startedAt || now)
    s.status = 'done'
  })
}
export function setSessionPain(pid: string, day: string, v: number, comment?: string) {
  withSession(pid, day, (s) => {
    s.painSession = v
    if (comment !== undefined) s.comment = comment
  })
}
/** Al salir de la sesión sin terminar: queda "a medias" (o se borra si no apuntó nada) */
export function leaveSession(pid: string, day: string) {
  const st = getStore()
  st.change({ kind: 'patient', patientId: pid }, (d) => {
    const p = d.patients.find((x) => x.id === pid)
    const s = p?.sessions[day]
    if (!p || !s) return
    if (s.status === 'preview' && !s.ex.some((e) => e.done || e.pain != null || e.sets.some((x) => String(x.v).trim()))) delete p.sessions[day]
    else if (s.status === 'active') {
      s.elapsed = st.now() - (s.startedAt || st.now())
      s.status = s.ex.every((e) => e.done) ? 'done' : 'partial'
    }
  })
}
export const todayISO = () => _iso(getStore().today())
