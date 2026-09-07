import { useEffect } from 'react'
import { getToken } from '../lib/api'
import { connectLive, pullChatSync } from '../services/liveService'
import { useAuthStore } from '../store/authStore'
import { useLiveStore } from '../store/liveStore'

export function useLiveSync() {
  const userId = useAuthStore((s) => s.user?.id)
  const connected = useLiveStore((s) => s.connected)

  useEffect(() => {
    if (!userId || !getToken()) return
    const ac = new AbortController()
    let wait = 400

    async function run() {
      while (!ac.signal.aborted) {
        try {
          await connectLive(ac.signal)
          wait = 400
        } catch {
          if (ac.signal.aborted) return
          await new Promise((r) => setTimeout(r, wait))
          wait = Math.min(4000, wait * 1.6)
        }
      }
    }

    void run()
    return () => ac.abort()
  }, [userId])

  useEffect(() => {
    if (!userId || !getToken()) return
    let timer = 0
    let alive = true

    async function tick() {
      try {
        await pullChatSync()
      } catch {
        /* ağ yoksa sessiz */
      }
      if (!alive) return
      timer = window.setTimeout(tick, useLiveStore.getState().connected ? 4000 : 700)
    }

    void tick()
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [userId, connected])
}
