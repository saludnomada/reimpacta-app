// El "estado" de la app en memoria. Los cambios se ven al instante en pantalla
// y el backend los guarda por detrás: por eso no hay botón de "Guardar" ni esperas.

import { useSyncExternalStore } from 'react'
import { isoD, parseD, todayReal } from '../domain/dates'
import type { Ctx } from '../domain/logic'
import type { AppState } from '../domain/model'
import type { Backend, Op } from './backend'

export type Role = 'paciente' | 'jone'
export interface SessionInfo {
  role: Role
  patientId: string | null
}

interface StoreState {
  data: AppState | null
  session: SessionInfo
  /** Solo en modo ejemplo: simular otro día para probar viernes, domingo, etc. */
  demoDate: string | null
}

type Listener = () => void

export class Store {
  private s: StoreState
  private listeners = new Set<Listener>()
  backend: Backend

  constructor(backend: Backend, session: SessionInfo) {
    this.backend = backend
    this.s = { data: null, session, demoDate: null }
  }

  async init() {
    const data = await this.backend.load()
    this.s = { ...this.s, data }
    if (!this.s.session.patientId && data.patients[0]) this.s.session = { ...this.s.session, patientId: data.patients[0].id }
    this.emit()
  }

  get = () => this.s
  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => {
      this.listeners.delete(l)
    }
  }
  private emit() {
    this.listeners.forEach((l) => l())
  }

  /** Cambia los datos (sobre una copia) y avisa al backend para que lo guarde. */
  change(op: Op, fn: (d: AppState) => void) {
    if (!this.s.data) return
    const next = structuredClone(this.s.data)
    fn(next)
    this.s = { ...this.s, data: next }
    this.emit()
    void this.backend.persist(op, next)
  }

  setSession(session: Partial<SessionInfo>) {
    this.s = { ...this.s, session: { ...this.s.session, ...session } }
    this.emit()
  }
  setDemoDate(d: string | null) {
    this.s = { ...this.s, demoDate: d && d !== isoD(todayReal()) ? d : null }
    this.emit()
  }
  replaceData(data: AppState) {
    this.s = { ...this.s, data }
    this.emit()
  }

  today() {
    return this.s.demoDate ? parseD(this.s.demoDate) : todayReal()
  }
  now() {
    if (!this.s.demoDate) return Date.now()
    const n = new Date()
    const d = parseD(this.s.demoDate)
    d.setHours(n.getHours(), n.getMinutes(), n.getSeconds())
    return +d
  }
}

let current: Store | null = null
export const setStore = (s: Store) => (current = s)
export const getStore = () => {
  if (!current) throw new Error('Store sin iniciar')
  return current
}

export function useStore() {
  const s = getStore()
  return useSyncExternalStore(s.subscribe, s.get)
}

/** Contexto para las reglas del método: datos + hoy. */
export function useCtx(): Ctx {
  const st = useStore()
  const s = getStore()
  return { st: st.data!, today: s.today(), now: s.now() }
}
