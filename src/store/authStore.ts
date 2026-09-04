import { create } from 'zustand'
import { getToken, setToken } from '../lib/api'
import { seedIfNeeded } from '../data/seed'
import { accountService } from '../services/accountService'
import { authService } from '../services/authService'
import { challengeService } from '../services/challengeService'
import { notificationService } from '../services/notificationService'
import { settingsService } from '../services/settingsService'
import { getItem, setItem } from '../services/storage'
import { pullSnapshot } from '../services/syncService'
import { userService } from '../services/userService'
import type { Gender, SavedAccount, User } from '../types'

interface AuthState {
  user: User | null
  hydrated: boolean
  refresh: () => Promise<void>
  login: (username: string, password: string) => Promise<User>
  register: (input: { name: string; username: string; email: string; password: string; gender: Gender }) => Promise<User>
  logout: () => Promise<User | null>
  switchTo: (userId: string) => Promise<User>
  switchToNext: () => Promise<boolean>
}

function knownOnThisDevice(userId: string): boolean {
  return getItem<string[]>('knownLoginUsers', []).includes(userId)
}

function rememberThisDevice(userId: string): void {
  const list = getItem<string[]>('knownLoginUsers', [])
  if (list.includes(userId)) return
  setItem('knownLoginUsers', [...list, userId])
}

function afterLogin(user: User): User {
  challengeService.recordLogin(user.id)
  const seen = knownOnThisDevice(user.id)
  if (settingsService.get(user.id).loginAlerts && !seen) {
    notificationService.notify({
      type: 'xp',
      recipientId: user.id,
      text: 'Yeni giriş algılandı · bu cihaz',
      href: '/settings',
      persist: true,
    })
  }
  rememberThisDevice(user.id)
  return userService.getById(user.id) ?? user
}

async function activateSaved(
  acc: SavedAccount,
  previous: { token: string | null; user: User | null },
): Promise<User> {
  if (!acc.token) throw new Error('Bu hesaba tekrar giriş yap')
  setToken(acc.token)
  try {
    const snap = await pullSnapshot()
    const user = snap.me ?? authService.currentUser()
    if (!user) throw new Error('Oturum geçersiz')
    authService.setSession(user)
    accountService.remember(user)
    rememberThisDevice(user.id)
    accountService.markSwitchedFrom(previous.user?.id)
    useAuthStore.setState({ user, hydrated: true })
    return user
  } catch {
    if (previous.token) setToken(previous.token)
    else setToken(null)
    if (previous.user) authService.setSession(previous.user)
    throw new Error('Hesaba geçilemedi, tekrar giriş yap')
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hydrated: false,
  refresh: async () => {
    try {
      if (getToken()) {
        const snap = await pullSnapshot()
        const user = snap.me ?? authService.currentUser()
        if (user) {
          accountService.remember(user)
          rememberThisDevice(user.id)
        }
        set({ user, hydrated: true })
        return
      }
    } catch {
      /* API yoksa yerel oturum */
    }
    seedIfNeeded()
    const user = authService.currentUser()
    if (user) {
      accountService.remember(user)
      rememberThisDevice(user.id)
    }
    set({ user, hydrated: true })
  },
  login: async (username, password) => {
    accountService.rememberCurrent()
    const user = afterLogin(await authService.login(username, password))
    accountService.remember(user)
    set({ user })
    return user
  },
  register: async (input) => {
    accountService.rememberCurrent()
    const user = afterLogin(await authService.register(input))
    accountService.remember(user)
    set({ user })
    return user
  },
  logout: async () => {
    const current = get().user
    const others = accountService.list().filter((a) => a.userId !== current?.id)
    await authService.logout()
    if (current) accountService.remove(current.id)
    if (others[0]?.token) {
      try {
        return await activateSaved(others[0], { token: null, user: null })
      } catch {
        set({ user: null })
        return null
      }
    }
    set({ user: null })
    return null
  },
  switchTo: async (userId) => {
    const current = get().user
    if (current?.id === userId) return current
    accountService.rememberCurrent()
    const acc = accountService.get(userId)
    if (!acc) throw new Error('Hesap bulunamadı')
    return activateSaved(acc, { token: getToken(), user: current })
  },
  switchToNext: async () => {
    const next = accountService.next(get().user?.id)
    if (!next) return false
    await get().switchTo(next.userId)
    return true
  },
}))
