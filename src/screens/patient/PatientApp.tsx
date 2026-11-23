import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { diffDays, fLong, isoD, monday, parseD } from '../../domain/dates'
import { compliance, currentPhase, endOf, recovered, weekNo, type Ctx } from '../../domain/logic'
import type { Patient } from '../../domain/model'
import { PHASES } from '../../domain/model'
import { notices, todayItems, type Go, type Notice, type TodoItem } from '../../domain/patientHome'
import { useCtx } from '../../data/store'
import { IconBell, IconCal, IconGear, IconHome, IconPhone, IconProg, Logo } from '../../ui/icons'
import { RaceTrack } from '../../ui/RaceTrack'
import { InstallBanner, InstallGuide } from './InstallGuide'

function goPath(g: Go): string {
  switch (g.to) {
    case 'session':
      return `/sesion/${g.day}`
    case 'friday':
      return '/viernes'
    case 'recordings':
      return '/grabarte'
    case 'call':
      return '/jone'
    case 'classes':
      return '/jone/clases'
  }
}

export function PatientApp({ p }: { p: Patient }) {
  return (
    <Routes>
      <Route path="/instalar" element={<InstallGuide />} />
      <Route path="/sesion/:day" element={<Soon title="Tu sesión" />} />
      <Route path="/viernes" element={<Soon title="Cuestionario del viernes" />} />
      <Route path="/grabarte" element={<Soon title="Grábate" />} />
      <Route path="/ajustes" element={<Soon title="Ajustes" />} />
      <Route path="*" element={<Shell p={p} />} />
    </Routes>
  )
}

function Shell({ p }: { p: Patient }) {
  const c = useCtx()
  const nav = useNavigate()
  const [layer, setLayer] = useState<'notifs' | null>(null)
  const list = notices(c, p)
  return (
    <>
      <header className="appbar">
        <div className="brandm">
          <span className="mark">
            <Logo />
          </span>
          <span>REIMPACTA</span>
        </div>
        <div className="hdr-btns">
          <button className="icon-btn" aria-label="Ajustes" onClick={() => nav('/ajustes')}>
            <IconGear />
          </button>
          <button className="icon-btn" aria-label="Avisos" onClick={() => setLayer('notifs')}>
            <IconBell />
            {list.length > 0 && <span className="badge">{list.length}</span>}
          </button>
        </div>
      </header>
      <div className="phone">
        <Routes>
          <Route path="/" element={<Home c={c} p={p} />} />
          <Route path="/semana" element={<SoonInline title="Semana" />} />
          <Route path="/carrera" element={<SoonInline title="Mi carrera" />} />
          <Route path="/jone/*" element={<SoonInline title="Con Jone" />} />
          <Route path="*" element={<Home c={c} p={p} />} />
        </Routes>
      </div>
      <BottomNav c={c} p={p} />
      <EntryPop p={p} list={list} />
      {layer === 'notifs' && <NotifsSheet list={list} onClose={() => setLayer(null)} />}
    </>
  )
}

function BottomNav({ c, p }: { c: Ctx; p: Patient }) {
  const nav = useNavigate()
  const newCls = c.st.videos.some((v) => v.type === 'clase' && v.vis === 'visible' && v.week === weekNo(c, p))
  const tab = (to: string, label: string, icon: React.ReactNode, dot = false) => (
    <NavLink to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'on' : '')} style={{ position: 'relative' }}>
      {icon}
      {label}
      {dot && <span className="badge" style={{ top: 2, right: 10, minWidth: 9, height: 9, padding: 0 }} />}
    </NavLink>
  )
  return (
    <nav className="nav nav5">
      {tab('/', 'Hoy', <IconHome />)}
      {tab('/semana', 'Semana', <IconCal />)}
      <button className="gobtn" aria-label="Entrenar ahora" onClick={() => nav(`/sesion/${isoD(c.today)}`)}>
        <span>▶</span>
        <small>Entrenar</small>
      </button>
      {tab('/carrera', 'Mi carrera', <IconProg />)}
      {tab('/jone', 'Jone', <IconPhone />, newCls)}
    </nav>
  )
}

