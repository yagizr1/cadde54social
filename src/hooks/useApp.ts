import { useCallback, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useLiveStore } from '../store/liveStore'

export function useApp() {
  const user = useAuthStore((s) => s.user)
  const refreshUser = useAuthStore((s) => s.refresh)
  const liveSeq = useLiveStore((s) => s.seq)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(async () => {
    await refreshUser()
    setTick((n) => n + 1)
  }, [refreshUser])

  return { user, refresh, tick: tick + liveSeq }
}
