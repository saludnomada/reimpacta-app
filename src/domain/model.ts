// Modelo de datos de la app. Es el mismo "archivador" que el prototipo,
// con nombres claros. La capa de datos (src/data) lo carga y lo guarda:
// hoy desde datos de ejemplo, mañana desde Supabase, sin tocar las pantallas.

export type Zone = 'pie' | 'tobillo' | 'rodilla' | 'cadera' | 'lumbar' | 'hombro'
export type Look = 'chica-rubia' | 'chica-morena' | 'chico-rubio' | 'chico-moreno'
export type Sex = 'chica' | 'chico'
export type VideoType = 'reps' | 'secs' | 'test' | 'clase'
export type SessionType = 'movilidad' | 'fuerza' | 'caco' | 'correr'
export type PlanKey = 'reimpacta' | 'seguimiento' | 'otro'
export type DayISO = string // "AAAA-MM-DD"

export interface Video {
  id: string
  title: string
  url: string
  keywords: string[]
  type: VideoType
  week: number | null // semana en la que se desbloquea (solo clases)
  vis: 'visible' | 'oculto'
  desc?: string
}

export interface ExerciseItem {
  kind?: undefined
  v: string // id del vídeo
  sets: number
  amount: number
  unit: 'reps' | 'secs'
  kg: string
  note: string
}
export interface CacoItem {
  kind: 'caco'
  sets: number
  run: number
  walk: number
  note: string
}
export type RoutineItem = ExerciseItem | CacoItem

export interface Routine {
  id: string
  name: string
  type?: SessionType
  items: RoutineItem[]
}

export interface Program {
  id: string
  name: string
  /** cada semana: 7 huecos (lunes→domingo) con el id de la rutina o null = día libre */
  weeks: (string | null)[][]
}

export interface SetLog {
  v: string // repeticiones o segundos
  kg: string
}
export interface ExerciseLog {
  done: boolean
  pain: boolean | null
  lvl: number | null
  sets: SetLog[]
  comment?: string
  video?: { name: string; size: number; path?: string }
}
export type SessionStatus = 'preview' | 'active' | 'partial' | 'done'
export interface SessionLog {
  status: SessionStatus
  previewSince?: number
  startedAt?: number
  elapsed?: number
  lastSeen?: number
  hiddenAt?: number | null
  painSession?: number | null
  comment?: string
  ex: ExerciseLog[]
}

export interface FridayForm {
  painEx: number
  painLife: number
  mind: number
  sleep: number
  food: number
  comment: string
}

export interface PhaseRecording {
  tests: string[] // ids de vídeos tipo test pedidos
  files: { id: string; name: string; size: number; path?: string }[]
  at: DayISO | null // día en que lo envió
  passed?: Record<string, boolean>
}

export interface Goal {
  t: string
  ok: boolean
}

export interface Payment {
  plan: PlanKey
  price: number
  n: number // nº de plazos
  paid: boolean[]
}

export interface FollowUp {
  talked: DayISO | null
  planDone: boolean
  planUpdated: boolean
}

export interface PatientSettings {
  notif: 'push' | 'app'
  reminder: string // "08:00"
  callDay?: boolean
  callHour?: boolean
}

export interface CallNote {
  id: string
  date: DayISO
  text: string
}

export interface Patient {
  id: string
  name: string
  email?: string
  sex: Sex
  look: Look
  zone: Zone
  injury: string
  start: DayISO
  end?: DayISO
  program: string
  objective: string
  done: number // fases superadas (0-5)
  medalsSeen: number
  painOk?: number // dolor permitido en ejercicios (por defecto 3)
  introSeen?: boolean
  goals: Record<number, Goal[]>
  phaseAt: Record<number, DayISO>
  sessions: Record<DayISO, SessionLog>
  fridays: Record<DayISO, FridayForm>
  recs: Record<number, PhaseRecording>
  overrides?: Record<DayISO, string | null> // sesiones cambiadas de día
  notes: CallNote[]
  pay?: Payment
  follow: FollowUp
  settings: PatientSettings
}

export interface Booking {
  id: string
  patient: string
  at: string // fecha y hora ISO
  meetUrl?: string
}

export interface ManualTask {
  id: string
  text: string
  patient: string | null
  due: DayISO | null
  done: boolean
  src?: 'voz'
}

export interface RecFixed {
  id: string
  label: string
  hint: string
}

export interface AppState {
  videos: Video[]
  routines: Routine[]
  programs: Program[]
  patients: Patient[]
  bookings: Booking[]
  tasks: ManualTask[]
  /** checklist semanal: clave "lunesISO|paciente:tarea" → hecho */
  tasksDone: Record<string, boolean>
  /** marca manual de "con dolor esta semana": "lunesISO|paciente" */
  painOv: Record<string, boolean>
  recFixed: RecFixed[]
  phaseTests: Record<number, string[]>
  defaultGoals: Record<number, string[]>
  whatsapp: string
  calLink: string
  myEmail: string
}

export const PHASES = ['Control del dolor', 'Fuerza y movilidad', 'Fuerza reactiva', 'Impulsos y saltos', 'Vuelta a correr']
export const ZONES: Zone[] = ['pie', 'tobillo', 'rodilla', 'cadera', 'lumbar', 'hombro']
export const VIS = { visible: 'Visible para pacientes', oculto: 'Oculto (borrador)' } as const
export const TYPES: Record<VideoType, string> = {
  reps: 'Ejercicio · repeticiones',
  secs: 'Ejercicio · segundos',
  test: 'Test',
  clase: 'Clase',
}
export const PLANS: Record<PlanKey, [string, number]> = {
  reimpacta: ['REIMPACTA · 3 meses', 397],
  seguimiento: ['Seguimiento', 300],
  otro: ['Otro precio', 0],
}
export const STYPES: Record<SessionType, string> = { movilidad: 'MOVILIDAD', fuerza: 'FUERZA', caco: 'CACO', correr: 'CORRER' }
export const LOOKS: Record<Look, string> = {
  'chica-rubia': 'Chica rubia',
  'chica-morena': 'Chica morena',
  'chico-rubio': 'Chico rubio',
  'chico-moreno': 'Chico moreno',
}
export const DEFAULT_GOALS: Record<number, string[]> = {
  1: [
    'Dolor en el día a día de 3/10 o menos durante dos semanas',
    'Los isométricos no te dejan más dolor al día siguiente',
    'Caminas 30 minutos sin que el dolor te limite',
  ],
  2: [
    'Sentadilla a una pierna controlada, 3×8 por lado',
    'Elevación de talones a una pierna, 3×15 por lado',
    'Movilidad parecida en las dos piernas',
  ],
  3: [
    'Saltos a la comba 2 minutos sin más dolor al día siguiente',
    'Pogo jumps 3×20 con buena técnica',
    'Mantienes la fuerza en tus ejercicios clave',
  ],
  4: ['Saltos a una pierna 3×10 por lado', 'Aterrizas estable en saltos horizontales', 'Cambios de dirección suaves sin dolor que te frene'],
  5: ['Corres 20 minutos seguidos', 'Corres 3 días por semana durante 3 semanas sin recaída', 'Cumples tu objetivo personal'],
}
