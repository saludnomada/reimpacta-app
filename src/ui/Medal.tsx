import { PHASES } from '../domain/model'

/** Color sobrio de cada medalla: bronce, cobre, plata, oro y lima (la final). */
export const MEDAL: Record<number, { fill: string; ink: string }> = {
  1: { fill: '#B07A4F', ink: '#FFF4EA' },
  2: { fill: '#C9663F', ink: '#FFF1EA' },
  3: { fill: '#A9B2B0', ink: '#1E2624' },
  4: { fill: '#D2A53A', ink: '#2A2108' },
  5: { fill: '#D0FB00', ink: '#0A140D' },
}

/**
 * Medalla de fase: disco plano con anillo y número, cinta sencilla.
 * Sin degradados ni brillos. Bloqueada = solo el contorno.
 */
export function Medal({ n, size = 52, state = 'on' }: { n: number; size?: number; state?: 'on' | 'cur' | 'off' }) {
  const m = MEDAL[n]
  const on = state === 'on'
  return (
    <svg viewBox="0 0 64 80" width={size} height={(size * 80) / 64} role="img" aria-label={`Medalla ${n}: ${PHASES[n - 1]}${on ? '' : state === 'cur' ? ' (en curso)' : ' (bloqueada)'}`}>
      <path d="M22 2h9l-3 22h-9zM42 2h-9l3 22h9z" fill={on ? m.fill : 'none'} opacity={on ? 0.55 : 1} stroke={on ? 'none' : 'var(--line)'} strokeWidth="1.5" />
      <circle cx="32" cy="50" r="24" fill={on ? m.fill : 'none'} stroke={on ? 'none' : state === 'cur' ? 'var(--coral)' : 'var(--line)'} strokeWidth="2.5" strokeDasharray={state === 'cur' ? '5 4' : undefined} />
      <circle cx="32" cy="50" r="18" fill="none" stroke={on ? m.ink : 'transparent'} strokeOpacity=".35" strokeWidth="1.5" />
      <text x="32" y="58" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="22" fill={on ? m.ink : state === 'cur' ? 'var(--coral-t)' : 'var(--dim)'}>
        {n}
      </text>
    </svg>
  )
}