function Home({ c, p }: { c: Ctx; p: Patient }) {
  const nav = useNavigate()
  const tt = c.today
  const ph = currentPhase(p)
  const rec = recovered(p)
  const goals = p.goals[ph] || []
  const left = goals.filter((g) => !g.ok).length
  const [pct, , sch] = compliance(c, p)
  const items = todayItems(c, p)
  const pend = items.filter((x) => !x.done).length
  const end = endOf(p)
  const totalWeeks = end && !rec ? Math.round(diffDays(monday(parseD(p.start)), end) / 7) : null

  return (
    <>
      <div className="p-top">
        <div>
          <div className="date">
            {fLong(tt)} · semana {weekNo(c, p)}
            {totalWeeks ? ` de ${totalWeeks}` : ''}
          </div>
          <div className="hello">Hola, {p.name}</div>
        </div>
      </div>
      <div className="todohead">
        <span>
          {pend ? (
            <>
              Hoy tienes{' '}
              <b>
                {pend} {pend === 1 ? 'tarea' : 'tareas'}
              </b>
            </>
          ) : items.length ? (
            <>
              <b>¡Hoy lo tienes todo hecho!</b> 🎉
            </>
          ) : (
            <>
              <b>Hoy es día libre.</b> Muévete a tu ritmo y disfruta.
            </>
          )}
        </span>
        {sch > 0 && <span className="cmini">{pct}% cumplido</span>}
      </div>
      <div className="todos">
        {items.map((x, i) => (
          <TodoRow key={i} x={x} onClick={() => nav(goPath(x.go))} />
        ))}
      </div>
      <InstallBanner />
      <button className="race compact" onClick={() => nav('/carrera')}>
        <div className="top">
          <div>
            <span className="lbl">{rec ? '5 de 5 fases' : `Fase ${ph} de 5`}</span>
            <h2>{rec ? '¡Te has recuperado!' : PHASES[ph - 1]}</h2>
          </div>
          <span className="more">
            {rec ? '' : left ? `${goals.length - left}/${goals.length} objetivos` : 'Objetivos cumplidos'} ›
          </span>
        </div>
        <RaceTrack p={p} scale={2} />
        <div className="gl">
          <span style={{ color: 'var(--lime)', fontWeight: 700 }}>Tu meta:</span> {p.objective}
        </div>
      </button>
    </>
  )
}

function TodoRow({ x, onClick }: { x: TodoItem; onClick: () => void }) {
  return (
    <button className={`todo ${x.main ? 'main' : ''} ${x.done ? 'done' : ''} ${x.co ? 'co' : ''}`} onClick={onClick}>
      <span className="tick">{x.done ? '✓' : ''}</span>
      <span className="tx">
        <b>{x.title}</b>
        <small>{x.sub}</small>
      </span>
      <span className="go">›</span>
    </button>
  )
}

/** Un solo pop-up al entrar (el primer aviso), con el resto en la campana. Una vez al día. */
function EntryPop({ p, list }: { p: Patient; list: Notice[] }) {
  const nav = useNavigate()
  const c = useCtx()
  const key = `reimpacta-pop-${p.id}-${isoD(c.today)}`
  const [show, setShow] = useState(false)
  useEffect(() => {
    let seen = false
    try {
      seen = !!sessionStorage.getItem(key)
      sessionStorage.setItem(key, '1')
    } catch {
      /* sin almacenamiento */
    }
    if (seen || !list.length) return
    setShow(true)
    const t = setTimeout(() => setShow(false), 6000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  if (!show || !list.length) return null
  const x = list[0]
  return (
    <div className="pops" role="status" aria-live="polite">
      <div className="pop">
        <button
          className="pop-main"
          onClick={() => {
            setShow(false)
            nav(goPath(x.go))
          }}
        >
          <span className="pop-ic">
            <Logo />
          </span>
          <span className="pop-tx">
            <span className="pop-h">
              <b>REIMPACTA</b>
              <small>ahora</small>
            </span>
            <strong>{x.title}</strong>
            <span>{x.body}</span>
            {list.length > 1 && (
              <em className="pop-sub">
                🔔 +{list.length - 1} aviso{list.length > 2 ? 's' : ''} en la campana
              </em>
            )}
          </span>
        </button>
        <button className="pop-x" aria-label="Cerrar aviso" onClick={() => setShow(false)}>
          ×
        </button>
      </div>
    </div>
  )
}

function NotifsSheet({ list, onClose }: { list: Notice[]; onClose: () => void }) {
  const nav = useNavigate()
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true">
        <h2>Avisos de hoy</h2>
        <div className="notif">
          {list.length ? (
            list.map((n, i) => (
              <div key={i} onClick={() => nav(goPath(n.go))} style={{ cursor: 'pointer' }}>
                <b>{n.title}</b>
                <br />
                <span className="muted">{n.body}</span>
              </div>
            ))
          ) : (
            <p className="empty">Nada pendiente. ¡Al día!</p>
          )}
        </div>
        <div className="row">
          <button className="btn ghost" onClick={() => nav('/ajustes')}>
            Ajustes de avisos
          </button>
          <button className="btn ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function SoonInline({ title }: { title: string }) {
  return (
    <>
      <h1 className="ptitle">{title}</h1>
      <section className="card">
        <p className="muted" style={{ margin: 0 }}>
          Esta pantalla llega en el bloque 2, igual que en tu prototipo.
        </p>
      </section>
    </>
  )
}
function Soon({ title }: { title: string }) {
  const nav = useNavigate()
  return (
    <div className="phone">
      <div className="sbar">
        <button className="back" onClick={() => nav(-1)}>
          ‹ Volver
        </button>
        <h2>{title}</h2>
      </div>
      <section className="card">
        <p className="muted" style={{ margin: 0 }}>
          Esta pantalla llega en el bloque 2, igual que en tu prototipo.
        </p>
      </section>
    </div>
  )
}
