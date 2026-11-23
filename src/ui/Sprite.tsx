import type { Look, Zone } from '../domain/model'
import { LOOKS } from '../domain/model'

// Corredor/a en estilo pictograma: trazos limpios de un solo color, como las señales
// deportivas. El pelo (rubio/moreno) y la coleta (chica) le dan su identidad,
// y el punto rojo marca la zona de dolor.

type P = [number, number]
const POSE = {
  head: [71, 18] as P, neck: [67, 32] as P, hip: [57, 80] as P,
  nK: [78, 98] as P, nA: [72, 126] as P, nT: [84, 129] as P,
  fK: [50, 108] as P, fA: [36, 121] as P, fT: [27, 127] as P,
  nE: [79, 56] as P, nH: [92, 45] as P, fE: [51, 55] as P, fH: [42, 71] as P,
}
const mix = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
function zonePt(z: Zone): P {
  const P = POSE
  if (z === 'pie') return mix(P.nA, P.nT, 0.55)
  if (z === 'tobillo') return P.nA
  if (z === 'rodilla') return P.nK
  if (z === 'cadera') return [P.hip[0] + 3, P.hip[1] - 2]
  if (z === 'hombro') return [P.neck[0] + 2, P.neck[1] + 6]
  const l = mix(P.hip, P.neck, 0.22) // lumbar
  return [l[0] - 6, l[1]]
}
const HAIR: Record<string, string> = { rubio: '#E2BE6A', moreno: '#4A3326', rubia: '#E2BE6A', morena: '#4A3326' }

export function Sprite({ look, zone, scale = 3 }: { look: Look; zone?: Zone | null; scale?: number; anim?: boolean }) {
  const [sex, tone] = look.split('-')
  const girl = sex === 'chica'
  const H = Math.round(32 * scale)
  const W = Math.round(H * 0.8)
  const P = POSE
  const hair = HAIR[tone] || '#4A3326'
  const ln = (a: P, b: P, w: number, back = false) => (
    <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={w} strokeLinecap="round" stroke={back ? "var(--runner-back)" : "currentColor"} />
  )
  const z = zone ? zonePt(zone) : null
  return (
    <span className="runner-pic" role="img" aria-label={`${LOOKS[look]}${zone ? ', dolor en ' + zone : ''}`} style={{ width: W, height: H }}>
      <svg viewBox="10 0 100 140" width={W} height={H} aria-hidden="true">
        <g stroke="currentColor" fill="none">
          {/* brazo y pierna de atrás, más suaves */}
          {ln(P.neck, P.fE, 7, true)}
          {ln(P.fE, P.fH, 6.5, true)}
          {ln(P.hip, P.fK, 9, true)}
          {ln(P.fK, P.fA, 8, true)}
          {ln(P.fA, P.fT, 6, true)}
          {/* tronco */}
          {ln(P.neck, P.hip, 13)}
          {/* pierna y brazo de delante */}
          {ln(P.hip, P.nK, 9.5)}
          {ln(P.nK, P.nA, 8.5)}
          {ln(P.nA, P.nT, 6.5)}
          {ln(P.neck, P.nE, 7.5)}
          {ln(P.nE, P.nH, 7)}
        </g>
        <circle cx={P.head[0]} cy={P.head[1]} r="9.5" fill="currentColor" />
        {/* pelo */}
        <path d={`M${P.head[0] - 9.5} ${P.head[1] - 1} a9.5 9.5 0 0 1 19 0 q-9 -5 -19 0z`} fill={hair} />
        {girl && <path d={`M${P.head[0] - 8} ${P.head[1] - 4} q-10 0 -14 9 q7 -2 12 -4z`} fill={hair} />}
        {z && (
          <>
            <circle className="pain-ring" cx={z[0]} cy={z[1]} r="6" />
            <circle cx={z[0]} cy={z[1]} r="4.6" fill="#E5281B" stroke="var(--card)" strokeWidth="1.8" />
          </>
        )}
      </svg>
    </span>
  )
}
