import { useMemo, useState } from 'react'
import { useCtx } from '../../data/store'
import type { Video, VideoType } from '../../domain/model'
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

/** Índice de búsqueda: título + etiquetas, ya sin tildes. */
const indexOf = (v: Video, extra: string[]) => norm([v.title, ...v.keywords, ...extra].join(' '))

/** BIBLIOTECA (simulación): buscar entre 1.200 vídeos, etiquetar muchos de golpe y añadir uno de YouTube. */
export function VideoLab() {
  const c = useCtx()
  const [all, setAll] = useState<Video[]>(() => [...c.st.videos, ...demoLibrary()])
  const [extra, setExtra] = useState<Record<string, string[]>>({}) // etiquetas añadidas a mano
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [tag, setTag] = useState('')
  const [shown, setShown] = useState(40)
  const idx = useMemo(() => new Map(all.map((v) => [v.id, indexOf(v, extra[v.id] || [])])), [all, extra])

  const t0 = performance.now()
  const words = norm(q).split(/\s+/).filter(Boolean)
  const res = words.length ? all.filter((v) => words.every((w) => idx.get(v.id)!.includes(w))) : all
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
          <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Etiqueta para todos (ej.: fase 2)" onKeyDown={(e) => e.key === 'Enter' && applyTag()} />
          <button className="btn small" onClick={applyTag}>
            Añadir a todos
          </button>
          <button className="btn ghost small" onClick={() => setSel(new Set())}>
            Quitar selección
          </button>
        </div>
      )}

      <ul className="vl-list">
        {res.slice(0, shown).map((v) => {
          const tags = [...v.keywords, ...(extra[v.id] || [])]
          return (
            <li key={v.id} className={sel.has(v.id) ? 'on' : ''} onClick={() => toggle(v.id)}>
              <input type="checkbox" checked={sel.has(v.id)} readOnly aria-label="Seleccionar" />
              <VideoThumb v={v} w={72} />
              <div>
                <b>{v.title}</b>
                <span className="vl-tags">
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
                onAdd({ id: 'y' + id, title: title.trim(), url, keywords: tags, type: 'reps', week: null, vis: 'visible' })
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
