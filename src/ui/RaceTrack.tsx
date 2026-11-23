import { currentPhase, progressOf, recovered } from '../domain/logic'
import type { Patient } from '../domain/model'
import { PHASES } from '../domain/model'
import { IconCheck } from './icons'
import { Sprite } from './Sprite'

/** Color de cada medalla (bronce, coral, plata, oro, lima) */
export const MEDAL_MAIN: Record<number, string> = { 1: '#C98552', 2: '#FF7F50', 3: '#BFC4C2', 4: '#F5C542', 5: '#D0FB00' }

/** La pista de la carrera: salida → 5 fases → meta, con el corredor/a en su punto. */
export function RaceTrack({ p, scale = 3 }: { p: Patient; scale?: number }) {
  const pr = progressOf(p)
  const pos = Math.min(pr, 1) * 100
  const ph = currentPhase(p)
  const rec = recovered(p)
  return (
    <div className="track" aria-label={`Recorrido: ${Math.round(pr * 100)}%`}>
      <div className="runner" style={{ left: `clamp(26px,${pos}%,calc(100% - 26px))`, top: (scale <= 2 ? 62 : 110) - 28 * scale + 3 }}>
        <Sprite look={p.look} zone={rec ? null : p.zone} scale={scale} />
      </div>
      <div className="rail">
        <i style={{ width: `${pos}%` }} />
      </div>
      {[1, 2, 3, 4, 5].map((f) => {
        const ok = f <= p.done
        const cur = !rec && f === ph
        if (f === 5)
          return (
            <div key={f} className={`cp meta ${ok ? 'ok' : ''} ${cur ? 'cur' : ''}`} style={{ left: `${f * 20}%` }} title="Meta">
              {ok && <IconCheck />}
            </div>
          )
        return (
          <div
            key={f}
            className={`cp ${ok ? 'ok' : ''} ${cur ? 'cur' : ''}`}
            style={{ left: `${f * 20}%`, ...(ok ? { background: MEDAL_MAIN[f] } : {}) }}
            title={PHASES[f - 1]}
          >
            {ok ? <IconCheck /> : f}
          </div>
        )
      })}
      <div className="ends">
        <span>SALIDA</span>
        <span>META</span>
      </div>
    </div>
  )
}
