import { uid } from '../lib/utils'
import type { HereSession, User } from '../types'
import { settingsService } from './settingsService'
import { getItem, setItem } from './storage'
import { userService } from './userService'

export type StayPeriod = 'weekly' | 'monthly' | 'all'

function all(): HereSession[] {
  return getItem<HereSession[]>('hereSessions', [])
}

function save(list: HereSession[]): void {
  setItem('hereSessions', list)
}

export function stayPeriodRange(period: StayPeriod, now = Date.now()): { from: number; to: number } {
  if (period === 'all') return { from: 0, to: now }
  const d = new Date(now)
  if (period === 'monthly') {
    return { from: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), to: now }
  }
  const mondayOffset = (d.getDay() + 6) % 7
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - mondayOffset)
  return { from: start.getTime(), to: now }
}

function overlapMs(start: number, end: number, from: number, to: number): number {
  return Math.max(0, Math.min(end, to) - Math.max(start, from))
}

export function formatStay(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000))
  if (min < 1) return '0 dk'
  if (min < 60) return `${min} dk`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h >= 24 && m === 0) {
    const days = Math.floor(h / 24)
    const rem = h % 24
    if (rem === 0) return `${days} gün`
    return `${days} gün ${rem} sa`
  }
  return m === 0 ? `${h} sa` : `${h} sa ${m} dk`
}

export const hereTimeService = {
  list(): HereSession[] {
    return all()
  },

  start(userId: string, at = Date.now()): HereSession {
    const open = all().find((s) => s.userId === userId && s.endedAt == null)
    if (open) return open
    const row: HereSession = { id: uid('hs'), userId, startedAt: at, endedAt: null }
    save([row, ...all()])
    return row
  },

  end(userId: string, at = Date.now()): void {
    let changed = false
    const next = all().map((s) => {
      if (s.userId !== userId || s.endedAt != null) return s
      changed = true
      return { ...s, endedAt: Math.max(s.startedAt, at) }
    })
    if (changed) save(next)
  },

  msFor(userId: string, period: StayPeriod, now = Date.now()): number {
    const { from, to } = stayPeriodRange(period, now)
    return all()
      .filter((s) => s.userId === userId)
      .reduce((sum, s) => sum + overlapMs(s.startedAt, s.endedAt ?? now, from, to), 0)
  },

  rank(viewerId: string, period: StayPeriod): { user: User; ms: number }[] {
    return userService
      .list()
      .filter((u) => settingsService.visibleTo(viewerId, u.id))
      .map((user) => ({ user, ms: this.msFor(user.id, period) }))
      .sort((a, b) => b.ms - a.ms || b.user.xp - a.user.xp)
  },
}
