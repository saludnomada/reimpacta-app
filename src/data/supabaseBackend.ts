// BACKEND REAL: guarda y carga de Supabase. Misma forma que el de ejemplo,
// así que las pantallas no cambian. Reparte cada paciente en dos partes:
//   · ficha (la escribe Jone): nombre, programa, pagos, acceso, fases, hitos, tests…
//   · diario (lo escribe el paciente): sesiones, viernes, grabaciones, ajustes, consentimiento.
// Las notas de Jone van aparte y los pacientes no las pueden leer.

import type { AppState, Patient } from '../domain/model'
import type { Backend, Op } from './backend'
import { sampleState } from './sample'
import { sb } from './supabase'
import { protocolsSeed } from '../domain/protocols'

export interface Who {
  role: 'jone' | 'paciente'
  patientId: string | null
}

const LIB_KEYS = ['videos', 'routines', 'programs', 'method', 'protocols', 'labVideos', 'phaseTests', 'defaultGoals', 'recFixed', 'whatsapp', 'calLink'] as const
const JONE_KEYS = ['tasks', 'tasksDone', 'painOv', 'myEmail'] as const
const LOG_KEYS = ['sessions', 'fridays', 'recs', 'settings', 'introSeen', 'medalsSeen', 'consentAt', 'labFiles', 'mediaOk'] as const

type Json = Record<string, unknown>
const pick = (o: object, keys: readonly string[]) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, (o as Json)[k]]))

/** Paciente → ficha + diario (lo de "superado" de cada test lo decide Jone: va en la ficha) */
export function splitPatient(p: Patient) {
  const log = pick(p, LOG_KEYS) as Json
  const recs = structuredClone(p.recs || {})
  const recPassed: Record<string, unknown> = {}
  Object.entries(recs).forEach(([ph, r]) => {
    if (r.passed) recPassed[ph] = r.passed
    delete r.passed
  })
  log.recs = recs
  const admin = Object.fromEntries(Object.entries(p).filter(([k]) => !(LOG_KEYS as readonly string[]).includes(k) && !['id', 'email', 'notes'].includes(k))) as Json
  admin.recPassed = recPassed
  return { admin, log }
}
export function joinPatient(id: string, email: string | null, admin: Json, log: Json, notes: Patient['notes'] = []): Patient {
  const { recPassed, ...rest } = admin as Json & { recPassed?: Record<string, Record<string, boolean>> }
  const recs = structuredClone((log.recs as Patient['recs']) || {})
  Object.entries(recPassed || {}).forEach(([ph, passed]) => {
    const r = (recs[+ph] = recs[+ph] || { tests: [], files: [], at: null })
    r.passed = passed
  })
  return {
    sessions: {},
    fridays: {},
    goals: {},
    phaseAt: {},
    follow: { talked: null, planDone: false, planUpdated: false },
    settings: { notif: 'push', reminder: '08:00', theme: 'claro' },
    done: 0,
    medalsSeen: 0,
    ...rest,
    ...log,
    recs,
    id,
    email: email || undefined,
    notes,
  } as Patient
}

/** Lo que trae la biblioteca vacía la primera vez: los vídeos y el método de ejemplo (sin pacientes). */
function starterLibrary() {
  return pick(sampleState(), LIB_KEYS)
}

const ok = <T>(r: { data: T; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message)
  return r.data
}

export class SupabaseBackend implements Backend {
  readonly name = 'supabase'
  private timers = new Map<string, ReturnType<typeof setTimeout>>()
  private who: Who
  constructor(who: Who) {
    this.who = who
  }

