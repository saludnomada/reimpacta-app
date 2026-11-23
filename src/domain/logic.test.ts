import { describe, expect, it } from 'vitest'
import { sampleState } from '../data/sample'
import { addD, isoD, monday, parseD } from './dates'
import { compliance, earliestCall, endOf, goodDay, missedAdvice, painZone, routineFor, strengthNear, type Ctx } from './logic'
import { notices, todayItems } from './patientHome'

const MON = parseD('2026-11-23') // lunes

function ctx(today: Date, now = +today + 10 * 36e5): Ctx {
  return { st: sampleState(MON), today, now }
}

describe('dolor en ejercicios (umbral 3)', () => {
  it('0-3 bien, 4 vigila, 5-8 baja carga, 9-10 para', () => {
    expect([0, 3].map((v) => painZone(v, 3))).toEqual(['ok', 'ok'])
    expect(painZone(4, 3)).toBe('warn')
    expect([5, 8].map((v) => painZone(v, 3))).toEqual(['hi', 'hi'])
    expect([9, 10].map((v) => painZone(v, 3))).toEqual(['stop', 'stop'])
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
