import { LEVEL_THRESHOLDS, TR_TIMEZONE } from './constants'

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'şimdi'
  if (min < 60) return `${min} dk`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} sa`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} g`
  return new Date(ts).toLocaleDateString('tr-TR')
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n)
  if (n < 10000) return `${(n / 1000).toFixed(1).replace('.0', '')} B`
  return `${Math.round(n / 1000)} B`
}

export function getLevelInfo(xp: number): {
  level: number
  start: number
  next: number
  progress: number
} {
  let level = 1
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1
    else break
  }
  const start = LEVEL_THRESHOLDS[level - 1] ?? 0
  const next = LEVEL_THRESHOLDS[level] ?? start + 500
  const progress = clamp((xp - start) / Math.max(1, next - start), 0, 1)
  return { level, start, next, progress }
}

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function dayKey(ts = Date.now()): string {
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: TR_TIMEZONE })
}

export function weekKeyFromDayKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number)
  const tmp = new Date(Date.UTC(year, month - 1, day))
  const isoDow = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - isoDow)
  const isoYear = tmp.getUTCFullYear()
  const yearStart = Date.UTC(isoYear, 0, 1)
  const week = Math.ceil(((tmp.getTime() - yearStart) / 86400000 + 1) / 7)
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

export function weekKey(ts = Date.now()): string {
  return weekKeyFromDayKey(dayKey(ts))
}

export function monthKey(ts = Date.now()): string {
  return dayKey(ts).slice(0, 7)
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) throw new Error('Görsel yüklenemedi')
  const mime = dataUrl.slice(0, comma).match(/data:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(dataUrl.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }
        try {
          resolve(dataUrlToBlob(canvas.toDataURL('image/jpeg', quality)))
        } catch {
          reject(new Error('Görsel sıkıştırılamadı'))
        }
      },
      'image/jpeg',
      quality,
    )
  })
}

export async function compressImageToBlob(file: Blob, max = 1080, quality = 0.78): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Görsel sıkıştırılamadı')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvasToJpeg(canvas, quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function compressImage(file: File, max = 1080, quality = 0.78): Promise<string> {
  try {
    return fileToDataUrl(await compressImageToBlob(file, max, quality))
  } catch {
    return fileToDataUrl(file)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const ready = typeof img.decode === 'function' ? img.decode() : Promise.resolve()
      ready.then(() => resolve(img)).catch(() => resolve(img))
    }
    img.onerror = () => reject(new Error('Görsel yüklenemedi'))
    img.src = src
  })
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    /* fallback */
  }
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.left = '-9999px'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  el.remove()
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function handleize(name: string): string {
  return name.replace(/^@/, '').toLowerCase()
}
