import type { Look, Zone } from '../domain/model'
import { LOOKS } from '../domain/model'
import { FIG } from './figures'

// Punto rojo de la zona de dolor sobre el corredor ilustrado
const FIGZ: Record<Zone, [number, number]> = {
  pie: [119.0, 155.5],
  tobillo: [113, 150],
  rodilla: [124, 119],
  cadera: [94, 97],
  lumbar: [86.5, 87.5],
  hombro: [109, 50],
}
const SPR_H = 32

/** Corredor/a a color. `scale` como en el prototipo (3 = tamaño normal). */
export function Sprite({ look, zone, scale = 3, anim = true }: { look: Look; zone?: Zone | null; scale?: number; anim?: boolean }) {
  const k = FIG[look] ? look : 'chica-rubia'
  const H = Math.round(SPR_H * scale)
  const W = Math.round(H * 0.8)
  const z = zone ? FIGZ[zone] : null
  const dot = z
    ? `<circle class="fring" cx="${z[0]}" cy="${z[1]}" r="6"/><circle cx="${z[0]}" cy="${z[1]}" r="4.6" fill="#FF3B30" stroke="#fff" stroke-width="1.6"/>`
    : ''
  return (
    <span
      className={`spr fig${anim ? ' run' : ''}`}
      role="img"
      aria-label={`${LOOKS[k]}${zone ? ', dolor en ' + zone : ''}`}
      style={{ width: W, height: H }}
    >
      <svg viewBox="20 5 140 175" width={W} height={H} aria-hidden="true" dangerouslySetInnerHTML={{ __html: FIG[k] + dot }} />
    </span>
  )
}
