import type { NavigateFunction } from 'react-router-dom'

export type CreateTab = 'post' | 'story' | 'reel'

const routes: Record<CreateTab, string> = {
  post: '/create/post',
  story: '/create/story',
  reel: '/create/reel',
}

export function pickerAccept(tab: CreateTab): string {
  return tab === 'reel' ? 'video/*' : 'image/*'
}

type Payload = { tab: CreateTab; files: File[] }

let last: Payload | null = null
const listeners = new Set<(payload: Payload) => void>()

export function subscribeCreateFiles(cb: (payload: Payload) => void): () => void {
  listeners.add(cb)
  if (last?.files.length) cb(last)
  return () => {
    listeners.delete(cb)
  }
}

export function pushCreateFiles(tab: CreateTab, files: File[]): void {
  if (!files.length) return
  last = { tab, files }
  listeners.forEach((fn) => fn(last as Payload))
}

export function clearCreateFiles(): void {
  last = null
}

function pickFiles(tab: CreateTab, onFiles: (files: File[]) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = pickerAccept(tab)
  input.multiple = tab === 'post'
  input.style.position = 'fixed'
  input.style.left = '-9999px'
  const cleanup = () => {
    input.remove()
    window.removeEventListener('focus', onFocus)
  }
  const onFocus = () => {
    window.setTimeout(cleanup, 800)
  }
  input.addEventListener('change', () => {
    onFiles([...(input.files ?? [])])
    cleanup()
  })
  window.addEventListener('focus', onFocus)
  document.body.appendChild(input)
  input.click()
}

export function openCreatePicker(tab: CreateTab): void {
  pickFiles(tab, (files) => pushCreateFiles(tab, files))
}

export function startCreate(navigate: NavigateFunction, tab: CreateTab = 'post'): void {
  pickFiles(tab, (files) => {
    if (!files.length) return
    last = { tab, files }
    navigate(routes[tab])
    queueMicrotask(() => {
      if (last) listeners.forEach((fn) => fn(last as Payload))
    })
  })
}
