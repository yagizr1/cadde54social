import { api } from './api'
import { compressImageToBlob, dataUrlToBlob } from './utils'

const JPEG_SKIP_BYTES = 800_000

async function postFile(blob: Blob, filename: string): Promise<string> {
  const form = new FormData()
  form.append('file', blob, filename)
  const data = await api<{ url: string }>('/api/upload', { method: 'POST', body: form })
  if (!data.url) throw new Error('Görsel yüklenemedi')
  return data.url
}

function jpegName(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, '').trim() || 'image'
  return `${base}.jpg`
}

function alreadyJpeg(file: Blob): boolean {
  return file.type === 'image/jpeg' || file.type === 'image/jpg'
}

export async function uploadDataUrl(dataUrl: string): Promise<string> {
  if (!dataUrl) return dataUrl
  if (dataUrl.startsWith('/uploads/') || dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl
  }
  return postFile(dataUrlToBlob(dataUrl), 'image.jpg')
}

export async function uploadImageFile(file: File, max = 1080, quality = 0.78): Promise<string> {
  if (alreadyJpeg(file) && file.size > 0 && file.size <= JPEG_SKIP_BYTES) {
    return postFile(file, jpegName(file))
  }

  let payload: Blob = file
  try {
    payload = await compressImageToBlob(file, max, quality)
  } catch {
    payload = file
  }

  try {
    return await postFile(payload, jpegName(file))
  } catch (err) {
    if (payload !== file) return postFile(file, file.name || jpegName(file))
    throw err
  }
}
