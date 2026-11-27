import { describe, expect, it } from 'vitest'
import { sampleState } from '../data/sample'
import { addD, isoD, monday, parseD } from './dates'
import { accessOf, compliance, earliestCall, endOf, goodDay, missedAdvice, painZone, routineFor, strengthNear, type Ctx } from './logic'
import { notices, todayItems } from './patientHome'

const MON = parseD('2026-11-23') // lunes

function ctx(today: Date, now = +today + 10 * 36e5): Ctx {
  return { st: sampleState(MON), today, now }
}

describe('dolor en ejercicios (umbral 3)', () => {
  it('0-3 bien, 4 vigila, 5-7 baja carga, 8-10 no lo repitas sin avisarme', () => {
    expect([0, 3].map((v) => painZone(v, 3))).toEqual(['ok', 'ok'])
    expect(painZone(4, 3)).toBe('warn')
    expect([5, 7].map((v) => painZone(v, 3))).toEqual(['hi', 'hi'])
    expect([8, 9, 10].map((v) => painZone(v, 3))).toEqual(['stop', 'stop', 'stop'])
  })
})

describe('regla de fuerza', () => {
  it('no propone recuperar una sesión de fuerza pegada a otra de fuerza', () => {
    const c = ctx(addD(MON, 3)) // jueves
    const p = c.st.patients.find((x) => x.id === 'a3')! // programa L-X-V fuerza
    p.start = isoD(addD(MON, -7))
    // jueves está entre el miércoles y el viernes de fuerza → pegado
    expect(strengthNear(c, p, addD(MON, 3))).toBe(true)
    // sábado pegado al viernes; domingo pegado al lunes siguiente → no queda día: "escríbeme al WhatsApp"
    expect(strengthNear(c, p, addD(MON, 5))).toBe(true)
    expect(strengthNear(c, p, addD(MON, 6))).toBe(true)
    expect(goodDay(c, p)).toBeNull()
    expect(missedAdvice(c, p)).toMatch(/WhatsApp/)
    // si el lunes siguiente fuera libre, el domingo sí valdría
    c.st.programs.find((x) => x.id === p.program)!.weeks.push(['r1', null, 'r1', null, 'r1', null, null], [null, null, null, null, null, null, null])
    expect(isoD(goodDay(c, p)!)).toBe(isoD(addD(MON, 6)))
  })
})

describe('llamadas cada 15 días', () => {
  it('no deja reservar antes de 15 días desde la última', () => {
    const c = ctx(MON)
    const p = c.st.patients[0]
    c.st.bookings = [{ id: 'x', patient: p.id, at: addD(MON, -5).toISOString() }]
    expect(isoD(earliestCall(c, p)!)).toBe(isoD(addD(MON, 10)))
    c.st.bookings = [{ id: 'x', patient: p.id, at: addD(MON, -15).toISOString() }]
    expect(earliestCall(c, p)).toBeNull()
  })
  it('la primera llamada se puede reservar a los 15 días de empezar', () => {
    const c = ctx(MON)
    const p = c.st.patients.find((x) => x.id === 'a3')! // empieza hoy, sin llamadas
    expect(isoD(earliestCall(c, p)!)).toBe(isoD(addD(MON, 15)))
    expect(todayItems(c, p).some((x) => x.title === 'Agenda tu llamada')).toBe(false)
  })
})

describe('programa', () => {
  it('dura 13 semanas y repite la última semana del programa', () => {
    const c = ctx(MON)
    const p = c.st.patients.find((x) => x.id === 'a1')!
    expect(endOf(p)).toEqual(addD(parseD(p.start), 91))
    const far = addD(monday(parseD(p.start)), 7 * 10) // semana 11, el programa tiene 4
    expect(routineFor(c, p, far)?.id).toBe('r2')
  })
  it('el cumplimiento no cuenta la sesión de hoy si aún no está hecha', () => {
    const c = ctx(MON)
    const p = c.st.patients.find((x) => x.id === 'a3')! // empieza hoy
    expect(compliance(c, p)).toEqual([100, 0, 0])
  })
})

