import type { IconKey } from '../domain/patientHome'
import { IcCamera, IcClipboard, IcDumbbell, IcPhone, IcRedo, IcRun, IcStretch } from './icons'

export function TaskIcon({ k }: { k: IconKey }) {
  switch (k) {
    case 'fuerza':
      return <IcDumbbell />
    case 'movilidad':
      return <IcStretch />
    case 'caco':
    case 'correr':
      return <IcRun />
    case 'viernes':
      return <IcClipboard />
    case 'grabar':
      return <IcCamera />
    case 'llamada':
      return <IcPhone />
    case 'recuperar':
      return <IcRedo />
  }
}
