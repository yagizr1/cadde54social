type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __c54pwa?: BeforeInstallPromptEvent | null
  }
}

const listeners = new Set<() => void>()
let listening = false

function emit(): void {
  for (const fn of listeners) fn()
}

function currentPrompt(): BeforeInstallPromptEvent | null {
  return window.__c54pwa ?? null
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function listenPwaInstall(): void {
  if (listening) return
  listening = true
  window.addEventListener('c54-pwa-ready', emit)
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    window.__c54pwa = event as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    window.__c54pwa = null
    emit()
  })
}

export function subscribePwaInstall(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (isStandalone()) return 'accepted'
  let event = currentPrompt()
  if (!event) {
    const until = Date.now() + 4000
    while (!event && Date.now() < until) {
      await wait(80)
      event = currentPrompt()
    }
  }
  if (!event) return 'unavailable'
  await event.prompt()
  const { outcome } = await event.userChoice
  window.__c54pwa = null
  emit()
  return outcome
}
