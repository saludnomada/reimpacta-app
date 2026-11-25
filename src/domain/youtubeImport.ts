// IMPORTAR DE YOUTUBE: lee el archivo CSV de Google Takeout ("metadatos de vídeo")
// con todos los vídeos del canal y los convierte en vídeos de la biblioteca.
// Acepta el archivo en español o en inglés.

import type { Video } from './model'

/** Lector de CSV (comillas, comas y saltos de línea dentro de la descripción) */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  const s = text.replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (q) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"'
          i++
        } else q = false
      } else cell += ch
    } else if (ch === '"') q = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

const n = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export interface YtRow {
  id: string
  title: string
  desc: string
  privacy: 'oculto' | 'publico' | 'privado' | 'otro'
}

/** Busca las columnas por su nombre (Takeout cambia el orden y el idioma) */
export function readTakeout(text: string): YtRow[] {
  const rows = parseCsv(text)
  if (rows.length < 2) return []
  const h = rows[0].map(n)
  const col = (...keys: string[]) => h.findIndex((x) => keys.some((k) => x.includes(k)))
  const iId = col('video id', 'id del video', 'id de video')
  const iTitle = col('title', 'titulo')
  const iDesc = col('description', 'descripcion')
  const iPriv = col('privacy', 'privacidad', 'visibilidad')
  if (iId < 0 || iTitle < 0) return []
  return rows.slice(1).flatMap((r) => {
    const id = (r[iId] || '').trim()
    if (!/^[\w-]{6,20}$/.test(id)) return []
    const p = n(r[iPriv] || '')
    const privacy: YtRow['privacy'] = /unlisted|oculto|no listado/.test(p) ? 'oculto' : /public/.test(p) ? 'publico' : /private|privado/.test(p) ? 'privado' : 'otro'
    return [{ id, title: (r[iTitle] || '').trim(), desc: iDesc >= 0 ? (r[iDesc] || '').trim() : '', privacy }]
  })
}

/** Vídeo nuevo de la biblioteca a partir de una fila de YouTube */
export function toVideo(r: YtRow, tags: (title: string) => string[]): Video {
  const title = r.title.toUpperCase()
  const isTest = /^test\b|\btest:/i.test(r.title)
  const isSecs = /isom|plancha|wall sit|equilibrio|aguanta/i.test(r.title)
  return {
    id: 'yt' + r.id,
    title,
    url: 'https://youtu.be/' + r.id,
    keywords: tags(title),
    type: isTest ? 'test' : isSecs ? 'secs' : 'reps',
    week: null,
    vis: 'visible',
    desc: r.desc ? r.desc.slice(0, 600) : undefined,
    ...(isTest ? { cat: 'test' as const } : {}),
  }
}
