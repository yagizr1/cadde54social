import { api } from './api'
import { isIos, isStandalone } from './pwaInstall'

const SKIP_KEY = 'c54_push_ask_skip'
const listeners = new Set<() => void>()

function emitPushChange(): void {
  for (const fn of listeners) fn()
}

export function subscribePushChange(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function pushNeedsInstall(): boolean {
  return isIos() && !isStandalone()
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

export function pushDismissed(): boolean {
  try {
    return sessionStorage.getItem(SKIP_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissPushPrompt(): void {
  try {
    sessionStorage.setItem(SKIP_KEY, '1')
  } catch {
    /* ignore */
  }
  emitPushChange()
}

export async function currentPushEndpoint(): Promise<string | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return sub?.endpoint ?? null
}

export async function enablePush(): Promise<void> {
  if (pushNeedsInstall()) {
    throw new Error('iPhone’da önce uygulamayı ana ekrana ekle, sonra bildirimi aç.')
  }
  if (!pushSupported()) {
    throw new Error('Bu tarayıcı telefon bildirimi desteklemiyor')
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Bildirim izni verilmedi. Telefon ayarlarından açabilirsin.')
  }
  const { key } = await api<{ key: string }>('/api/push/public-key')
  if (!key) throw new Error('Bildirim sunucusu hazır değil')
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (sub) {
    try {
      await api('/api/push/subscribe', { method: 'POST', body: sub.toJSON() })
      emitPushChange()
      return
    } catch {
      await sub.unsubscribe().catch(() => undefined)
      sub = null
    }
  }
  sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
  })
  await api('/api/push/subscribe', { method: 'POST', body: sub.toJSON() })
  emitPushChange()
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await api('/api/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => undefined)
    await sub.unsubscribe().catch(() => undefined)
  } else {
    await api('/api/push/unsubscribe', { method: 'POST', body: {} }).catch(() => undefined)
  }
  emitPushChange()
}

export async function syncPushIfGranted(): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted' || pushNeedsInstall()) return
  try {
    await enablePush()
  } catch {
    /* ignore */
  }
}
