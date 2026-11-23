import { useId } from 'react'

const MCOL: Record<number, [string, string, string]> = {
  1: ['#F3C6A0', '#C98552', '#7A4521'],
  2: ['#FFCDB5', '#FF7F50', '#A3441C'],
  3: ['#F4F5F2', '#BFC4C2', '#6D7472'],
  4: ['#FFF1B8', '#F5C542', '#A87400'],
  5: ['#F7FFC9', '#D0FB00', '#6F7F10'],
}

/** Medalla de cada fase (bronce, coral, plata, oro, lima), como en el prototipo. */
export function Medal({ n, size = 46, off = false }: { n: number; size?: number; off?: boolean }) {
  const [a, b, c] = MCOL[n]
  const g = 'm' + useId().replace(/:/g, '')
  const cy = n === 5 ? 110 : 105
  const R = n === 5 ? 38 : 34
  return (
    <svg viewBox="0 0 120 150" width={size} height={(size * 150) / 120} aria-hidden="true" style={off ? { opacity: 0.18, filter: 'grayscale(1)' } : undefined}>
      <defs>
        <radialGradient id={g} cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor={a} />
          <stop offset=".55" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </radialGradient>
      </defs>
      <path d="M38 0h18l14 60H52z" fill="#D0FB00" />
      <path d="M82 0H64L50 60h18z" fill="#F3F5F2" />
      <circle cx="60" cy={cy} r={R} fill={`url(#${g})`} stroke={c} strokeWidth="3" />
      <circle cx="60" cy={cy} r={R - 8} fill="none" stroke={a} strokeOpacity=".7" strokeWidth="2" />
      <text x="60" y={cy + 11} textAnchor="middle" fontFamily="Montserrat" fontWeight="900" fontSize="30" fill={c}>
        {n}
      </text>
    </svg>
  )
}
