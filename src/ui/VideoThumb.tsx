import type { Video } from '../domain/model'
import { IcPlay } from './icons'
import { ytId } from './VideoBox'

/** Miniatura del vídeo del ejercicio (siempre visual: si aún no hay vídeo, tarjeta con play). */
export function VideoThumb({ v, w = 96, ratio = 4 / 3 }: { v?: Video | null; w?: number; ratio?: number }) {
  const id = ytId(v?.url)
  return (
    <span className={`vthumb ${id ? '' : 'empty'}`} style={{ width: w, height: Math.round(w / ratio), backgroundImage: id ? `url(https://i.ytimg.com/vi/${id}/mqdefault.jpg)` : undefined }}>
      <span className="vthumb-play">
        <IcPlay />
      </span>
    </span>
  )
}
