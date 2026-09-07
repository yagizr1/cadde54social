import { create } from 'zustand'

export const useLiveStore = create<{
  seq: number
  connected: boolean
  typing: Record<string, { userId: string; until: number }>
  bump: () => void
  setConnected: (on: boolean) => void
  setTyping: (conversationId: string, userId: string, on: boolean) => void
  applyTyping: (rows: Array<{ conversationId: string; userId: string; until: number }>) => void
}>((set, get) => ({
  seq: 0,
  connected: false,
  typing: {},
  bump: () => set((s) => ({ seq: s.seq + 1 })),
  setConnected: (on) => set({ connected: on }),
  setTyping: (conversationId, userId, on) => {
    const typing = { ...get().typing }
    if (on) {
      const prev = typing[conversationId]
      const keep = prev?.userId === userId && prev.until > Date.now()
      typing[conversationId] = { userId, until: Date.now() + 3500 }
      window.setTimeout(() => {
        const row = useLiveStore.getState().typing[conversationId]
        if (row && row.until <= Date.now()) {
          const next = { ...useLiveStore.getState().typing }
          delete next[conversationId]
          useLiveStore.setState((s) => ({ typing: next, seq: s.seq + 1 }))
        }
      }, 3600)
      if (keep) {
        set({ typing })
        return
      }
    } else if (typing[conversationId]?.userId === userId) {
      delete typing[conversationId]
    } else {
      return
    }
    set((s) => ({ typing, seq: s.seq + 1 }))
  },
  applyTyping: (rows) => {
    const now = Date.now()
    const typing = { ...get().typing }
    for (const [id, row] of Object.entries(typing)) {
      if (row.until <= now) delete typing[id]
    }
    for (const row of rows) {
      if (row.until > now) typing[row.conversationId] = { userId: row.userId, until: row.until }
    }
    if (JSON.stringify(typing) === JSON.stringify(get().typing)) return
    set((s) => ({ typing, seq: s.seq + 1 }))
  },
}))

export function liveTypingIn(conversationId: string, otherId?: string): boolean {
  if (!otherId) return false
  const row = useLiveStore.getState().typing[conversationId]
  return Boolean(row && row.userId === otherId && row.until > Date.now())
}
