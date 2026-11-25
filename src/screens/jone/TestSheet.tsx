import { useState } from 'react'
import { addTestResult, approveTest } from '../../data/actions'
import { useCtx } from '../../data/store'
import { fShort, isoD, parseD } from '../../domain/dates'
import { currentPhase } from '../../domain/logic'
import { evalTest, phaseOf, ruleText } from '../../domain/method'
import { INJURIES, PHASES, type Patient, type ProtoTest, type TestSpec } from '../../domain/model'

const DEF: TestSpec = { measure: 'check', rule: 'check', value: 1, note: '' }
const sentence = (s: string) => {
  const t = s.replace(/^TEST:\s*/i, '').toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Tests de la fase actual de un paciente. SOLO PARA JONE: criterios, números y si lo supera.
 *  El paciente solo ve "Enviado · te respondo en 24 h" hasta que Jone lo aprueba. */
export function TestSheet({ p, onClose }: { p: Patient; onClose: () => void }) {
  const c = useCtx()
  const ph = currentPhase(p)
  const proto = p.protocol ? c.st.protocols?.[p.protocol]?.[ph] : undefined
  const tests: ProtoTest[] = proto
    ? proto.tests
    : (c.st.phaseTests[ph] || []).map((id) => ({
        id,
        name: sentence(c.st.videos.find((v) => v.id === id)?.title || 'Test'),
        how: '',
        spec: phaseOf(c.st, ph).tests[id] || DEF,
      }))
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet ved" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <span className="lbl">
          Tests de {p.name} · Fase {ph} · {PHASES[ph - 1]}
          {p.protocol && ` · ${INJURIES[p.protocol]}`}
        </span>
        <p className="muted me-hint">Solo lo ves tú. {p.name} solo ve que lo ha enviado, hasta que tú lo apruebes.</p>
        {!tests.length && <p className="muted">Esta fase no tiene tests en su protocolo.</p>}
        {tests.map((x) => (
          <TestRow key={x.id} p={p} ph={ph} t={x} />
        ))}
        <button className="btn ghost" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

function TestRow({ p, ph, t }: { p: Patient; ph: number; t: ProtoTest }) {
  const c = useCtx()
  const spec = t.spec
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const hist = p.testResults?.[t.id] || []
  const passed = p.recs[ph]?.passed?.[t.id]
  const num = (s: string) => (s.trim() ? +s.replace(',', '.') : undefined)
  const input = spec.rule === 'lsi' ? { hurt: num(a), good: num(b) } : { value: num(a) }
  const ev = evalTest(spec, input)
  const ready = spec.rule === 'lsi' ? input.hurt != null && input.good != null : input.value != null
  const last = hist[hist.length - 1]
  const fmt = (r: (typeof hist)[number]) => {
    const e = evalTest(spec, r)
    return spec.rule === 'lsi' ? `${r.hurt} / ${r.good} · ${e.pct} %` : spec.rule === 'check' ? (r.value ? 'Sí' : 'No') : String(r.value)
  }
  return (
    <div className="ts-row">
      <div className="ts-head">
        <b>{t.name}</b>
        {passed === true && <em className="pill ok">Aprobado</em>}
        {passed === false && <em className="pill co">Aún no</em>}
      </div>
      {t.how && <small className="muted">{t.how}</small>}
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
            <span>{spec.measure === 'dolor' ? 'Dolor (0-10)' : 'Resultado'}</span>
            <input className="search" inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} />
          </label>
        )}
        {ready && (
          <em className={`pill ${ev.ok ? 'ok' : 'co'}`}>
            {ev.pct != null ? `${ev.pct} % · ` : ''}
            {ev.ok ? 'Cumple el criterio' : 'No cumple todavía'}
          </em>
        )}
        <button
          className="btn small ghost"
          disabled={!ready}
          onClick={() => {
            addTestResult(p.id, ph, t.id, { date: isoD(c.today), ...input, ok: ev.ok })
            setA('')
            setB('')
          }}
        >
          Guardar resultado
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
                <em className={evalTest(spec, r).ok ? 'ok' : 'no'}>{evalTest(spec, r).ok ? 'Cumple' : 'No cumple'}</em>
              </li>
            ))}
        </ul>
      )}
      <div className="ts-dec">
        <span className="muted">{last ? (evalTest(spec, last).ok ? 'La app recomienda aprobarlo.' : 'La app recomienda esperar.') : 'Apunta un resultado para decidir.'}</span>
        <button className={`btn small ${passed === true ? '' : 'ghost'}`} onClick={() => approveTest(p.id, ph, t.id, passed === true ? null : true)}>
          {passed === true ? 'Aprobado ✓' : 'Aprobar'}
        </button>
        <button className="btn small ghost" onClick={() => approveTest(p.id, ph, t.id, passed === false ? null : false)}>
          {passed === false ? 'Marcado: aún no' : 'Aún no'}
        </button>
      </div>
    </div>
  )
}
