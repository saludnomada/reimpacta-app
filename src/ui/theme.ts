import { useEffect, useState } from 'react'

export type ThemeChoice = 'auto' | 'claro' | 'oscuro'

const prefersDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches

/** Pone el fondo claro u oscuro en toda la app. "auto" sigue al móvil. */
export function useApplyTheme(choice: ThemeChoice | undefined) {
  const [sysDark, setSysDark] = useState(prefersDark())
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const on = () => setSysDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const c = choice || 'auto'
  const theme = c === 'claro' ? 'light' : c === 'oscuro' ? 'dark' : sysDark ? 'dark' : 'light'
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#F3F5EF' : '#0A140D')
  }, [theme])
  return theme
}
