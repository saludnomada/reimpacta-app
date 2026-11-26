import type { Go } from '../../domain/patientHome'

/** Adónde lleva tocar una tarea o un aviso */
export function goPath(g: Go): string {
  switch (g.to) {
    case 'session':
      return `/sesion/${g.day}`
    case 'friday':
      return '/viernes'
    case 'recordings':
      return '/grabarte'
    case 'call':
      return '/jone'
    case 'classes':
      return '/clases'
    case 'lab':
      return '/tests'
  }
}
