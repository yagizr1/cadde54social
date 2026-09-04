import { useCallback, useState } from 'react'
import { useAuthStore } from '../store/authStore'

export function useApp() {
  const user = useAuthStore((s) => s.user)
  const refreshUser = useAuthStore((s) => s.refresh)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(async () => {
    await refreshUser()
    setTick((n) => n + 1)
  }, [refreshUser])

  return { user, refresh, tick }
}
