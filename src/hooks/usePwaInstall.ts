import { useEffect, useState } from 'react'
import {
  isIos,
  isStandalone,
  promptPwaInstall,
  subscribePwaInstall,
} from '../lib/pwaInstall'

export function usePwaInstall() {
  const [tick, setTick] = useState(0)
  useEffect(() => subscribePwaInstall(() => setTick((n) => n + 1)), [])
  void tick
  return {
    installed: isStandalone(),
    ios: isIos(),
    prompt: promptPwaInstall,
  }
}