describe('pantalla Hoy', () => {
  it('la sesión de hoy va primera y en grande', () => {
    const c = ctx(MON)
    const p = c.st.patients.find((x) => x.id === 'a3')!
    const items = todayItems(c, p)
    expect(items[0]).toMatchObject({ main: true, title: 'FUERZA' })
  })
  it('el aviso de llamada no menciona recordatorios', () => {
    const c = ctx(MON)
    for (const p of c.st.patients) for (const n of notices(c, p)) expect(n.title + n.body).not.toMatch(/recordatorio/i)
  })
})

describe('racha', () => {
  it('cuenta sesiones seguidas hechas; los días de descanso no la rompen y hoy sin hacer tampoco', async () => {
    const { streak } = await import('./logic')
    const c = ctx(addD(MON, 4)) // viernes
    const p = c.st.patients.find((x) => x.id === 'a3')! // L-X-V
    p.start = isoD(MON)
    p.sessions = {}
    const done = (d: Date) => (p.sessions[isoD(d)] = { status: 'done', ex: [] })
    done(MON)
    done(addD(MON, 2))
    expect(streak(c, p)).toBe(2) // viernes aún sin hacer: no rompe
    done(addD(MON, 4))
    expect(streak(c, p)).toBe(3)
    delete p.sessions[isoD(MON)]
    expect(streak(c, p)).toBe(2) // el lunes sin hacer corta la racha
  })
})

describe('pendientes: no se acumulan', () => {
  it('una sesión sin hacer solo se ofrece al día siguiente y nunca pasa a la semana siguiente', async () => {
    const { yesterdayToRecover, todayItems: items } = await import('./patientHome')
    const st = sampleState(MON)
    const p = st.patients.find((x) => x.id === 'a3')! // fuerza L-X-V
    p.start = isoD(addD(MON, -7))
    p.sessions = {}
    st.programs.find((x) => x.id === p.program)!.weeks = [['r6', null, null, null, null, null, null]] // movilidad los lunes
    const at = (d: Date): Ctx => ({ st, today: d, now: +d })
    // martes: el lunes no la hizo → "¿Recuperas la de ayer?"
    expect(yesterdayToRecover(at(addD(MON, 1)), p)).not.toBeNull()
    expect(items(at(addD(MON, 1)), p).some((x) => x.title === '¿Recuperas la de ayer?')).toBe(true)
    // miércoles: ya no aparece
    expect(yesterdayToRecover(at(addD(MON, 2)), p)).toBeNull()
    // lunes siguiente: lo del domingo/semana anterior no se arrastra
    expect(yesterdayToRecover(at(addD(MON, 7)), p)).toBeNull()
  })
  it('no ofrece recuperar una de fuerza si hoy queda pegado a otra de fuerza', async () => {
    const { yesterdayToRecover } = await import('./patientHome')
    const st = sampleState(MON)
    const p = st.patients.find((x) => x.id === 'a3')! // fuerza L-X-V
    p.start = isoD(addD(MON, -7))
    p.sessions = {}
    // martes: mañana (miércoles) hay fuerza → no se ofrece
    expect(yesterdayToRecover({ st, today: addD(MON, 1), now: 0 }, p)).toBeNull()
  })
})

describe('colores por valor (iguales en toda la app)', () => {
  it('dolor: 5-7 coral, 8-10 rojo', async () => {
    const { painTone } = await import('./scales')
    expect([0, 3, 4, 5, 7, 8, 10].map((v) => painTone(v, 3))).toEqual(['good', 'good', 'mid', 'bad', 'bad', 'stop', 'stop'])
  })
  it('cumplimiento: >70 lima, 50-70 amarillo, <50 coral', async () => {
    const { complianceTone } = await import('./scales')
    expect([71, 70, 50, 49].map(complianceTone)).toEqual(['good', 'mid', 'mid', 'bad'])
  })
  it('confianza: >7 lima, 5-7 amarillo, <5 coral', async () => {
    const { confidenceTone } = await import('./scales')
    expect([8, 7, 5, 4].map(confidenceTone)).toEqual(['good', 'mid', 'mid', 'bad'])
  })
})

