// Iconos de la app: Phosphor (licencia MIT), estilo "duotono": línea fina con un
// toque de relleno suave. Elegidos por Jone. Todos heredan el color del texto.
import {
  ArrowCounterClockwise,
  Barbell,
  Bell,
  CalendarBlank,
  CalendarCheck,
  CaretRight,
  ChartLineUp,
  Check,
  ClipboardText,
  Clock,
  Export,
  Fire,
  Flag,
  Gear,
  GraduationCap,
  House,
  Medal,
  PersonSimpleRun,
  PersonSimpleTaiChi,
  Phone,
  Play,
  Target,
  TrendDown,
  VideoCamera,
  type Icon,
} from '@phosphor-icons/react'

export const Logo = () => <>R</> // "R" provisional hasta que Jone pase su logo

const mk = (I: Icon, size = 22, weight: 'duotone' | 'bold' | 'fill' = 'duotone') => {
  const C = () => <I className="ph" size={size} weight={weight} aria-hidden="true" />
  return C
}

// barra superior e inferior
export const IconGear = mk(Gear, 23)
export const IconBell = mk(Bell, 23)
export const IconPhone = mk(Phone, 23)
export const IconHome = mk(House, 23)
export const IconCal = mk(CalendarBlank, 23)
export const IconClasses = mk(GraduationCap, 23)
export const IconProg = mk(ChartLineUp, 23)
export const IconShare = mk(Export, 22)
export const IconCheck = mk(Check, 13, 'bold')

// tareas, sesiones y progreso
export const IcDumbbell = mk(Barbell)
export const IcStretch = mk(PersonSimpleTaiChi)
export const IcRun = mk(PersonSimpleRun)
export const IcClipboard = mk(ClipboardText)
export const IcCamera = mk(VideoCamera)
export const IcPhone = mk(Phone)
export const IcRedo = mk(ArrowCounterClockwise)
export const IcFlame = mk(Fire, 16)
export const IcCheck = mk(Check, 14, 'bold')
export const IcPlay = mk(Play, 16, 'fill')
export const IcChevron = mk(CaretRight, 18, 'bold')
export const IcClock = mk(Clock, 15)
export const IcFlag = mk(Flag, 18)
export const IcCalendar = mk(CalendarCheck, 18)
export const IcDown = mk(TrendDown, 18)
export const IcMedal = mk(Medal, 18)
export const IcTarget = mk(Target, 20)
