// DATOS DE EJEMPLO, INVENTADOS. Son los pacientes ficticios del prototipo
// (modo "Ejemplo"). Nunca se usan con pacientes reales: sirven para ver y probar la app
// mientras Supabase no está conectado.

import { addD, diffDays, isoD, monday, parseD, todayReal, dow } from '../domain/dates'
import { estMin, routineFor, type Ctx } from '../domain/logic'
import type { AppState, Look, Patient, Program, Routine, Sex, Video, VideoType, Zone } from '../domain/model'
import { DEFAULT_GOALS } from '../domain/model'

let seq = 0
export const uid = () => Math.random().toString(36).slice(2, 9) + (seq++).toString(36)

export function sampleState(T: Date = todayReal()): AppState {
  const V: Video[] = (
    [
      ['v1', 'TU DOLOR: QUÉ ESTÁ PASANDO Y CÓMO LO VAMOS A TRABAJAR', ['dolor', 'clase'], 'clase', 1],
      ['v20', 'NUTRICIÓN: COMER PARA RECUPERARTE', ['nutrición', 'clase'], 'clase', 3],
      ['v21', 'MENTALIDAD: VOLVER A CORRER SIN MIEDO', ['mentalidad', 'clase'], 'clase', 5],
      ['v22', 'DESCANSO: EL PILAR QUE NO SE VE', ['sueño', 'descanso', 'clase'], 'clase', 7],
      ['v23', 'VOLVER A CORRER SIN RECAÍDAS', ['carrera', 'clase'], 'clase', 9],
      ['v2', 'SENTADILLA ISOMÉTRICA EN PARED', ['rodilla', 'isométrico', 'cuádriceps', 'fase 1'], 'secs'],
      ['v3', 'PUENTE DE GLÚTEO ISOMÉTRICO', ['cadera', 'glúteo', 'lumbar', 'isométrico'], 'secs'],
      ['v4', 'MOVILIDAD DE TOBILLO EN PARED', ['tobillo', 'pie', 'movilidad'], 'reps'],
      ['v5', 'STEP DOWN DERECHO', ['rodilla', 'fuerza', 'unilateral', 'fase 2'], 'reps'],
      ['v6', 'PESO MUERTO RUMANO A UNA PIERNA', ['isquios', 'cadera', 'fuerza'], 'reps'],
      ['v7', 'ELEVACIÓN DE TALONES EN ESCALÓN', ['aquiles', 'gemelo', 'tobillo', 'fuerza'], 'reps'],
      ['v8', 'SENTADILLA BÚLGARA', ['rodilla', 'cadera', 'fuerza'], 'reps'],
      ['v9', 'PLANCHA LATERAL', ['lumbar', 'core', 'isométrico'], 'secs'],
      ['v10', 'MOVILIDAD DE CADERA 90/90', ['cadera', 'movilidad'], 'reps'],
      ['v11', 'POGO JUMPS', ['saltos', 'tobillo', 'reactiva', 'fase 3'], 'reps'],
      ['v12', 'SALTOS A LA COMBA', ['saltos', 'reactiva', 'fase 3'], 'secs'],
      ['v13', 'SKIPPING BAJO', ['carrera', 'técnica', 'fase 4'], 'secs'],
      ['v14', 'SALTO A UNA PIERNA CON ESTABILIZACIÓN', ['saltos', 'unilateral', 'fase 4'], 'reps'],
      ['v15', 'ISOMÉTRICO DE SÓLEO SENTADO', ['aquiles', 'sóleo', 'pie', 'fascitis', 'isométrico'], 'secs'],
      ['v16', 'TEST: SENTADILLA A UNA PIERNA', ['test', 'rodilla', 'cadera'], 'test'],
      ['v17', 'TEST: ELEVACIÓN DE TALONES HASTA EL FALLO', ['test', 'aquiles', 'tobillo'], 'test'],
      ['v18', 'TEST: SALTOS A UNA PIERNA', ['test', 'saltos'], 'test'],
      ['v24', 'TEST: SALTO HORIZONTAL A UNA PIERNA', ['test', 'saltos', 'fase 4'], 'test'],
      ['v19', 'NÓRDICO ASISTIDO', ['isquios', 'fuerza'], 'reps', null, true],
    ] as [string, string, string[], VideoType, number?, boolean?][]
  ).map(([id, title, keywords, type, week, hidden]) => ({
    id,
    title,
    keywords,
    type,
    week: week || null,
    vis: hidden ? 'oculto' : 'visible',
    url: '',
  }))
  const DESC: Record<string, string> = {
    v1: 'Qué está pasando en tu lesión, por qué duele y cómo vamos a trabajarla. Entenderlo te quita miedo y te ayuda a leer las señales de tu cuerpo.',
    v20: 'Qué comer para que tus tejidos se recuperen y tengas energía para entrenar. Sin dietas raras: pequeños cambios que suman.',
    v21: 'El miedo a que vuelva el dolor cambia cómo corres. Aquí trabajamos la confianza para que vuelvas a correr con tranquilidad.',
    v22: 'Dormir bien y recuperar entre sesiones también es parte del tratamiento. Cómo descansar mejor sin dejar de moverte.',
    v23: 'Cómo planificar tus kilómetros y tus entrenamientos para volver a correr y no recaer.',
  }
  V.forEach((v) => DESC[v.id] && (v.desc = DESC[v.id]))
  const vt = (id: string) => V.find((v) => v.id === id)!.type
  const it = (v: string, sets: number, amount: number, kg = '') => ({
    v,
    sets,
    amount,
    unit: (vt(v) === 'secs' ? 'secs' : 'reps') as 'secs' | 'reps',
    kg,
    note: '',
  })
  const caco = (sets: number, run: number, walk: number) => ({ kind: 'caco' as const, sets, run, walk, note: '' })
  const R: Routine[] = [
    { id: 'r1', name: 'FASE 1 · ISOMÉTRICOS', type: 'fuerza', items: [it('v2', 5, 45), it('v3', 4, 30), it('v15', 4, 30, '10'), it('v4', 2, 10)] },
    { id: 'r2', name: 'FUERZA A', type: 'fuerza', items: [it('v5', 3, 8), it('v6', 3, 8, '12'), it('v7', 3, 8, '10'), it('v9', 3, 30)] },
    { id: 'r3', name: 'FUERZA B', type: 'fuerza', items: [it('v8', 3, 8, '16'), it('v3', 3, 40), it('v10', 2, 8), it('v7', 3, 8, '10')] },
    { id: 'r4', name: 'REACTIVA', type: 'fuerza', items: [it('v12', 4, 30), it('v11', 3, 20), it('v14', 3, 6), it('v5', 3, 8, '8')] },
    { id: 'r5', name: 'CACO 1', type: 'caco', items: [caco(6, 2, 1)] },
    { id: 'r6', name: 'MOVILIDAD GENERAL', type: 'movilidad', items: [it('v4', 2, 10), it('v10', 2, 8)] },
    { id: 'r7', name: 'CORRER 20 MIN', type: 'correr', items: [caco(1, 20, 0)] },
  ]
  const P: Program[] = [
    {
      id: 'p1',
      name: 'REIMPACTA · RODILLA',
      weeks: [
        ['r1', 'r6', 'r1', null, 'r1', 'r6', null],
        ['r1', 'r6', 'r1', null, 'r1', 'r6', null],
        ['r2', 'r6', 'r3', null, 'r2', 'r6', null],
        ['r2', 'r6', 'r3', null, 'r2', 'r6', null],
      ],
    },
    {
      id: 'p2',
      name: 'REIMPACTA · AQUILES',
      weeks: [
        ['r2', null, 'r4', null, 'r3', null, null],
        ['r4', 'r6', 'r2', 'r5', 'r4', 'r6', 'r7'],
      ],
    },
    { id: 'p3', name: 'REIMPACTA · PIE (INICIO)', weeks: [['r1', null, 'r1', null, 'r1', null, null]] },
  ]

  const looks: Record<string, Look> = {
    a1: 'chica-rubia',
    a2: 'chico-moreno',
    a3: 'chica-morena',
    a4: 'chico-rubio',
    a5: 'chica-morena',
    a6: 'chico-moreno',
    a7: 'chica-rubia',
    a8: 'chico-rubio',
  }
  const mk = (
    id: string,
    name: string,
    sex: Sex,
    zone: Zone,
    injury: string,
    startOff: number,
    program: string,
    done: number,
    goalsDone: number[],
    objective: string,
    pay: { plan?: 'reimpacta' | 'seguimiento'; price: number; n: number; paid: boolean[] },
    phaseOff: number[],
  ): Patient => {
    const goals: Patient['goals'] = {}
    for (let f = 1; f <= 5; f++) goals[f] = DEFAULT_GOALS[f].map((t) => ({ t, ok: f <= done }))
    ;(goals[done + 1] || []).forEach((g, i) => (g.ok = goalsDone.includes(i)))
    const start = addD(monday(T), startOff)
    const phaseAt: Patient['phaseAt'] = {}
    phaseOff.forEach((o, i) => (phaseAt[i + 1] = isoD(addD(start, o))))
    return {
      id,
      name,
      sex,
      look: looks[id],
      zone,
      injury,
      start: isoD(start),
      program,
      done,
      medalsSeen: done,
      goals,
      objective,
      sessions: {},
      fridays: {},
      recs: {},
      phaseAt,
      notes: [],
      introSeen: true,
      pay: { plan: pay.plan || 'reimpacta', price: pay.price, n: pay.n, paid: pay.paid },
      follow: { talked: null, planDone: false, planUpdated: false },
      settings: { notif: 'push', reminder: '08:00' },
    }
  }
  const pts = [
    mk('a1', 'Ane', 'chica', 'rodilla', 'Tendinopatía rotuliana', -42, 'p1', 1, [0], 'Correr la Behobia sin tener que parar por la rodilla', { price: 397, n: 3, paid: [true, true, false] }, [24]),
    mk('a2', 'Mikel', 'chico', 'tobillo', 'Tendinopatía de Aquiles', -63, 'p2', 2, [0, 1], 'Volver a hacer series en pista dos días por semana', { price: 397, n: 1, paid: [true] }, [20, 46]),
    mk('a3', 'Laura', 'chica', 'pie', 'Fascitis plantar', 0, 'p3', 0, [], '', { price: 397, n: 3, paid: [false, false, false] }, []),
    mk('a4', 'Iker', 'chico', 'rodilla', 'Síndrome de la cintilla iliotibial', -28, 'p1', 1, [1], 'Volver a correr la media maratón de Donostia', { price: 397, n: 1, paid: [true] }, [20]),
    mk('a5', 'Maite', 'chica', 'cadera', 'Tendinopatía glútea', -14, 'p3', 0, [0], 'Volver a correr con mi grupo los domingos', { price: 397, n: 3, paid: [true, false, false] }, []),
    mk('a6', 'Unai', 'chico', 'cadera', 'Tendinopatía isquiotibial', -77, 'p2', 4, [0, 1, 2], 'Hacer el maratón de Valencia', { price: 397, n: 3, paid: [true, true, true] }, [18, 38, 58, 74]),
    mk('a7', 'Nerea', 'chica', 'pie', 'Fascitis plantar', -35, 'p3', 1, [], 'Hacer un trail de 15 km en primavera', { price: 397, n: 3, paid: [true, false, false] }, [26]),
    mk('a8', 'Jon', 'chico', 'tobillo', 'Tendinopatía de Aquiles', -98, 'p2', 5, [], 'Volver a competir en 10 km', { plan: 'seguimiento', price: 300, n: 1, paid: [true] }, [15, 35, 55, 75, 92]),
  ]
  pts.find((p) => p.id === 'a3')!.introSeen = false

  const FW: Record<string, [number | null, number, number]> = {
    a1: [-9, 1, 0],
    a2: [-4, 1, 1],
    a3: [null, 0, 0],
    a4: [-16, 1, 0],
    a5: [-13, 1, 0],
    a6: [-2, 1, 1],
    a7: [-20, 1, 0],
    a8: [-30, 1, 1],
  }
  const NT: Record<string, [number, string][]> = {
    a1: [
      [-23, 'Le molesta bajar escaleras y al ponerse en cuclillas. Trabaja mucho sentada. Quiere llegar a la Behobia.'],
      [-9, 'Escaleras mucho mejor. Duerme mal por el trabajo. Le cuesta hacer las sesiones del viernes: lo pasamos al sábado si hace falta.'],
    ],
    a2: [
      [-32, 'Rigidez matinal del tendón 20 min. Miedo a volver a la pista.'],
      [-18, 'Rigidez ya solo 5 min. Más confianza. Pide ejemplos de calentamiento para cuando vuelva a correr.'],
      [-4, 'Muy bien con la reactiva. Notó algo al hacer pogos el lunes (3/10, se fue enseguida). Quiere empezar a correr pronto: paciencia, primero la fase 4.'],
    ],
    a5: [[-13, 'Dolor de cadera por la noche al dormir de lado. Viene de dos fisios sin mejorar. Muy motivada pero con miedo a que sea algo más.']],
    a7: [
      [-34, 'Dolor al apoyar por la mañana, 6/10. Trabaja de pie en una tienda.'],
      [-20, 'Mañanas algo mejor. No ha hecho las sesiones de la semana pasada por turnos de trabajo: buscar días fijos.'],
    ],
  }
  pts.forEach((p) => {
    p.notes = (NT[p.id] || []).map(([o, text]) => ({ id: uid(), date: isoD(addD(T, o)), text }))
    const f = FW[p.id]
    p.follow = { talked: f[0] == null ? null : isoD(addD(T, f[0])), planDone: !!f[1], planUpdated: !!f[2] }
  })

  const st: AppState = {
    videos: V,
    routines: R,
    programs: P,
    patients: pts,
    bookings: [],
    tasks: [
      { id: 't1', text: 'Grabar la clase de la semana 7 (descanso)', patient: null, due: isoD(addD(monday(T), 5)), done: false },
      { id: 't2', text: 'Preparar el test de salto horizontal en vídeo', patient: null, due: isoD(addD(monday(T), 6)), done: false },
    ],
    tasksDone: {},
    painOv: {},
    recFixed: [
      { id: 'f1', label: 'CORRIENDO DE LATERAL · LADO DERECHO', hint: 'Móvil apoyado a la altura de la cadera, a 3-4 metros. Que se te vea de pies a cabeza unos 10 segundos.' },
      { id: 'f2', label: 'CORRIENDO DE LATERAL · LADO IZQUIERDO', hint: 'Igual que el anterior, pasando por delante del móvil con el otro lado.' },
    ],
    phaseTests: { 1: ['v16'], 2: ['v17', 'v16'], 3: ['v18'], 4: ['v24', 'v18'], 5: [] },
    defaultGoals: JSON.parse(JSON.stringify(DEFAULT_GOALS)),
    whatsapp: '',
    calLink: '',
    myEmail: '',
  }

  // historial inventado: sesiones, grabaciones y viernes
  let h = 7
  const rnd = () => {
    h = (h * 9301 + 49297) % 233280
    return h / 233280
  }
  const fname = (l: string) =>
    l.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) + '.mp4'
  const fill = (p: Patient, ph: number, tests: string[], off: number) => {
    const r = { tests, files: [] as { id: string; name: string; size: number }[], at: isoD(addD(parseD(p.start), off)) as string | null }
    ;[...st.recFixed.map((f) => [f.id, f.label]), ...tests.map((v) => [v, V.find((x) => x.id === v)!.title])].forEach(([id, l]) =>
      r.files.push({ id, name: fname(l), size: 18e6 + rnd() * 2e7 }),
    )
    p.recs[ph] = r
  }
  const [p0, p1, , p3, p4, p5, p6, p7] = pts
  fill(p0, 1, ['v16'], 2)
  p0.recs[2] = { tests: [], files: [], at: null }
  p0.recs[1].passed = { v16: true }
  fill(p1, 1, ['v16'], 2)
  fill(p1, 2, ['v17'], 22)
  fill(p1, 3, ['v18'], 48)
  p1.recs[1].passed = { v16: true }
  p1.recs[2].passed = { v17: true }
  fill(p3, 1, ['v16'], 2)
  p3.recs[1].passed = { v16: true }
  fill(p3, 2, [], 22)
  fill(p4, 1, [], 2)
  ;[['v16'], ['v17'], ['v18'], ['v24'], []].forEach((t, i) => fill(p5, i + 1, t, [2, 20, 40, 60, 76][i]))
  p5.recs[1].passed = { v16: true }
  p5.recs[2].passed = { v17: true }
  p5.recs[3].passed = { v18: true }
  p5.recs[4].passed = { v24: true }
  fill(p6, 1, ['v16'], 2)
  p6.recs[1].passed = { v16: true }
  ;[['v16'], ['v17'], ['v18'], ['v24'], []].forEach((t, i) => fill(p7, i + 1, t, [2, 17, 37, 57, 77][i]))
  p7.recs[1].passed = { v16: true }
  p7.recs[2].passed = { v17: true }
  p7.recs[3].passed = { v18: true }
  p7.recs[4].passed = { v24: true }

  const c: Ctx = { st, today: T, now: +T }
  const G: Record<string, { ex: number[]; life: number[]; mind: number[]; c?: string[] }> = {
    a4: { ex: [5, 5, 4, 4], life: [4, 4, 3, 3], mind: [4, 4, 5, 6] },
    a5: { ex: [4, 6], life: [4, 5], mind: [5, 4], c: ['', 'Esta semana me ha dolido más la cadera por la noche'] },
    a6: { ex: [6, 5, 5, 4, 4, 3, 3, 3, 2, 2, 2], life: [5, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1], mind: [3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8] },
    a7: { ex: [5, 5, 4, 4, 3], life: [6, 5, 5, 4, 3], mind: [4, 4, 5, 5, 6], c: ['Me duele al apoyar por la mañana', '', '', '', 'Ya puedo caminar más rato'] },
    a8: { ex: [6, 5, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1], life: [5, 4, 4, 3, 3, 2, 2, 1, 1, 1, 1, 0, 0, 0], mind: [3, 3, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9] },
  }
  pts.forEach((p, pi) => {
    if (p.id === 'a3') return
    const stD = parseD(p.start)
    const n = diffDays(stD, T)
    for (let i = 0; i < n; i++) {
      const d = addD(stD, i)
      const r = routineFor(c, p, d)
      if (!r) continue
      const x = rnd()
      const status = x < 0.08 ? null : x < 0.16 ? 'partial' : 'done'
      if (!status) continue
      const wk = Math.floor(i / 7)
      p.sessions[isoD(d)] = {
        status,
        startedAt: +d + 9 * 36e5,
        elapsed: Math.round(estMin(r) * 6e4 * (0.85 + rnd() * 0.4)),
        painSession: status === 'done' ? Math.max(0, Math.round(5 - wk * 0.55 + rnd() * 1.6)) : null,
        ex: r.items.map((itm, k) => {
          const dn = status === 'done' || k < 2
          const hurts = dn && rnd() < Math.max(0.1, 0.55 - wk * 0.07)
          return {
            done: dn,
            pain: dn ? (hurts ? true : rnd() < 0.6 ? false : null) : null,
            lvl: hurts ? Math.max(1, Math.round(5 - wk * 0.5 + rnd() * 2)) : null,
            sets:
              itm.kind === 'caco'
                ? []
                : [...Array(itm.sets)].map((_, j) =>
                    dn
                      ? {
                          v: String(Math.max(1, itm.amount - (j === itm.sets - 1 && rnd() < 0.4 ? (itm.unit === 'secs' ? 5 : 1) : 0))),
                          kg: itm.kg ? String(+itm.kg + Math.floor(wk / 2) * 2) : '',
                        }
                      : { v: '', kg: '' },
                  ),
          }
        }),
      }
    }
    const D = G[p.id]
      ? { ...G[p.id], c: G[p.id].c || [] }
      : pi === 0
        ? { ex: [6, 5, 5, 4, 4, 3], life: [5, 5, 4, 3, 3, 2], mind: [3, 4, 4, 5, 6, 6], c: ['La rodilla me molesta al bajar escaleras', '', 'Semana dura en el trabajo, he dormido poco', '', 'Ya bajo escaleras casi sin notarla', ''] }
        : { ex: [5, 4, 4, 3, 3, 2, 2, 2, 1], life: [4, 3, 3, 3, 2, 2, 1, 1, 1], mind: [3, 3, 4, 5, 5, 6, 7, 7, 8], c: ['', 'Me noto el tendón rígido por las mañanas', '', '', '', 'Las mañanas mucho mejor', '', '', 'Con ganas de volver a la pista'] }
    for (let w = 0; ; w++) {
      const f = addD(monday(stD), w * 7 + 4)
      if (f >= T) break
      const L = (a: number[]) => a[w] ?? a[a.length - 1]
      p.fridays[isoD(f)] = {
        painEx: L(D.ex),
        painLife: L(D.life),
        mind: L(D.mind),
        sleep: Math.min(9, 5 + Math.round(w * 0.4 + rnd())),
        food: Math.min(9, 5 + Math.round(w * 0.3 + rnd())),
        comment: D.c[w] || '',
      }
    }
  })
  // una llamada futura para Mikel
  for (let i = 2; i < 10; i++) {
    const d = addD(T, i)
    if (dow(d) < 5) {
      const x = new Date(d)
      x.setHours(18, 0)
      st.bookings.push({ id: uid(), patient: 'a2', at: x.toISOString() })
      break
    }
  }
  return st
}
