// Iconos propios de la marca REIMPACTA (diseñados por Jone con ChatGPT):
// baldosa verde casi negro con el dibujo en lima. Se usan en avisos, tareas y semana.

export type BrandKey =
  | 'fuerza'
  | 'movilidad'
  | 'correr'
  | 'viernes'
  | 'grabar'
  | 'llamada'
  | 'recuperar'
  | 'clase'
  | 'tarde'
  | 'dolor'
  | 'meta'
  | 'fase'
  | 'energia'

export const brandKey = (k: string): BrandKey => (k === 'caco' ? 'correr' : (k as BrandKey))
export const brandSrc = (k: string, big = false) => `/icons/marca/${brandKey(k)}${big ? '' : '-192'}.png`

export function BrandIcon({ k, size = 40, label }: { k: string; size?: number; label?: string }) {
  return <img className="bicon" src={brandSrc(k)} width={size} height={size} alt={label || ''} aria-hidden={label ? undefined : true} loading="lazy" decoding="async" />
}
