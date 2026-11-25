import { useMemo, useState } from 'react'
import { updateVideo } from '../../data/actions'
import { useCtx } from '../../data/store'
import { MUSCLES, PHASES, TYPES, WORK_CATS, ZONES, type Video, type VideoType, type WorkCat } from '../../domain/model'
import { IcSearch } from '../../ui/icons'
import { ytId } from '../../ui/VideoBox'
import { VideoThumb } from '../../ui/VideoThumb'

/* ---------- buscador: sin tildes, sin mayúsculas, por trozos de palabra ---------- */
export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
const STOP = new Set(['de', 'la', 'el', 'en', 'a', 'con', 'y', 'del', 'al', 'las', 'los', 'una', 'un', 'para', 'por', 'test'])
/** Etiquetas automáticas: palabras del título + las que se deducen (sentadilla → rodilla, cuádriceps…) */
const IMPLY: Record<string, string[]> = {
  sentadilla: ['rodilla', 'cuádriceps', 'fuerza'],
  zancada: ['rodilla', 'glúteo', 'fuerza'],
  step: ['rodilla', 'cuádriceps', 'unilateral'],
  talones: ['tobillo', 'gemelo', 'aquiles'],
  soleo: ['aquiles', 'tobillo', 'pie'],
  puente: ['glúteo', 'cadera', 'lumbar'],
  hip: ['glúteo', 'cadera'],
  peso: ['isquios', 'cadera'],
  nordico: ['isquios', 'fuerza'],
  plancha: ['core', 'lumbar'],
  saltos: ['saltos', 'reactiva'],
  salto: ['saltos', 'reactiva'],
  pogo: ['saltos', 'tobillo', 'reactiva'],
  comba: ['saltos', 'reactiva'],
  movilidad: ['movilidad'],
  isometrico: ['isométrico'],
  isometrica: ['isométrico'],
  fascia: ['pie', 'fascitis'],
  pie: ['pie'],
  cadera: ['cadera'],
  tobillo: ['tobillo'],
  skipping: ['carrera', 'técnica'],
  pierna: ['unilateral'],
}
export function autoTags(title: string): string[] {
  const words = norm(title)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
  const out = new Set<string>()
  words.forEach((w) => (IMPLY[w] || []).forEach((t) => out.add(t)))
  return [...out]
}

/* ---------- 1.200 vídeos de prueba (títulos inventados, para medir la velocidad) ---------- */
const BASES = [
  'SENTADILLA', 'SENTADILLA BÚLGARA', 'SENTADILLA ISOMÉTRICA EN PARED', 'ZANCADA ATRÁS', 'ZANCADA LATERAL', 'STEP DOWN', 'STEP UP',
  'ELEVACIÓN DE TALONES', 'ELEVACIÓN DE TALONES EN ESCALÓN', 'ISOMÉTRICO DE SÓLEO', 'PUENTE DE GLÚTEO', 'HIP THRUST', 'PESO MUERTO RUMANO',
  'NÓRDICO', 'PLANCHA', 'PLANCHA LATERAL', 'DEAD BUG', 'PÁJARO PERRO', 'POGO JUMPS', 'SALTOS A LA COMBA', 'SALTO A UNA PIERNA',
  'SALTO HORIZONTAL', 'SKIPPING', 'MOVILIDAD DE TOBILLO', 'MOVILIDAD DE CADERA 90/90', 'MOVILIDAD TORÁCICA', 'FASCIA PLANTAR CON PELOTA',
  'MONSTER WALK', 'CLAMSHELL', 'COPENHAGUE', 'EXTENSIÓN DE RODILLA ISOMÉTRICA', 'CURL FEMORAL', 'TIBIAL ANTERIOR', 'CORTO DEL PIE',
  'EQUILIBRIO A UNA PIERNA', 'SPLIT SQUAT', 'WALL SIT', 'BAJADA EXCÉNTRICA DE TALÓN', 'CAMBIOS DE DIRECCIÓN', 'DROP JUMP',
]
const VARIANTS = ['', 'CON MANCUERNA', 'CON BANDA', 'CON KETTLEBELL', 'A UNA PIERNA', 'LENTO 3-1-3', 'CON PAUSA', 'EN BOSU', 'EN ESCALÓN', 'NIVEL 2']
const SIDES = ['', 'DERECHA', 'IZQUIERDA']
function demoLibrary(): Video[] {
  const out: Video[] = []
  for (const b of BASES)
    for (const v of VARIANTS)
      for (const s of SIDES) {
        const title = [b, v, s].filter(Boolean).join(' · ')
        const isSecs = /ISOM|PLANCHA|WALL|EQUILIBRIO|COMBA|SKIPPING/.test(b)
        out.push({ id: 'd' + out.length, title, url: '', keywords: autoTags(title), type: (isSecs ? 'secs' : 'reps') as VideoType, week: null, vis: 'oculto' })
      }
  return out.slice(0, 1200)
}

