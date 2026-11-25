import { useState } from 'react'
import { addTestResult } from '../../data/actions'
import { useCtx } from '../../data/store'
import { fShort, isoD, parseD } from '../../domain/dates'
import { currentPhase } from '../../domain/logic'
import { evalTest, phaseOf, ruleText } from '../../domain/method'
import { PHASES, type Patient, type TestSpec } from '../../domain/model'

const DEF: TestSpec = { measure: 'check', rule: 'check', value: 1, note: '' }
const sentence = (s: string) => {
  const t = s.replace(/^TEST:\s*/i, '').toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Apuntar los tests de un paciente en su fase actual, con el criterio de tu Método. */
export function TestSheet({ p, onClose }: { p: Patient; onClose: () => void }) {
  const c = useCtx()
  const ph = currentPhase(p)
  const m = phaseOf(c.st, ph)
  const ids = c.st.phaseTests[ph] || []
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet ved" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <span className="lbl">
          Tests de {p.name} · Fase {ph} · {PHASES[ph - 1]}
        </span>
        {!ids.length && <p className="muted">Esta fase no tiene tests en tu Método.</p>}
        {ids.map((id) => (
          <TestRow key={id} p={p} ph={ph} id={id} spec={m.tests[id] || DEF} title={sentence(c.st.videos.find((v) => v.id === id)?.title || 'Test')} />
        ))}
        <button className="btn ghost" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

function TestRow({ p, ph, id, spec, title }: { p: Patient; ph: number; id: string; spec: TestSpec; title: string }) {
  const c = useCtx()
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const hist = p.testResults?.[id] || []
  const num = (s: string) => (s.trim() ? +s.replace(',', '.') : undefined)
  const input = spec.rule === 'lsi' ? { hurt: num(a), good: num(b) } : { value: spec.rule === 'check' ? num(a) : num(a) }
  const ev = evalTest(spec, input)
  const ready = spec.rule === 'lsi' ? input.hurt != null && input.good != null : input.value != null
  const fmt = (r: (typeof hist)[number]) => {
    const e = evalTest(spec, r)
    return spec.rule === 'lsi' ? `${r.hurt} / ${r.good} · ${e.pct} %` : spec.rule === 'check' ? (r.value ? 'Sí' : 'No') : String(r.value)
  }
  return (
    <div className="ts-row">
      <b>{title}</b>
      <small className="me-rule">{ruleText(spec)}</small>
      {spec.note && <small className="muted">{spec.note}</small>}
      <div className="ts-in">
        {spec.rule === 'lsi' ? (
          <>
            <label>
              <span>Lesionada</span>
              <input className="search" inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} />
            </label>
            <label>
              <span>Sana</span>
              <input className="search" inputMode="decimal" value={b} onChange={(e) => setB(e.target.value)} />
            </label>
          </>
        ) : spec.rule === 'check' ? (
          <div className="seg2">
            <button className={a === '1' ? 'on' : ''} onClick={() => setA('1')}>
              Lo hace bien
            </button>
            <button className={a === '0' ? 'on' : ''} onClick={() => setA('0')}>
              Todavía no
            </button>
          </div>
        ) : (
          <label>
            <span>Resultado</span>
            <input className="search" inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} />
          </label>
        )}
        {ready && <em className={`pill ${ev.ok ? 'ok' : 'co'}`}>{ev.pct != null ? `${ev.pct} % · ` : ''}{ev.ok ? 'Superado' : 'Aún no'}</em>}
        <button
          className="btn small"
          disabled={!ready}
          onClick={() => {
            addTestResult(p.id, ph, id, { date: isoD(c.today), ...input, ok: ev.ok })
            setA('')
            setB('')
          }}
        >
          Guardar
        </button>
      </div>
      {hist.length > 0 && (
        <ul className="ts-hist">
          {hist
            .slice(-4)
            .reverse()
            .map((r, i) => (
              <li key={i}>
                <span>{fShort(parseD(r.date))}</span>
                <span>{fmt(r)}</span>
                <em className={r.ok ? 'ok' : 'no'}>{r.ok ? 'Superado' : 'Aún no'}</em>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
