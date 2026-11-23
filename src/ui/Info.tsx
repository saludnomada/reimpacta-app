import { useState } from 'react'

/** Icono (?) que abre una explicación corta de qué significa un dato. */
export function Info({ children, label = '¿Qué es esto?' }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className={`info-btn ${open ? 'on' : ''}`} aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}>
        ?
      </button>
      {open && (
        <span className="info-pop" role="note">
          {children}
        </span>
      )}
    </>
  )
}
