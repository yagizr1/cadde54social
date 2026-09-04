import { api } from './api'
import { compressImage } from './utils'

export async function uploadDataUrl(dataUrl: string): Promise<string> {
  if (!dataUrl) return dataUrl
  if (dataUrl.startsWith('/uploads/') || dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl
  }
  const blob = await (await fetch(dataUrl)).blob()
  const form = new FormData()
  form.append('file', blob, 'image.jpg')
  const data = await api<{ url: string }>('/api/upload', { method: 'POST', body: form })
  if (!data.url) throw new Error('Görsel yüklenemedi')
  return data.url
}

export async function uploadImageFile(file: File, max = 1080, quality = 0.78): Promise<string> {
  const dataUrl = await compressImage(file, max, quality)
  return uploadDataUrl(dataUrl)
}
