// Gráficas de Progreso. Colores comprobados para daltonismo en claro y oscuro
// (ver --s-* en app.css). Al tocar o pasar el dedo, se ve el valor de cada día.

import { useRef, useState } from 'react'

export interface Series {
  name: string
  color: string // variable CSS, p. ej. 'var(--s-mind)'
  vals: number[]
  dash?: boolean
}

const W = 340

export function LineChart({ series, labels, max = 10, h = 210 }: { series: Series[]; labels: string[]; max?: number; h?: number }) {
  const [hi, setHi] = useState<number | null>(null)
  const ref = useRef<SVGSVGElement>(null)
  const l = 22,
    r = 30,
    t = 12,
    b = 24
  const iw = W - l - r,
    ih = h - t - b
  const n = labels.length
  if (n < 2) return null
  const x = (i: number) => l + (iw * i) / (n - 1)
  const y = (v: number) => t + ih * (1 - v / max)
  const pick = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    const px = ((clientX - box.left) / box.width) * W
    setHi(Math.max(0, Math.min(n - 1, Math.round(((px - l) / iw) * (n - 1)))))
  }
  // etiquetas finales, sin pisarse
  const ends = series.map((s) => ({ y: y(s.vals[n - 1]), v: s.vals[n - 1] })).map((e, i) => ({ ...e, i }))
  ends.sort((a, b2) => a.y - b2.y)
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13
  const tipLeft = hi != null ? (x(hi) / W) * 100 : 0

  return (
    <div className="ch">
      <div className="ch-legend">
        {series.map((s) => (
          <span key={s.name}>
            <i style={{ background: s.color }} className={s.dash ? 'dash' : ''} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="ch-plot">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${h}`}
          role="img"
          aria-label={series.map((s) => `${s.name}: de ${s.vals[0]} a ${s.vals[n - 1]} sobre ${max}`).join('. ')}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
          onPointerLeave={() => setHi(null)}
        >
          {[0, max / 2, max].map((v) => (
            <g key={v}>
              <line x1={l} x2={W - r} y1={y(v)} y2={y(v)} className="ch-grid" />
              <text x={l - 6} y={y(v) + 4} textAnchor="end" className="ch-ax">
                {v}
              </text>
            </g>
          ))}
          <text x={l} y={h - 6} className="ch-ax">
            {labels[0]}
          </text>
          <text x={W - r} y={h - 6} textAnchor="end" className="ch-ax">
            {labels[n - 1]}
          </text>
          {hi != null && <line x1={x(hi)} x2={x(hi)} y1={t} y2={t + ih} className="ch-cross" />}
          {series.map((s) => (
            <polyline
              key={s.name}
              points={s.vals.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dash ? '6 5' : undefined}
            />
          ))}
          {series.map((s) => {
            const i = hi ?? n - 1
            return <circle key={s.name} cx={x(i)} cy={y(s.vals[i])} r="4.5" fill={s.color} className="ch-dot" />
          })}
          {hi == null &&
            ends.map((e) => (
              <text key={e.i} x={W - r + 8} y={e.y + 4} className="ch-end">
                {e.v}
              </text>
            ))}
        </svg>
        {hi != null && (
          <div className="ch-tip" style={{ left: `clamp(70px, ${tipLeft}%, calc(100% - 70px))` }}>
            <b>{labels[hi]}</b>
            {series.map((s) => (
              <span key={s.name}>
                <i style={{ background: s.color }} />
                {s.name} <b>{s.vals[hi]}</b>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function BarChart({ data, unit, color = 'var(--s-bar)', h = 170 }: { data: { label: string; v: number }[]; unit: string; color?: string; h?: number }) {
  const [hi, setHi] = useState<number | null>(null)
  if (!data.length) return <p className="empty">Aún no hay sesiones para dibujar esta gráfica.</p>
  const l = 6,
    r = 6,
    t = 18,
    b = 22
  const iw = W - l - r,
    ih = h - t - b
  const mx = Math.max(...data.map((d) => d.v), 1)
  const bw = iw / data.length
  const gap = 2
  const last = data.length - 1
  const sel = hi ?? last
  return (
    <div className="ch">
      <div className="ch-plot">
        <svg viewBox={`0 0 ${W} ${h}`} role="img" aria-label={`Últimas ${data.length} sesiones, en ${unit}`} onPointerLeave={() => setHi(null)}>
          <line x1={l} x2={W - r} y1={t + ih} y2={t + ih} className="ch-grid" />
          {data.map((d, i) => {
            const bh = Math.max(2, (d.v / mx) * ih)
            const bx = l + i * bw + gap / 2
            const w = Math.max(4, bw - gap)
            const rr = Math.min(4, w / 2)
            const top = t + ih - bh
            return (
              <g key={i} onPointerEnter={() => setHi(i)} onPointerDown={() => setHi(i)}>
                <rect x={l + i * bw} y={t} width={bw} height={ih} fill="transparent" />
                <path
                  d={`M${bx},${t + ih} V${top + rr} Q${bx},${top} ${bx + rr},${top} H${bx + w - rr} Q${bx + w},${top} ${bx + w},${top + rr} V${t + ih} Z`}
                  fill={color}
                  opacity={hi != null && hi !== i ? 0.45 : 1}
                />
              </g>
            )
          })}
          <text x={l + sel * bw + bw / 2} y={t + ih - Math.max(2, (data[sel].v / mx) * ih) - 5} textAnchor="middle" className="ch-end">
            {data[sel].v}
          </text>
          <text x={l} y={h - 6} className="ch-ax">
            {data[0].label}
          </text>
          <text x={W - r} y={h - 6} textAnchor="end" className="ch-ax">
            {data[last].label}
          </text>
        </svg>
        {hi != null && (
          <div className="ch-tip" style={{ left: `clamp(70px, ${((l + hi * bw + bw / 2) / W) * 100}%, calc(100% - 70px))` }}>
            <b>{data[hi].label}</b>
            <span>
              {data[hi].v} {unit}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ===== Gráfica de evolución (una métrica, bonita y fácil de leer) =====
   Bandas de color por zona (bien / vigila / baja carga / para), curva suave,
   cada punto del color de su zona y el último valor destacado. */
import type { Tone } from '../domain/scales'

type Band = [number, number, Tone]
export const PAIN_BANDS: Band[] = [
  [0, 3.5, 'good'],
  [3.5, 4.5, 'mid'],
  [4.5, 7.5, 'bad'],
  [7.5, 10, 'stop'],
]
export const CONF_BANDS: Band[] = [
  [0, 4.5, 'bad'],
  [4.5, 7.5, 'mid'],
  [7.5, 10, 'good'],
]

function smooth(pts: [number, number][]) {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[i + 2] || p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`
  }
  return d
}

export function TrendChart({ vals, labels, tone, bands, h = 220 }: { vals: number[]; labels: string[]; tone: (v: number) => Tone; bands: Band[]; h?: number }) {
  const [hi, setHi] = useState<number | null>(null)
  const ref = useRef<SVGSVGElement>(null)
  const l = 8,
    r = 22,
    t = 26,
    b = 24
  const iw = W - l - r,
    ih = h - t - b
  const n = vals.length
  if (n < 2) return null
  const x = (i: number) => l + (iw * i) / (n - 1)
  const y = (v: number) => t + ih * (1 - Math.max(0, Math.min(10, v)) / 10)
  // un poco de margen para que la curva no se salga de 0-10
  const pts = vals.map((v, i) => [x(i), y(v)] as [number, number])
  const line = smooth(pts)
  const area = `${line} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`
  const pick = (cx: number) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    const px = ((cx - box.left) / box.width) * W
    setHi(Math.max(0, Math.min(n - 1, Math.round(((px - l) / iw) * (n - 1)))))
  }
  const sel = hi ?? n - 1
  const sx = x(sel),
    sy = y(vals[sel])
  return (
    <div className="ch tc">
      <div className="ch-plot">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${h}`}
          role="img"
          aria-label={`De ${vals[0]} a ${vals[n - 1]} sobre 10`}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
          onPointerLeave={() => setHi(null)}
        >
          <defs>
            <clipPath id="tc-clip">
              <rect x={l} y={t} width={iw} height={ih} rx="10" />
            </clipPath>
          </defs>
          <g clipPath="url(#tc-clip)">
            {bands.map(([a, z, tn]) => (
              <rect key={tn + a} x={l} width={iw} y={y(z)} height={y(a) - y(z)} className={`tc-band t-${tn}`} />
            ))}
            <path d={area} className="tc-area" />
          </g>
          {[0, 5, 10].map((v) => (
            <text key={v} x={W - r + 6} y={y(v) + 4} className="ch-ax">
              {v}
            </text>
          ))}
          <path d={line} className="tc-line" />
          {hi != null && <line x1={sx} x2={sx} y1={t} y2={t + ih} className="ch-cross" />}
          {vals.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={i === sel ? 7 : 4} className={`tc-dot t-${tone(v)}`} />
          ))}
          <g transform={`translate(${Math.max(l + 22, Math.min(W - r - 22, sx))},${sy - 16})`}>
            <rect x="-20" y="-14" width="40" height="22" rx="11" className={`tc-bub t-${tone(vals[sel])}`} />
            <text y="2" textAnchor="middle" className={`tc-bubt t-${tone(vals[sel])}`}>
              {vals[sel]}
            </text>
          </g>
          <text x={l} y={h - 6} className="ch-ax">
            {labels[0]}
          </text>
          <text x={W - r} y={h - 6} textAnchor="end" className="ch-ax">
            {hi != null ? labels[hi] : labels[n - 1]}
          </text>
        </svg>
      </div>
    </div>
  )
}