describe('acceso a la app según pagos', () => {
  it('se bloquea con un plazo sin pagar pasados 3 días, y al pagar vuelve', () => {
    const c = ctx(MON)
    const p = c.st.patients.find((x) => x.id === 'a1')!
    p.start = isoD(addD(MON, -34)) // 2º plazo vencido hace 4 días
    p.pay = { plan: 'reimpacta', price: 397, n: 3, paid: [true, false, false] }
    expect(accessOf(c, p)).toMatchObject({ ok: false, reason: 'unpaid' })
    p.pay.paid[1] = true
    expect(accessOf(c, p).ok).toBe(true)
  })
  it('caduca después de su fecha de acceso y Jone puede pausarla', () => {
    const c = ctx(MON)
    const p = c.st.patients.find((x) => x.id === 'a2')!
    p.access = { until: isoD(addD(MON, -1)) }
    expect(accessOf(c, p).reason).toBe('expired')
    p.access = { paused: true }
    expect(accessOf(c, p).reason).toBe('paused')
  })
})

import { evalTest } from './method'
describe('tests del método', () => {
  it('simetría: lesionada frente a sana', () => {
    const t = { measure: 'reps', rule: 'lsi', value: 90, note: '' } as const
    expect(evalTest(t, { hurt: 18, good: 25 })).toEqual({ ok: false, pct: 72 })
    expect(evalTest(t, { hurt: 23, good: 25 })).toEqual({ ok: true, pct: 92 })
  })
  it('dolor como mucho 3 y repeticiones al menos 20', () => {
    expect(evalTest({ measure: 'dolor', rule: 'max', value: 3, note: '' }, { value: 3 }).ok).toBe(true)
    expect(evalTest({ measure: 'dolor', rule: 'max', value: 3, note: '' }, { value: 4 }).ok).toBe(false)
    expect(evalTest({ measure: 'reps', rule: 'min', value: 20, note: '' }, { value: 19 }).ok).toBe(false)
  })
})

import { joinPatient, splitPatient } from '../data/supabaseBackend'
describe('guardar en Supabase', () => {
  it('ficha + diario vuelven a dar el mismo paciente, y el "superado" va en la ficha', () => {
    const c = ctx(MON)
    const p = c.st.patients.find((x) => x.id === 'a2')!
    p.recs[3] = { tests: ['v18'], files: [], at: null, passed: { v18: true } }
    const { admin, log } = splitPatient(p)
    expect(JSON.stringify(log)).not.toContain('passed')
    expect(admin).not.toHaveProperty('sessions')
    expect(admin).not.toHaveProperty('notes')
    const back = joinPatient(p.id, p.email ?? null, JSON.parse(JSON.stringify(admin)), JSON.parse(JSON.stringify(log)), p.notes)
    expect(back).toEqual(JSON.parse(JSON.stringify(p)))
  })
})

import { readTakeout } from './youtubeImport'
describe('importar de YouTube (Takeout)', () => {
  it('lee el CSV en español con comillas y saltos de línea, y distingue ocultos', () => {
    const csv =
      '﻿ID del vídeo,Duración aproximada (ms),Título del vídeo (original),Descripción del vídeo (original),Privacidad\n' +
      'abc123DEF45,30000,"Sentadilla búlgara, con mancuerna","Baja despacio\nsube rápido",Oculto\n' +
      'zzz999YYY00,20000,Plancha lateral,,Público\n'
    const r = readTakeout(csv)
    expect(r).toHaveLength(2)
    expect(r[0]).toEqual({ id: 'abc123DEF45', title: 'Sentadilla búlgara, con mancuerna', desc: 'Baja despacio\nsube rápido', privacy: 'oculto' })
    expect(r[1].privacy).toBe('publico')
  })
  it('lee el CSV en inglés', () => {
    const r = readTakeout('Video ID,Video Title (Original),Privacy\nabc123DEF45,Pogo jumps,Unlisted\n')
    expect(r[0]).toMatchObject({ title: 'Pogo jumps', privacy: 'oculto' })
  })
})

