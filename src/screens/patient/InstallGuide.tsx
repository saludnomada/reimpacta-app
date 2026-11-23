import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconShare } from '../../ui/icons'
import { canPromptInstall, isIosNotSafari, isStandalone, onInstallChange, platform, promptInstall } from '../../ui/install'

/** Tarjeta en "Hoy" mientras la app no esté instalada en la pantalla de inicio. */
export function InstallBanner() {
  const [, force] = useState(0)
  useEffect(() => onInstallChange(() => force((x) => x + 1)), [])
  if (isStandalone() || platform() === 'other') return null
  return (
    <Link to="/instalar" className="banner" style={{ textDecoration: 'none' }}>
      <span className="ic">
        <IconShare />
      </span>
      <div>
        <b>Pon la app en tu pantalla de inicio</b>
        <span>Así te llegan mis avisos al móvil. Son 30 segundos.</span>
      </div>
      <span className="go">›</span>
    </Link>
  )
}

/** Guía paso a paso para añadir la app a la pantalla de inicio. */
export function InstallGuide() {
  const nav = useNavigate()
  const [, force] = useState(0)
  useEffect(() => onInstallChange(() => force((x) => x + 1)), [])
  const pf = platform()
  const done = isStandalone()

  const steps =
    pf === 'ios'
      ? [
          ['Ábrela en Safari', isIosNotSafari() ? 'Ahora la estás viendo en otro navegador. Copia el enlace y pégalo en Safari, la brújula azul.' : 'Ya estás en Safari. ¡Bien!'],
          ['Toca Compartir', 'Es el cuadrado con una flecha hacia arriba. Si no lo ves, toca primero los tres puntos ··· de abajo.'],
          ['Toca «Añadir a pantalla de inicio»', 'Baja un poco en la lista si no aparece a la primera.'],
          ['Deja activado «Abrir como app web» y toca «Añadir»', 'Te aparecerá el icono de REIMPACTA junto a tus apps.'],
          ['Abre REIMPACTA desde ese icono', 'Desde ahí te pediré permiso para los avisos.'],
        ]
      : [
          ['Ábrela en Chrome', 'El navegador de Google, el círculo de colores.'],
          ['Toca los tres puntos ⋮ de arriba a la derecha', ''],
          ['Toca «Añadir a pantalla de inicio» o «Instalar aplicación»', ''],
          ['Toca «Instalar»', 'Te aparecerá el icono de REIMPACTA junto a tus apps.'],
          ['Abre REIMPACTA desde ese icono', 'Desde ahí te pediré permiso para los avisos.'],
        ]

  return (
    <div className="phone">
      <div className="sbar">
        <button className="back" onClick={() => nav(-1)}>
          ‹ Volver
        </button>
        <h2>Instala la app</h2>
      </div>
      {done ? (
        <section className="card">
          <span className="lbl" style={{ color: 'var(--lime)' }}>
            ¡Lista!
          </span>
          <h2>Ya tienes REIMPACTA en tu pantalla de inicio</h2>
          <p className="muted" style={{ margin: 0 }}>
            Así te llegan mis avisos al móvil.
          </p>
        </section>
      ) : (
        <>
          <p className="muted" style={{ margin: 0 }}>
            Ponla en tu pantalla de inicio y úsala como una app más. Así te llegan mis avisos al móvil{pf === 'ios' ? ': en iPhone solo funcionan de esta forma' : ''}.
          </p>
          {pf === 'android' && canPromptInstall() && (
            <button className="btn" onClick={() => void promptInstall()}>
              Instalar REIMPACTA
            </button>
          )}
          <div className="isteps">
            {steps.map(([t, s], i) => (
              <div key={i}>
                <span>{i === 1 && pf === 'ios' ? <IconShare /> : i + 1}</span>
                <b>{t}</b>
                {s ? <small>{s}</small> : <small />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