/** Índice de búsqueda: título, descripción y etiquetas, ya sin tildes. */
const indexOf = (v: Video, extra: string[]) => norm([v.title, v.desc || '', ...v.keywords, ...extra].join(' '))

/** BIBLIOTECA (simulación): buscar entre 1.200 vídeos, etiquetar muchos de golpe y añadir uno de YouTube. */
export function VideoLab() {
  const c = useCtx()
  const [all, setAll] = useState<Video[]>(() => [...c.st.videos, ...demoLibrary()])
  const [extra, setExtra] = useState<Record<string, string[]>>({}) // etiquetas añadidas a mano
  const [q, setQ] = useState('')
  const [ph, setPh] = useState<number | 'none' | null>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [tag, setTag] = useState('')
  const [shown, setShown] = useState(40)
  const [edit, setEdit] = useState<string | null>(null)
  const idx = useMemo(() => new Map(all.map((v) => [v.id, indexOf(v, extra[v.id] || [])])), [all, extra])

  const t0 = performance.now()
  const words = norm(q).split(/\s+/).filter(Boolean)
  const byPh = ph == null ? all : all.filter((v) => (ph === 'none' ? !v.phases?.length && v.type !== 'clase' : v.phases?.includes(ph)))
  const res = words.length ? byPh.filter((v) => words.every((w) => idx.get(v.id)!.includes(w))) : byPh
  const ms = performance.now() - t0

  const toggle = (id: string) => {
    const n = new Set(sel)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    setSel(n)
  }
  const applyTag = () => {
    const t = tag.trim().toLowerCase()
    if (!t || !sel.size) return
    const n = { ...extra }
    sel.forEach((id) => (n[id] = [...new Set([...(n[id] || []), t])]))
    setExtra(n)
    setTag('')
    setSel(new Set())
  }

  return (
    <div className="vl">
      <section className="card vl-explain">
        <span className="lbl">Simulación con 1.200 vídeos</span>
        <p className="muted" style={{ margin: 0 }}>
          Toca un vídeo para editar su título, enlace, palabras clave y la descripción que verá el paciente. Marca la casilla para etiquetar varios
          a la vez.
        </p>
        <p className="muted" style={{ margin: 0 }}>
          Los vídeos siguen en tu canal de YouTube (ocultos). La app solo guarda el enlace, el título y las etiquetas. Prueba a escribir{' '}
          <b>"talon escalon"</b>, <b>"isometrico rodilla"</b> o <b>"banda cadera"</b>: busca sin tildes y por trozos de palabra.
        </p>
      </section>

      <AddYoutube onAdd={(v) => setAll([v, ...all])} />

      <div className="vl-search">
        <IcSearch />
        <input
          className="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setShown(40)
          }}
          placeholder="Busca por nombre o etiqueta…"
          autoFocus
        />
      </div>
      <div className="row">
        <button className={`chip ${ph == null ? 'on' : ''}`} onClick={() => setPh(null)}>
          Todas
        </button>
        {PHASES.map((nm, i) => (
          <button key={i} className={`chip ${ph === i + 1 ? 'on' : ''}`} onClick={() => setPh(i + 1)} title={nm}>
            Fase {i + 1}
          </button>
        ))}
        <button className={`chip ${ph === 'none' ? 'on' : ''}`} onClick={() => setPh('none')}>
          Sin fase
        </button>
      </div>
      <div className="vl-meta">
        <span>
          <b>{res.length}</b> de {all.length} vídeos · encontrado en {ms < 1 ? 'menos de 1' : Math.round(ms)} ms
        </span>
        {words.length > 0 && res.length > 0 && (
          <button className="btn ghost small" onClick={() => setSel(new Set(res.map((v) => v.id)))}>
            Seleccionar los {res.length}
          </button>
        )}
      </div>

      {sel.size > 0 && (
        <div className="vl-bulk">
          <span>
            <b>{sel.size}</b> seleccionados
          </span>
          <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Etiqueta para todos (ej.: aquiles)" onKeyDown={(e) => e.key === 'Enter' && applyTag()} />
          <button className="btn small" onClick={applyTag}>
            Añadir a todos
          </button>
          <span className="vl-bulk-ph">
            Poner en:
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                className="chip"
                onClick={() => {
                  setAll(all.map((v) => (sel.has(v.id) ? { ...v, phases: [...new Set([...(v.phases || []), n])].sort() } : v)))
                  setSel(new Set())
                }}
              >
                Fase {n}
              </button>
            ))}
          </span>
          <button className="btn ghost small" onClick={() => setSel(new Set())}>
            Quitar selección
          </button>
        </div>
      )}

      <ul className="vl-list">
        {res.slice(0, shown).map((v) => {
          const tags = [...v.keywords, ...(extra[v.id] || [])]
          return (
            <li key={v.id} className={sel.has(v.id) ? 'on' : ''} onClick={() => setEdit(v.id)}>
              <input type="checkbox" checked={sel.has(v.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggle(v.id)} aria-label="Seleccionar" />
              <VideoThumb v={v} w={72} />
              <div>
                <b>{v.title}</b>
                {v.desc ? <span className="vl-desc">{v.desc}</span> : <span className="vl-desc none">Sin descripción</span>}
                <span className="vl-tags">
                  {(v.phases || []).map((n) => (
                    <i key={'f' + n} className="ph">
                      Fase {n}
                    </i>
                  ))}
                  {tags.map((t) => (
                    <i key={t} className={(extra[v.id] || []).includes(t) ? 'new' : ''}>
                      {t}
                    </i>
                  ))}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      {edit && (
        <Editor
          v={all.find((x) => x.id === edit)!}
          extra={extra[edit] || []}
          popular={popular(all)}
          onClose={() => setEdit(null)}
          onSave={(nv) => {
            setAll(all.map((x) => (x.id === nv.id ? nv : x)))
            const n = { ...extra }
            delete n[nv.id]
            setExtra(n)
            if (c.st.videos.some((x) => x.id === nv.id) || nv.id.startsWith('y')) updateVideo(nv.id, nv)
            setEdit(null)
          }}
        />
      )}
      {res.length > shown && (
        <button className="btn ghost" onClick={() => setShown(shown + 80)}>
          Ver más ({res.length - shown})
        </button>
      )}
    </div>
  )
}

/** Pegar un enlace de YouTube: saca la miniatura y propone etiquetas por el título. */
function AddYoutube({ onAdd }: { onAdd: (v: Video) => void }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const id = ytId(url)
  const tags = autoTags(title)
  return (
    <section className="card vl-add">
      <span className="lbl">Añadir un vídeo de YouTube</span>
      <div className="vl-add-row">
        <input className="search" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Pega el enlace (youtu.be/… o youtube.com/watch?v=…)" />
        <input className="search" value={title} onChange={(e) => setTitle(e.target.value.toUpperCase())} placeholder="Título del ejercicio" />
      </div>
      {url && !id && <p className="muted" style={{ margin: 0 }}>Ese enlace no parece de YouTube.</p>}
      {id && (
        <div className="vl-prev">
          <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" width={160} height={90} />
          <div>
            <span className="muted">Etiquetas que pongo solas:</span>
            <span className="vl-tags">{tags.length ? tags.map((t) => <i key={t}>{t}</i>) : <em className="muted">escribe el título</em>}</span>
            <button
              className="btn small"
              disabled={!title.trim()}
              onClick={() => {
                { const nv: Video = { id: 'y' + id, title: title.trim(), url, keywords: tags, type: 'reps', week: null, vis: 'visible' }; onAdd(nv); updateVideo(nv.id, nv) }
                setUrl('')
                setTitle('')
              }}
            >
              Guardar en la biblioteca
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

/** Las etiquetas más usadas, para ponerlas con un toque */
function popular(all: Video[]) {
  const n = new Map<string, number>()
  all.forEach((v) => v.keywords.forEach((k) => n.set(k, (n.get(k) || 0) + 1)))
  return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k]) => k)
}

/** Ficha de un vídeo: título, enlace, tipo, palabras clave, músculos y la descripción que ve el paciente. */
function Editor({ v, extra, popular, onClose, onSave }: { v: Video; extra: string[]; popular: string[]; onClose: () => void; onSave: (v: Video) => void }) {
  const [d, setD] = useState<Video>({ ...v, keywords: [...new Set([...v.keywords, ...extra])], muscles: v.muscles || [] })
  const [kw, setKw] = useState('')
  const id = ytId(d.url)
  const addKw = (k: string) => {
    const t = k.trim().toLowerCase()
    if (t && !d.keywords.includes(t)) setD({ ...d, keywords: [...d.keywords, t] })
    setKw('')
  }
  const sugg = [...new Set([...autoTags(d.title), ...popular])].filter((k) => !d.keywords.includes(k)).slice(0, 12)
  const mus = d.muscles || []
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet ved" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <span className="lbl">Ficha del vídeo</span>
        <label>
          <span>Título</span>
          <input className="search" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value.toUpperCase() })} />
        </label>
        <div className="ved-row">
          <label style={{ flex: 1 }}>
            <span>Enlace de YouTube</span>
            <input className="search" value={d.url} placeholder="youtu.be/…" onChange={(e) => setD({ ...d, url: e.target.value })} />
          </label>
          {id && <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" width={112} height={63} />}
        </div>
        <label>
          <span>Tipo</span>
          <select className="search" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value as VideoType })}>
            {(Object.keys(TYPES) as VideoType[]).map((t) => (
              <option key={t} value={t}>
                {TYPES[t]}
              </option>
            ))}
          </select>
        </label>
        <div className="ved-block">
          <span>Palabras clave (para encontrarlo)</span>
          <div className="ved-chips">
            {d.keywords.map((k) => (
              <button key={k} className="chip on" onClick={() => setD({ ...d, keywords: d.keywords.filter((x) => x !== k) })}>
                {k} ×
              </button>
            ))}
            <input
              value={kw}
              placeholder="Escribe y pulsa Intro"
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), addKw(kw))}
            />
          </div>
          {sugg.length > 0 && (
            <div className="ved-chips sugg">
              <small>Sugerencias:</small>
              {sugg.map((k) => (
                <button key={k} className="chip" onClick={() => addKw(k)}>
                  + {k}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ved-block">
          <span>Fases en las que se usa</span>
          <div className="ved-chips">
            {PHASES.map((nm, i) => {
              const on = d.phases?.includes(i + 1)
              return (
                <button key={i} className={`chip ${on ? 'on' : ''}`} title={nm} onClick={() => setD({ ...d, phases: on ? d.phases!.filter((x) => x !== i + 1) : [...(d.phases || []), i + 1].sort() })}>
                  Fase {i + 1}
                </button>
              )
            })}
          </div>
        </div>
        <div className="ved-block">
          <span>Zona</span>
          <div className="ved-chips">
            {ZONES.map((z) => {
              const on = d.zones?.includes(z)
              return (
                <button key={z} className={`chip ${on ? 'on' : ''}`} onClick={() => setD({ ...d, zones: on ? d.zones!.filter((x) => x !== z) : [...(d.zones || []), z] })}>
                  {z.charAt(0).toUpperCase() + z.slice(1)}
                </button>
              )
            })}
          </div>
        </div>
        <div className="ved-row2">
          <div className="ved-block">
            <span>Tipo de trabajo</span>
            <div className="ved-chips">
              {(Object.keys(WORK_CATS) as WorkCat[]).map((k) => (
                <button key={k} className={`chip ${d.cat === k ? 'on' : ''}`} onClick={() => setD({ ...d, cat: d.cat === k ? undefined : k })}>
                  {WORK_CATS[k]}
                </button>
              ))}
            </div>
          </div>
          <div className="ved-block">
            <span>Nivel dentro de la fase</span>
            <div className="ved-chips">
              {([1, 2, 3] as const).map((n) => (
                <button key={n} className={`chip ${d.level === n ? 'on' : ''}`} onClick={() => setD({ ...d, level: d.level === n ? undefined : n })}>
                  {n === 1 ? '1 · Básico' : n === 2 ? '2 · Medio' : '3 · Avanzado'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="ved-block">
          <span>Músculos que trabaja</span>
          <div className="ved-chips">
            {MUSCLES.map((m) => (
              <button key={m} className={`chip ${mus.includes(m) ? 'on' : ''}`} onClick={() => setD({ ...d, muscles: mus.includes(m) ? mus.filter((x) => x !== m) : [...mus, m] })}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <label>
          <span>Descripción: cómo se hace (la ve el paciente debajo del vídeo)</span>
          <textarea rows={4} value={d.desc || ''} placeholder="Ej.: Con la punta del pie en el borde de un escalón, sube en 1 segundo y baja despacio en 3…" onChange={(e) => setD({ ...d, desc: e.target.value })} />
        </label>
        <div className="row">
          <button className="btn" onClick={() => onSave({ ...d, desc: d.desc?.trim() || undefined })}>
            Guardar
          </button>
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
