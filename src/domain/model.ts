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
  /** grupos musculares que trabaja (para la gráfica de Progreso) */
  muscles?: string[]
  /** etiquetas fijas del Método: fases, zonas, tipo de trabajo y nivel dentro de la fase */
  phases?: number[]
  zones?: Zone[]
  cat?: WorkCat
  level?: 1 | 2 | 3
}

export type WorkCat = 'isometrico' | 'fuerza' | 'reactivo' | 'movilidad' | 'tecnica' | 'test'
export const WORK_CATS: Record<WorkCat, string> = {
  isometrico: 'Isométrico',
  fuerza: 'Fuerza',
  reactivo: 'Reactivo y saltos',
  movilidad: 'Movilidad',
  tecnica: 'Técnica de carrera',
  test: 'Test',
}

/** Cómo se mide un test y cuándo se da por superado */
export type TestMeasure = 'reps' | 'secs' | 'cm' | 'dolor' | 'check'
export type TestRule = 'lsi' | 'min' | 'max' | 'check'
export interface TestSpec {
  measure: TestMeasure
  /** lsi = % de la pierna lesionada frente a la sana · min = al menos · max = como mucho · check = sí/no */
  rule: TestRule
  value: number
  note: string
}
export interface PhaseMethod {
  objective: string
  /** criterio de cada test (clave = id del vídeo del test) */
  tests: Record<string, TestSpec>
  /** ejercicios clave de la fase (ids de vídeo) */
  key: string[]
}
/** Protocolos por lesión */
export type InjuryKey = 'cintilla' | 'aquiles' | 'fascitis' | 'rotuliana' | 'periostitis' | 'isquios' | 'patelofemoral' | 'tibialpost'
export const INJURIES: Record<InjuryKey, string> = {
  cintilla: 'Cintilla iliotibial',
  aquiles: 'Tendinopatía de Aquiles',
  fascitis: 'Fascitis plantar',
  rotuliana: 'Tendinopatía rotuliana',
  periostitis: 'Periostitis tibial',
  isquios: 'Tendinopatía isquiotibial',
  patelofemoral: 'Dolor patelofemoral',
  tibialpost: 'Tendinopatía tibial posterior',
}
/** Un test del protocolo (los criterios y resultados solo los ve Jone) */
export interface ProtoTest {
  id: string
  name: string
  /** cómo se hace (para Jone y, si quiere, para el paciente al grabarse) */
  how: string
  spec: TestSpec
  /** vídeo de la biblioteca que explica el test (opcional) */
  video?: string
}
export interface ProtoPhase {
  objective: string
  /** qué se trabaja en esta fase */
  work: string
  tests: ProtoTest[]
  goals: string[]
  /** ejercicios clave (ids de vídeo) */
  key: string[]
}
export type Protocols = Partial<Record<InjuryKey, Record<number, ProtoPhase>>>

/** LABORATORIO: tests en vídeo que Jone pide (en orden) */
export interface LabRequest {
  id: string
  label: string // "Inicio", "Semana 4", "Final"…
  at: DayISO
  tests: string[] // ids del catálogo, en el orden que eligió Jone
}
export interface LabFile {
  name: string
  size: number
  path?: string
  at: string
}
/** Lo que Jone mide en un fotograma: puntos corregidos y valores (solo para Jone) */
export interface LabMark {
  t: number
  side: 'd' | 'i' | '-'
  pts: Record<string, [number, number]>
  values: Record<string, number>
  note?: string
}

export interface TestResult {
  date: DayISO
  /** pierna lesionada / sana (tests a una pierna) o un solo valor */
  hurt?: number
  good?: number
  value?: number
  ok: boolean
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
  /** salida a correr: km y minutos (los apunta el paciente o llegan de Strava) */
  run?: { km?: number; min?: number; source?: 'manual' | 'strava' }
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
  theme?: 'auto' | 'claro' | 'oscuro' // fondo de la app que elige la paciente
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
  /** fecha y hora en que dio su consentimiento explícito (RGPD) */
  consentAt?: string
  goals: Record<number, Goal[]>
  phaseAt: Record<number, DayISO>
  sessions: Record<DayISO, SessionLog>
  fridays: Record<DayISO, FridayForm>
  recs: Record<number, PhaseRecording>
  overrides?: Record<DayISO, string | null> // sesiones cambiadas de día
  notes: CallNote[]
  pay?: Payment
  /** acceso a la app: hasta qué día y si Jone la ha pausado a mano */
  access?: { until?: DayISO; paused?: boolean }
  /** resultados de los tests (clave = id del vídeo del test) */
  testResults?: Record<string, TestResult[]>
  /** protocolo de su lesión (marca sus tests y fases) */
  protocol?: InjuryKey
  /** laboratorio: tests en vídeo pedidos (Jone) */
  lab?: LabRequest[]
  /** laboratorio: vídeos enviados (clave "pedido|test|lado") */
  labFiles?: Record<string, LabFile>
  /** laboratorio: medidas de Jone por vídeo */
  labMarks?: Record<string, LabMark[]>
  /** permiso para usar sus vídeos o datos de forma anónima como caso de éxito */
  mediaOk?: boolean
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
  /** EL MÉTODO: objetivo, tests con criterio y ejercicios clave de cada fase */
  method?: Record<number, PhaseMethod>
  /** protocolos por lesión: fases, tests con criterio e hitos */
  protocols?: Protocols
  /** laboratorio: vídeo de demostración de cada test del catálogo */
  labVideos?: Record<string, string>
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

/** Grupos musculares que Jone puede asignar a cada ejercicio */
export const MUSCLES = ['Cuádriceps', 'Glúteos', 'Isquiotibiales', 'Gemelo y sóleo', 'Core', 'Pie y tobillo', 'Cadera']
