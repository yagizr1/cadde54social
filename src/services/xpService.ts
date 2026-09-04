import { uid } from '../lib/utils'
import type { XpEvent } from '../types'
import { getItem, setItem } from './storage'
import { userService } from './userService'

type XpListener = (event: XpEvent) => void
const listeners = new Set<XpListener>()

export const xpService = {
  history(): XpEvent[] {
    return getItem<XpEvent[]>('xpHistory', [])
  },

  subscribe(fn: XpListener): () => void {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },

  add(userId: string, amount: number, reason: string): number {
    if (amount <= 0) return userService.getById(userId)?.xp ?? 0
    const user = userService.getById(userId)
    if (!user) return 0
    const nextXp = user.xp + amount
    userService.update(userId, { xp: nextXp })
    const event: XpEvent = {
      id: uid('xp'),
      amount,
      reason,
      createdAt: Date.now(),
    }
    const history = getItem<XpEvent[]>('xpHistory', [])
    setItem('xpHistory', [event, ...history].slice(0, 80))
    listeners.forEach((fn) => fn(event))
    return nextXp
  },
}
