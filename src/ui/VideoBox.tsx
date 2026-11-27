import { useState } from 'react'
import type { Video } from '../domain/model'

export function ytId(url?: string | null): string | null {
  if (!url) return null
  const m = String(url).match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/)
  if (m) return m[1]
  return /^[A-Za-z0-9_-]{11}$/.test(String(url).trim()) ? String(url).trim() : null
}
/** Calienta la conexión con YouTube al acercar el dedo, para que el vídeo arranque antes */
let warmed = false
function warm() {
  if (warmed) return
  warmed = true
  ;['https://www.youtube-nocookie.com', 'https://www.google.com', 'https://i.ytimg.com', 'https://rr1---sn.googlevideo.com'].forEach((h) => {
    const l = document.createElement('link')
    l.rel = 'preconnect'
    l.href = h
    document.head.appendChild(l)
  })
}
const isShort = (url?: string) => /shorts\//.test(url || '')

const Play = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#0A140D" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
)

/** Vídeo de YouTube: primero la miniatura y, al tocar, se reproduce dentro de la app. */
export function VideoBox({ v }: { v?: Video }) {
  const [playing, setPlaying] = useState(false)
  const id = ytId(v?.url)
  const sh = isShort(v?.url)
  if (!v || !id)
    return (
      <div className="vbox">
        <div className="ph">
          <span className="play" style={{ opacity: 0.25 }}>
            <Play />
          </span>
          Aquí irá el vídeo de Jone
        </div>
      </div>
    )
  if (playing)
    return (
      <div className={`vbox ${sh ? 'short' : ''}`}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          title={v.title}
        />
      </div>
    )
  return (
    <div className={`vbox ${sh ? 'short' : ''}`}>
      <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
      <button className="play" aria-label={`Reproducir ${v.title}`} onPointerEnter={warm} onTouchStart={warm} onClick={() => setPlaying(true)}>
        <Play />
      </button>
    </div>
  )
}
