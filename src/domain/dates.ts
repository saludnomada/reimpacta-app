// Utilidades de fechas. Las fechas de día se guardan como texto "AAAA-MM-DD"
// (hora local de la paciente), igual que en el prototipo.

export const pad = (n: number) => String(n).padStart(2, '0')
export const isoD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseD = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addD = (d: Date, n: number) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() + n)
  return x
}
/** Día de la semana empezando en lunes: lunes = 0 … domingo = 6 */
export const dow = (d: Date) => (d.getDay() + 6) % 7
export const monday = (d: Date) => addD(d, -dow(d))
export const diffDays = (a: Date, b: Date) =>
  Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5,
  )
export const todayReal = () => {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const LOC = 'es-ES'
export const fLong = (d: Date) => cap(d.toLocaleDateString(LOC, { weekday: 'long', day: 'numeric', month: 'long' }))
export const fShort = (d: Date) => d.toLocaleDateString(LOC, { weekday: 'short', day: 'numeric', month: 'short' })
export const fDM = (d: Date) => d.toLocaleDateString(LOC, { day: 'numeric', month: 'short' })
export const fTime = (d: Date) => d.toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit' })
export const eur = (n: number) =>
  (Math.round(n * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €'

export const WD = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
export const WDL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
