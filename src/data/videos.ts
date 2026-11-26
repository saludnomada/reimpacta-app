// Vídeos que envían los pacientes: se suben a la carpeta privada del paciente en
// Supabase (bucket "pacientes"). Solo el paciente y Jone pueden verlos.
import { mode } from './index'
import { setExerciseVideo, setLabFile } from './actions'
import { sb } from './supabase'

export const MAX_MB = 150

export async function sendExerciseVideo(pid: string, day: string, i: number, file: File) {
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`El vídeo pesa más de ${MAX_MB} MB. Grábalo más corto (1 minuto basta).`)
  if (mode !== 'real') {
    setExerciseVideo(pid, day, i, { name: file.name, size: file.size })
    return
  }
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4'
  const path = `${pid}/${day}/ej${i + 1}-${Date.now()}.${ext}`
  const { error } = await sb.storage.from('pacientes').upload(path, file, { contentType: file.type || 'video/mp4', upsert: false })
  if (error) throw new Error('No se ha podido enviar el vídeo. Revisa tu conexión y vuelve a probar.')
  setExerciseVideo(pid, day, i, { name: file.name, size: file.size, path })
}

/** Enlace temporal (1 hora) para que Jone vea un vídeo privado */
export async function videoLink(path: string) {
  const { data, error } = await sb.storage.from('pacientes').createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

/** Vídeo de un test del laboratorio */
export async function sendLabVideo(pid: string, key: string, file: File) {
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`El vídeo pesa más de ${MAX_MB} MB. Grábalo más corto.`)
  const at = new Date().toISOString()
  if (mode !== 'real') {
    setLabFile(pid, key, { name: file.name, size: file.size, at })
    return
  }
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4'
  const path = `${pid}/lab/${key.replace(/\|/g, '-')}-${Date.now()}.${ext}`
  const { error } = await sb.storage.from('pacientes').upload(path, file, { contentType: file.type || 'video/mp4', upsert: false })
  if (error) throw new Error('No se ha podido enviar el vídeo. Revisa tu conexión y vuelve a probar.')
  setLabFile(pid, key, { name: file.name, size: file.size, path, at })
}
