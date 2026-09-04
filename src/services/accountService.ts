import { getToken } from '../lib/api'
import type { SavedAccount, User } from '../types'
import { authService } from './authService'
import { getItem, setItem } from './storage'

const KEY = 'savedAccounts'
const LAST_KEY = 'lastSwitchedAccount'

function all(): SavedAccount[] {
  return getItem<SavedAccount[]>(KEY, [])
}

function save(list: SavedAccount[]): void {
  setItem(KEY, list)
}

export const accountService = {
  list(): SavedAccount[] {
    return all().sort((a, b) => b.lastUsedAt - a.lastUsedAt)
  },

  get(userId: string): SavedAccount | undefined {
    return all().find((a) => a.userId === userId)
  },

  remember(user: User): void {
    const token = getToken()
    if (!token) return
    const list = all()
    const next: SavedAccount = {
      userId: user.id,
      username: user.username,
      name: user.name,
      avatar: user.avatar,
      token,
      lastUsedAt: Date.now(),
    }
    const idx = list.findIndex((a) => a.userId === user.id)
    if (idx >= 0) list[idx] = { ...list[idx], ...next }
    else list.push(next)
    save(list)
  },

  rememberCurrent(): void {
    const user = authService.currentUser()
    if (user) this.remember(user)
  },

  remove(userId: string): void {
    save(all().filter((a) => a.userId !== userId))
    if (getItem<string | null>(LAST_KEY, null) === userId) setItem(LAST_KEY, null)
  },

  markSwitchedFrom(userId?: string): void {
    if (userId) setItem(LAST_KEY, userId)
  },

  next(currentId?: string): SavedAccount | undefined {
    const others = all().filter((a) => a.userId !== currentId)
    if (!others.length) return undefined
    const lastId = getItem<string | null>(LAST_KEY, null)
    return others.find((a) => a.userId === lastId) ?? others.sort((a, b) => b.lastUsedAt - a.lastUsedAt)[0]
  },
}
