import { api, getToken, setToken } from '../lib/api'
import { handleize } from '../lib/utils'
import type { Credentials, Gender, Session, User } from '../types'
import { getItem, removeItem, setItem } from './storage'
import { applySnapshot, type AppSnapshot } from './syncService'
import { userService } from './userService'

interface RegisterInput {
  name: string
  username: string
  email: string
  password: string
  gender: Gender
}

function creds(): Credentials[] {
  return getItem<Credentials[]>('credentials', [])
}

function applyAuth(data: { token: string; user: User; snapshot?: AppSnapshot }): User {
  setToken(data.token)
  if (data.snapshot) applySnapshot(data.snapshot)
  else userService.upsert(data.user)
  authService.setSession(data.user)
  return userService.getById(data.user.id) ?? data.user
}

export const authService = {
  getSession(): Session | null {
    return getItem<Session | null>('session', null)
  },

  currentUser(): User | null {
    const session = this.getSession()
    if (!session) return null
    return userService.getById(session.userId) ?? null
  },

  async login(username: string, password: string): Promise<User> {
    const data = await api<{ token: string; user: User; snapshot: AppSnapshot }>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    })
    return applyAuth(data)
  },

  resolveEmail(input: string): string {
    const raw = input.trim()
    const user = userService.getByUsername(raw) ?? userService.getByEmail(raw)
    if (user) return user.email
    const entry = creds().find(
      (c) => c.username === handleize(raw) || c.email === raw.toLowerCase(),
    )
    return entry?.email ?? raw.toLowerCase()
  },

  async requestPasswordReset(input: string): Promise<string> {
    const email = this.resolveEmail(input)
    const res = await fetch('/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; email?: string }
    if (!res.ok || !data.ok) throw new Error(data.error || 'E-posta gönderilemedi')
    return data.email || email
  },

  async confirmPasswordReset(email: string, code: string, password: string): Promise<void> {
    if (password.length < 6) throw new Error('Şifre en az 6 karakter olmalı')
    const res = await fetch('/api/auth/forgot/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password }),
    })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    if (!res.ok || !data.ok) throw new Error(data.error || 'Kod doğrulanamadı')
  },

  async register(input: RegisterInput): Promise<User> {
    const data = await api<{ token: string; user: User; snapshot: AppSnapshot }>('/api/auth/register', {
      method: 'POST',
      body: input,
    })
    return applyAuth(data)
  },

  async changePassword(_username: string, current: string, next: string): Promise<void> {
    if (next.length < 6) throw new Error('Yeni şifre en az 6 karakter olmalı')
    await api('/api/actions/auth.changePassword', { method: 'POST', body: { current, next } })
  },

  async logout(): Promise<void> {
    if (getToken()) {
      try {
        const { disablePush } = await import('../lib/webPush')
        await disablePush()
      } catch {
        /* ignore */
      }
      await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    }
    setToken(null)
    removeItem('session')
  },

  setSession(user: User): void {
    setItem<Session>('session', { userId: user.id, username: user.username })
  },
}
