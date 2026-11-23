import { weekNo, type Ctx } from '../../domain/logic'
import type { Patient } from '../../domain/model'
import { VideoBox } from '../../ui/VideoBox'

const Lock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="4" y="10.5" width="16" height="11" rx="2.5" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </svg>
)

/** CLASES: se desbloquean por semanas y quedan siempre a mano para volver a verlas. */
export function Classes({ c, p }: { c: Ctx; p: Patient }) {
  const wk = weekNo(c, p)
  const cls = c.st.videos.filter((v) => v.type === 'clase' && v.vis === 'visible').sort((a, b) => (a.week || 0) - (b.week || 0))
  const open = cls.filter((v) => (v.week || 1) <= wk)
  const locked = cls.filter((v) => (v.week || 1) > wk)
  return (
    <>
      <div className="h-top">
        <h1 className="h-hello">Tus clases</h1>
        <p className="h-count" style={{ display: 'block' }}>
          Tu recuperación no son solo ejercicios: tu dolor, tu descanso, lo que comes y tu cabeza también cuentan. Vuelve a verlas cuando lo
          necesites.
        </p>
      </div>
      <div className="c-list">
        {open.map((v) => (
          <article key={v.id} className="c-item">
            <VideoBox v={v} />
            <div className="c-body">
              <span className="h-k2">
                Clase {cls.indexOf(v) + 1} · semana {v.week || 1}
                {v.week === wk && <span className="newb">NUEVA</span>}
              </span>
              <b>{v.title}</b>
              {v.desc && <p>{v.desc}</p>}
            </div>
          </article>
        ))}
      </div>
      {locked.length > 0 && (
        <>
          <span className="h-k2" style={{ marginTop: 6 }}>
            Próximamente
          </span>
          <ul className="h-list">
            {locked.map((v) => (
              <li key={v.id}>
                <div className="h-row locked">
                  <span className="h-tick">
                    <Lock />
                  </span>
                  <span className="h-tx">
                    <b>{v.title}</b>
                    <small>Se abre en la semana {v.week}</small>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
