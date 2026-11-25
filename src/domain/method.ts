// EL MÉTODO: la estructura de cada fase (objetivo, tests con criterio, hitos y
// ejercicios clave) y cómo se evalúa un test con los números que apunta Jone.

import type { AppState, PhaseMethod, TestResult, TestSpec, Video, WorkCat, Zone } from './model'

export const MEASURE_LABEL: Record<TestSpec['measure'], string> = {
  reps: 'repeticiones',
  secs: 'segundos',
  cm: 'cm',
  dolor: 'dolor (0-10)',
  check: 'sí / no',
}

/** El criterio en una frase: "Lesionada ≥ 90 % de la sana" */
export function ruleText(t: TestSpec): string {
  const u = MEASURE_LABEL[t.measure]
  if (t.rule === 'lsi') return `Pierna lesionada al menos al ${t.value} % de la sana (${u})`
  if (t.rule === 'min') return `Al menos ${t.value} ${u}`
  if (t.rule === 'max') return `Como mucho ${t.value} ${t.measure === 'dolor' ? '/10' : u}`
  return 'Lo hace bien (sí / no)'
}

/** ¿Lo supera? Devuelve también el % de simetría si es un test a una pierna. */
export function evalTest(t: TestSpec, r: Omit<TestResult, 'ok' | 'date'>): { ok: boolean; pct?: number } {
  if (t.rule === 'lsi') {
    if (!r.hurt || !r.good) return { ok: false }
    const pct = Math.round((r.hurt / r.good) * 100)
    return { ok: pct >= t.value, pct }
  }
  if (t.rule === 'min') return { ok: (r.value ?? -Infinity) >= t.value }
  if (t.rule === 'max') return { ok: (r.value ?? Infinity) <= t.value }
  return { ok: r.value === 1 }
}

export const emptyPhase = (): PhaseMethod => ({ objective: '', tests: {}, key: [] })
export const phaseOf = (st: AppState, f: number) => st.method?.[f] || emptyPhase()

/** Cuántos vídeos hay de cada tipo de trabajo para una fase y una zona: así ves dónde te faltan. */
export function coverage(videos: Video[], f: number, zones: Zone[], cats: WorkCat[]) {
  return zones.map((z) => ({
    zone: z,
    n: cats.map((k) => videos.filter((v) => v.phases?.includes(f) && v.zones?.includes(z) && v.cat === k).length),
  }))
}
