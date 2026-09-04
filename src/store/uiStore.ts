import { create } from 'zustand'
import { xpService } from '../services/xpService'
import type { XpEvent } from '../types'

export interface ToastItem {
  id: string
  message: string
  tone?: 'ok' | 'err' | 'info'
}

interface UiState {
  toasts: ToastItem[]
  xpBurst: XpEvent | null
  createOpen: boolean
  accountSwitcherOpen: boolean
  storyViewer: { userIds: string[]; index: number } | null
  toast: (message: string, tone?: ToastItem['tone']) => void
  dismiss: (id: string) => void
  setCreateOpen: (open: boolean) => void
  setAccountSwitcher: (open: boolean) => void
  openStories: (userIds: string[], index: number) => void
  closeStories: () => void
  clearXp: () => void
}

let toastSeq = 0

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  xpBurst: null,
  createOpen: false,
  accountSwitcherOpen: false,
  storyViewer: null,
  toast: (message, tone = 'ok') => {
    const id = `t_${++toastSeq}`
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }))
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 2800)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setCreateOpen: (open) => set({ createOpen: open }),
  setAccountSwitcher: (open) => set({ accountSwitcherOpen: open }),
  openStories: (userIds, index) => set({ storyViewer: { userIds, index } }),
  closeStories: () => set({ storyViewer: null }),
  clearXp: () => set({ xpBurst: null }),
}))

xpService.subscribe((event) => {
  useUiStore.setState({ xpBurst: event })
  useUiStore.getState().toast(`+${event.amount} XP · ${event.reason}`, 'ok')
  window.setTimeout(() => {
    useUiStore.setState((s) => (s.xpBurst?.id === event.id ? { xpBurst: null } : s))
  }, 1600)
})
