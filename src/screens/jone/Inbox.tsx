import { useState } from 'react'
import { getStore, useCtx } from '../../data/store'
import { mode } from '../../data'
import { videoLink } from '../../data/videos'
import { addD, fShort, parseD } from '../../domain/dates'
import { itemTitle, routineFor } from '../../domain/logic'

interface Item {
  key: string
  pid: string
  name: string
  day: string
  sess: string
  lines: { label: string; text?: string; video?: string; pain?: number }[]
  urgent: boolean
}

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

/** POR RESPONDER: dudas, comentarios, vídeos y dolores altos de las últimas 3 semanas. */
export function Inbox() {
  const c = useCtx()
  const [all, setAll] = useState(false)
  const from = addD(c.today, -21)
  const items: Item[] = []
  c.st.patients.forEach((p) =>
    Object.entries(p.sessions).forEach(([day, s]) => {
      if (parseD(day) < from) return
      const r = routineFor(c, p, parseD(day))
      const lines: Item['lines'] = []
      if (s.comment) lines.push({ label: 'Sobre la sesión', text: s.comment })
      if (s.painSession != null && s.painSession >= 8) lines.push({ label: 'Dolor de la sesión', pain: s.painSession })
      s.ex.forEach((e, i) => {
        const nm = r?.items[i] ? sentence(itemTitle(c, r.items[i])) : `Ejercicio ${i + 1}`
        if (e.comment || e.video || (e.lvl != null && e.lvl >= 8)) lines.push({ label: nm, text: e.comment, video: e.video?.path || (e.video ? '' : undefined), pain: e.lvl != null && e.lvl >= 8 ? e.lvl : undefined })
      })
      if (!lines.length) return
      items.push({ key: `inbox|${p.id}|${day}`, pid: p.id, name: p.name, day, sess: r ? sentence(r.name) : 'Sesión', lines, urgent: lines.some((l) => l.pain != null) })
    }),
  )
  items.sort((a, b) => +b.urgent - +a.urgent || b.day.localeCompare(a.day))
  const done = (k: string) => !!c.st.tasksDone[k]
  const list = all ? items : items.filter((x) => !done(x.key))
  const toggle = (k: string) =>
    getStore().change({ kind: 'jone' }, (d) => {
      d.tasksDone[k] = !d.tasksDone[k]
    })

  return (
    <section className="card ib">
      <div className="ib-h">
        <span className="lbl">Por responder · {items.filter((x) => !done(x.key)).length}</span>
        <button className="btn ghost small" onClick={() => setAll(!all)}>
          {all ? 'Solo pendientes' : 'Ver también respondidas'}
        </button>
      </div>
      {!list.length && <p className="muted" style={{ margin: 0 }}>Nada pendiente. Aquí te salen las dudas, los vídeos y los dolores de 8 o más.</p>}
      {list.map((x) => (
        <div key={x.key} className={`ib-it ${x.urgent ? 'urgent' : ''} ${done(x.key) ? 'done' : ''}`}>
          <div className="ib-top">
            <b>{x.name}</b>
            <span className="muted">
              {fShort(parseD(x.day))} · {x.sess}
            </span>
            <button className="btn small ghost" onClick={() => toggle(x.key)}>
              {done(x.key) ? 'Pendiente' : 'Respondida'}
            </button>
          </div>
          {x.lines.map((l, i) => (
            <div key={i} className="ib-line">
              <span className="ib-lab">{l.label}</span>
              {l.pain != null && <em className="pill red">Dolor {l.pain}/10</em>}
              {l.text && <span className="ib-tx">"{l.text}"</span>}
              {l.video !== undefined && <PlayVideo path={l.video} />}
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}

function PlayVideo({ path }: { path: string }) {
  const [busy, setBusy] = useState(false)
  if (mode !== 'real' || !path) return <em className="pill">Vídeo (en la prueba no se guarda el archivo)</em>
  return (
    <button
      className="btn small"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        const w = window.open('', '_blank')
        try {
          const url = await videoLink(path)
          if (w) w.location.href = url
          else location.href = url
        } catch {
          w?.close()
          alert('No he podido abrir el vídeo.')
        }
        setBusy(false)
      }}
    >
      {busy ? 'Abriendo…' : 'Ver vídeo'}
    </button>
  )
}