  async load(): Promise<AppState> {
    const isJ = this.who.role === 'jone'
    const lib = ok(await sb.from('library').select('data').maybeSingle())
    let library = (lib?.data as Json) || {}
    if (isJ && !Array.isArray(library.videos)) {
      library = starterLibrary()
      ok(await sb.from('library').upsert({ id: 1, data: library, updated_at: new Date().toISOString() }))
    } else if (isJ && !library.protocols) {
      // la primera vez después de añadir los protocolos por lesión
      library = { ...library, protocols: protocolsSeed() }
      ok(await sb.from('library').upsert({ id: 1, data: library, updated_at: new Date().toISOString() }))
    }
    const pts = ok(await sb.from('patients').select('id,email,admin')) as { id: string; email: string | null; admin: Json }[]
    const logs = ok(await sb.from('patient_logs').select('patient_id,data')) as { patient_id: string; data: Json }[]
    const notes = isJ ? (ok(await sb.from('notes').select('id,patient_id,date,text')) as { id: string; patient_id: string; date: string; text: string }[]) : []
    const jd = isJ ? ((ok(await sb.from('jone_data').select('data').maybeSingle()) as { data: Json } | null)?.data ?? {}) : {}
    const bk = ok(await sb.from('bookings').select('id,patient_id,at,meet_url')) as { id: string; patient_id: string; at: string; meet_url: string | null }[]

    // El paciente solo descarga los vídeos que usa (sus rutinas, clases, tests y laboratorio), no toda la biblioteca
    if (!isJ && Array.isArray(library.videos)) {
      const used = new Set<string>()
      ;((library.routines as { items: { v?: string }[] }[]) || []).forEach((r) => r.items.forEach((it) => it.v && used.add(it.v)))
      Object.values((library.phaseTests as Record<string, string[]>) || {}).forEach((l) => l.forEach((x) => used.add(x)))
      Object.values((library.labVideos as Record<string, string>) || {}).forEach((x) => used.add(x))
      Object.values((library.protocols as Record<string, Record<string, { tests: { video?: string }[]; key: string[] }>>) || {}).forEach((pr) =>
        Object.values(pr).forEach((ph) => {
          ph.tests.forEach((t) => t.video && used.add(t.video))
          ph.key.forEach((x) => used.add(x))
        }),
      )
      library = { ...library, videos: (library.videos as { id: string; type: string }[]).filter((v) => v.type === 'clase' || used.has(v.id)) }
    }
    const patients = pts.map((r) =>
      joinPatient(
        r.id,
        r.email,
        r.admin,
        logs.find((l) => l.patient_id === r.id)?.data || {},
        notes.filter((n) => n.patient_id === r.id).map((n) => ({ id: n.id, date: n.date, text: n.text })),
      ),
    )
    return {
      videos: [],
      routines: [],
      programs: [],
      phaseTests: {},
      defaultGoals: {},
      recFixed: [],
      whatsapp: '',
      calLink: '',
      ...library,
      tasks: [],
      tasksDone: {},
      painOv: {},
      myEmail: '',
      ...pick(jd, JONE_KEYS),
      patients,
      bookings: bk.map((b) => ({ id: b.id, patient: b.patient_id, at: b.at, meetUrl: b.meet_url || undefined })),
    } as AppState
  }

  async persist(op: Op, state: AppState): Promise<void> {
    const key = op.kind === 'patient' ? 'p:' + op.patientId : op.kind
    clearTimeout(this.timers.get(key))
    this.timers.set(
      key,
      setTimeout(() => {
        this.save(op, state).catch((e) => {
          console.error('No se ha podido guardar', e)
          window.dispatchEvent(new CustomEvent('reimpacta-error', { detail: String(e?.message || e) }))
        })
      }, 500),
    )
  }

  private async save(op: Op, st: AppState) {
    const now = new Date().toISOString()
    const isJ = this.who.role === 'jone'
    if (op.kind === 'patient') {
      const p = st.patients.find((x) => x.id === op.patientId)
      if (!p) return
      const { admin, log } = splitPatient(p)
      if (isJ) {
        ok(await sb.from('patients').upsert({ id: p.id, email: p.email?.trim().toLowerCase() || null, admin, updated_at: now }))
        if (p.notes.length) ok(await sb.from('notes').upsert(p.notes.map((n) => ({ id: n.id, patient_id: p.id, date: n.date, text: n.text }))))
      }
      ok(await sb.from('patient_logs').upsert({ patient_id: p.id, data: log, updated_at: now }))
    } else if (!isJ) {
      return // los pacientes solo guardan su diario
    } else if (op.kind === 'library') {
      ok(await sb.from('library').upsert({ id: 1, data: pick(st, LIB_KEYS), updated_at: now }))
    } else if (op.kind === 'jone') {
      ok(await sb.from('jone_data').upsert({ id: 1, data: pick(st, JONE_KEYS), updated_at: now }))
    } else if (op.kind === 'bookings') {
      if (st.bookings.length) ok(await sb.from('bookings').upsert(st.bookings.map((b) => ({ id: b.id, patient_id: b.patient, at: b.at, meet_url: b.meetUrl || null }))))
    }
  }
}
