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
export function setExerciseVideo(pid: string, day: string, i: number, file: { name: string; size: number; path?: string } | null) {
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

/** Guardar la salida a correr (km y minutos) y marcar la sesión como hecha */
export function saveRun(pid: string, day: string, km: number | undefined, min: number | undefined) {
  withSession(pid, day, (s) => {
    const now = getStore().now()
    if (!s.startedAt) s.startedAt = now
    s.run = { km, min, source: 'manual' }
    s.ex.forEach((e) => (e.done = true))
    s.elapsed = min ? min * 6e4 : now - s.startedAt
    s.status = 'done'
  })
}

/** Comentario de la sesión de ese día (dudas, cómo ha ido) */
export function setSessionComment(pid: string, day: string, comment: string) {
  withSession(pid, day, (s) => {
    s.comment = comment
  })
}

/* ---------- TAREAS DE JONE ---------- */
export function addTask(text: string, patient: string | null = null, src?: 'voz') {
  getStore().change({ kind: 'jone' }, (d) => {
    d.tasks.unshift({ id: Math.random().toString(36).slice(2, 10), text, patient, due: null, done: false, src })
  })
}
export function toggleTask(id: string) {
  getStore().change({ kind: 'jone' }, (d) => {
    const t = d.tasks.find((x) => x.id === id)
    if (t) t.done = !t.done
  })
}

/* ---------- BIBLIOTECA ---------- */
import type { Video } from '../domain/model'
export function updateVideo(id: string, patch: Partial<Video>) {
  getStore().change({ kind: 'library' }, (d) => {
    const v = d.videos.find((x) => x.id === id)
    if (v) Object.assign(v, patch)
    else d.videos.push({ id, title: '', url: '', keywords: [], type: 'reps', week: null, vis: 'visible', ...patch })
  })
}

/* ---------- RUTINAS Y PROGRAMAS ---------- */
import type { Program, Routine } from '../domain/model'
export const newId = (p: string) => p + Math.random().toString(36).slice(2, 8)
export function saveRoutine(r: Routine) {
  getStore().change({ kind: 'library' }, (d) => {
    const i = d.routines.findIndex((x) => x.id === r.id)
    if (i >= 0) d.routines[i] = r
    else d.routines.push(r)
  })
}
export function deleteRoutine(id: string) {
  getStore().change({ kind: 'library' }, (d) => {
    d.routines = d.routines.filter((x) => x.id !== id)
  })
}
export function saveProgram(pr: Program) {
  getStore().change({ kind: 'library' }, (d) => {
    const i = d.programs.findIndex((x) => x.id === pr.id)
    if (i >= 0) d.programs[i] = pr
    else d.programs.push(pr)
  })
}

/* ---------- PAGOS Y ACCESO ---------- */
export function setPaid(pid: string, i: number, paid: boolean) {
  getStore().change({ kind: 'patient', patientId: pid }, (d) => {
    const p = d.patients.find((x) => x.id === pid)
    if (p?.pay) p.pay.paid[i] = paid
  })
}
export function setAccess(pid: string, patch: { until?: string; paused?: boolean }) {
  getStore().change({ kind: 'patient', patientId: pid }, (d) => {
    const p = d.patients.find((x) => x.id === pid)
    if (p) p.access = { ...p.access, ...patch }
  })
}

/* ---------- MÉTODO ---------- */
import type { InjuryKey, PhaseMethod, ProtoPhase, TestResult } from '../domain/model'
export function saveMethod(phase: number, m: PhaseMethod, tests: string[], goals: string[]) {
  getStore().change({ kind: 'library' }, (d) => {
    d.method = { ...(d.method || {}), [phase]: m }
    d.phaseTests[phase] = tests
    d.defaultGoals[phase] = goals
  })
}
/** Apunta el resultado de un test. Si lo supera, en su app sale como "Superado" en esa fase. */
export function addTestResult(pid: string, phase: number, testId: string, r: TestResult) {
  getStore().change({ kind: 'patient', patientId: pid }, (d) => {
    const p = d.patients.find((x) => x.id === pid)
    if (!p) return
    p.testResults = p.testResults || {}
    ;(p.testResults[testId] = p.testResults[testId] || []).push(r)
    const rec = (p.recs[phase] = p.recs[phase] || { tests: [], files: [], at: null })
    if (!rec.tests.includes(testId)) rec.tests.push(testId)
  })
}
/** Jone decide: superado o todavía no (es lo único que ve el paciente) */
export function approveTest(pid: string, phase: number, testId: string, ok: boolean | null) {
  getStore().change({ kind: 'patient', patientId: pid }, (d) => {
    const p = d.patients.find((x) => x.id === pid)
    if (!p) return
    const rec = (p.recs[phase] = p.recs[phase] || { tests: [], files: [], at: null })
    const passed = { ...(rec.passed || {}) }
    if (ok == null) delete passed[testId]
    else passed[testId] = ok
    rec.passed = passed
  })
}
/** Guardar una fase del protocolo de una lesión */
export function saveProtocolPhase(injury: InjuryKey, phase: number, data: ProtoPhase) {
  getStore().change({ kind: 'library' }, (d) => {
    d.protocols = d.protocols || {}
    d.protocols[injury] = { ...(d.protocols[injury] || {}), [phase]: data }
  })
}

/* ---------- ALTA DE PACIENTES ---------- */
export function addPatient(p: Patient) {
  getStore().change({ kind: 'patient', patientId: p.id }, (d) => {
    d.patients.push(p)
  })
}

/** Guarda varios vídeos de una vez (importar de YouTube, etiquetar en bloque) */
export function saveVideos(list: Video[]) {
  if (!list.length) return
  getStore().change({ kind: 'library' }, (d) => {
    const byId = new Map(d.videos.map((v, i) => [v.id, i]))
    list.forEach((v) => {
      const i = byId.get(v.id)
      if (i != null) d.videos[i] = v
      else d.videos.push(v)
    })
  })
}
