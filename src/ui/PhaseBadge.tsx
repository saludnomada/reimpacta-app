import type { Patient } from '../domain/model'
import { currentPhase, recovered } from '../domain/logic'
import { MEDAL } from './Medal'

/**
 * La medalla de la fase en curso con un anillo: lo que le falta para ganarla.
 * Sustituye al dibujo del corredor.
 */
export function PhaseBadge({ p, size = 84 }: { p: Patient; size?: number }) {
  const rec = recovered(p)
  const ph = rec ? 5 : currentPhase(p)
  const goals = p.goals[ph] || []
  const v = rec ? 1 : goals.length ? goals.filter((g) => g.ok).length / goals.length : 0
  const m = MEDAL[ph]
  const sw = Math.max(5, size * 0.08)
  const r = size / 2 - sw / 2
  const c = 2 * Math.PI * r
  const color = rec ? m.fill : 'var(--coral)'
  return (
    <span className="pbadge" style={{ width: size, height: size }} role="img" aria-label={`Fase ${ph} de 5: ${Math.round(v * 100)}% de los objetivos`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={sw} />
        {v > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        )}
        <circle cx={size / 2} cy={size / 2} r={size * 0.33} fill={rec ? m.fill : 'var(--coral)'} />
        <text x={size / 2} y={size / 2 + size * 0.11} textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize={size * 0.32} fill="#0A140D">
          {ph}
        </text>
      </svg>
    </span>
  )
}

const ZONE_LABEL: Record<string, string> = { pie: 'Pie', tobillo: 'Tobillo', rodilla: 'Rodilla', cadera: 'Cadera', lumbar: 'Lumbar', hombro: 'Hombro' }
export const zoneLabel = (z: string) => ZONE_LABEL[z] || z
