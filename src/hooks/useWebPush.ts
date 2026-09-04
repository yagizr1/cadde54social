import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import {
  dismissPushPrompt,
  enablePush,
  pushDismissed,
  pushNeedsInstall,
  pushPermission,
  pushSupported,
  subscribePushChange,
  syncPushIfGranted,
} from '../lib/webPush'

export function useWebPush() {
  const user = useAuthStore((s) => s.user)
  const [permission, setPermission] = useState(pushPermission())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [hidden, setHidden] = useState(() => pushDismissed())

  useEffect(() => {
    return subscribePushChange(() => {
      setPermission(pushPermission())
      setHidden(pushDismissed())
    })
  }, [])

  useEffect(() => {
    if (!user) return
    void syncPushIfGranted()
  }, [user])

  const needsInstall = pushNeedsInstall()
  const supported = pushSupported() || needsInstall
  const granted = permission === 'granted'
  const showPrompt = Boolean(user && supported && !granted && !hidden && permission !== 'denied')

  async function enable() {
    setBusy(true)
    setError('')
    try {
      await enablePush()
      setPermission('granted')
      dismissPushPrompt()
      setHidden(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bildirim açılamadı')
      setPermission(pushPermission())
      throw err
    } finally {
      setBusy(false)
    }
  }

  function dismiss() {
    dismissPushPrompt()
    setHidden(true)
  }

  return {
    supported,
    needsInstall,
    granted,
    denied: permission === 'denied',
    busy,
    error,
    showPrompt,
    enable,
    dismiss,
  }
}