describe('importar de la hoja de Apps Script', () => {
  it('lee Video ID, Title, Description, Privacy (unlisted = oculto)', () => {
    const r = readTakeout('Video ID,Title,Description,Privacy\nabc123DEF45,ELEVACIÓN DE TALONES,"Sube en 1, baja en 3",unlisted\nqwe456RTY78,Clase 1,,private\n')
    expect(r.map((x) => x.privacy)).toEqual(['oculto', 'privado'])
    expect(r[0].desc).toBe('Sube en 1, baja en 3')
  })
})

import { phaseRequirements } from './progress'
import { guessProtocol, PROTOCOLS } from './protocols'
describe('protocolos por lesión', () => {
  it('reconoce la lesión escrita a mano', () => {
    expect(guessProtocol('Síndrome de la cintilla iliotibial')).toBe('cintilla')
    expect(guessProtocol('Tendinopatía de Aquiles')).toBe('aquiles')
    expect(guessProtocol('Fascitis plantar')).toBe('fascitis')
    expect(guessProtocol('Tendinopatía rotuliana')).toBe('rotuliana')
    expect(guessProtocol('Tendinopatía glútea')).toBeUndefined()
  })
  it('cada lesión tiene 5 fases con tests e hitos, e ids de test únicos', () => {
    Object.values(PROTOCOLS).forEach((pr) => {
      expect(Object.keys(pr)).toHaveLength(5)
      const ids = Object.values(pr).flatMap((ph) => ph.tests.map((t) => t.id))
      expect(new Set(ids).size).toBe(ids.length)
      Object.values(pr).forEach((ph) => expect(ph.goals.length).toBeGreaterThan(0))
    })
  })
  it('el paciente ve "enviado" hasta que Jone lo aprueba, nunca el criterio', () => {
    const c = ctx(MON)
    const p = c.st.patients.find((x) => x.id === 'a2')! // Mikel, Aquiles, fase 3
    const q = phaseRequirements(c, p, 3)
    expect(q.tests.find((t) => t.id === 'aq3a')?.st).toBe('rev')
    expect(JSON.stringify(q)).not.toMatch(/lsi|value|90/)
    p.recs[3] = { ...(p.recs[3] || { tests: [], files: [], at: null }), passed: { aq3a: true } }
    expect(phaseRequirements(c, p, 3).tests.find((t) => t.id === 'aq3a')?.st).toBe('ok')
  })
})

import { jumpHeight, LAB_TESTS, measureValue } from './lab'
describe('laboratorio', () => {
  it('ángulo de rodilla de 90° y segmento vertical de 0°', () => {
    const pts = { trocanter_d: [0.5, 0.2], condilo_d: [0.5, 0.5], maleolo_d: [0.8, 0.5] } as Record<string, [number, number]>
    expect(measureValue({ name: 'r', kind: 'angle', pts: ['trocanter_{s}', 'condilo_{s}', 'maleolo_{s}'] }, 'd', pts)).toBe(90)
    expect(measureValue({ name: 't', kind: 'vert', pts: ['trocanter_{s}', 'condilo_{s}'] }, 'd', pts)).toBe(0)
    // ángulo libre entre dos líneas que no se tocan: vertical y horizontal = 90°
    const fr = { libre1_a: [0.1, 0.1], libre1_b: [0.1, 0.5], libre1_c: [0.3, 0.3], libre1_d: [0.7, 0.3] } as Record<string, [number, number]>
    expect(measureValue({ name: 'l', kind: 'lines', pts: ['libre1_a', 'libre1_b', 'libre1_c', 'libre1_d'] }, 'd', fr)).toBe(90)
  })
  it('altura de salto por tiempo de vuelo (0,5 s ≈ 30,7 cm; a cámara lenta ×8 igual)', () => {
    expect(jumpHeight(0.5)).toBe(30.7)
    expect(jumpHeight(4, 8)).toBe(30.7)
  })
  it('catálogo numerado del 1 al 23 sin repetir', () => {
    expect(LAB_TESTS.map((t) => t.n)).toEqual([...Array(23)].map((_, i) => i + 1))
  })
})
