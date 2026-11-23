// Colores por valor, iguales en TODA la app (decididos por Jone).
//
// Dolor (0-10):        0–3 bien (lima) · 4 vigila (amarillo suave) · 5–7 coral · 8–10 rojo
// Cumplimiento (%):    > 70 lima · 50–70 amarillo suave · < 50 coral
// Confianza (0-10):    > 7 lima · 5–7 amarillo suave · < 5 coral

export type Tone = 'good' | 'mid' | 'bad' | 'stop'

export function painTone(v: number, ok = 3): Tone {
  if (v >= 8) return 'stop'
  if (v >= 5) return 'bad'
  if (v > ok) return 'mid'
  return 'good'
}
export const complianceTone = (pct: number): Tone => (pct > 70 ? 'good' : pct >= 50 ? 'mid' : 'bad')
export const confidenceTone = (v: number): Tone => (v > 7 ? 'good' : v >= 5 ? 'mid' : 'bad')

/** Variable CSS del color de cada tono (cambia sola con el fondo claro/oscuro) */
export const toneVar = (t: Tone) => `var(--t-${t})`
