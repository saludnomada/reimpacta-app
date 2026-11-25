// Conexión con Supabase (servidores en la UE · Frankfurt).
// La URL y la clave "publishable" son públicas: están pensadas para ir dentro de la app.
// La seguridad la ponen las reglas del servidor (supabase/schema.sql).
import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://ghfjejxyhexyrpqeweea.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_QIwGikKZE45EUlx_KgvL0g_jz-MxZiK'

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

/** Modo de la app: "real" (Supabase) o "ejemplo" (datos inventados en este navegador). */
const KEY = 'reimpacta-modo'
export function appMode(): 'real' | 'ejemplo' {
  try {
    if (new URLSearchParams(location.search).has('ejemplo')) localStorage.setItem(KEY, 'ejemplo')
    return localStorage.getItem(KEY) === 'ejemplo' ? 'ejemplo' : 'real'
  } catch {
    return 'real'
  }
}
export function setAppMode(m: 'real' | 'ejemplo') {
  try {
    if (m === 'ejemplo') localStorage.setItem(KEY, 'ejemplo')
    else localStorage.removeItem(KEY)
  } catch {
    /* sin almacenamiento */
  }
  location.href = '/'
}
