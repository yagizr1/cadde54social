import { api, getToken } from '../lib/api'
import { getItem, setItem } from './storage'
import type { User } from '../types'

export type AppSnapshot = {
  users?: unknown
  posts?: unknown
  stories?: unknown
  reels?: unknown
  conversations?: unknown
  notifications?: unknown
  settings?: unknown
  blockedBy?: unknown
  meetups?: unknown
  meetupRequests?: unknown
  swipes?: unknown
  matches?: unknown
  reposts?: unknown
  confessions?: unknown
  profileViews?: unknown
  xpHistory?: unknown
  challengeStates?: unknown
  unlockedBadges?: unknown
  loginDays?: unknown
  interactUsers?: unknown
  completedHere?: unknown
  hereSessions?: unknown
  feedback?: unknown
  userReports?: unknown
  searchHistory?: unknown
  commentCount?: unknown
  completedChallengeCount?: unknown
  session?: { userId: string; username: string } | null
  me?: User | null
}

const SNAPSHOT_KEYS = [
  'users',
  'posts',
  'stories',
  'reels',
  'conversations',
  'notifications',
  'settings',
  'blockedBy',
  'meetups',
  'meetupRequests',
  'swipes',
  'matches',
  'reposts',
  'confessions',
  'profileViews',
  'xpHistory',
  'challengeStates',
  'unlockedBadges',
  'loginDays',
  'interactUsers',
  'completedHere',
  'hereSessions',
  'feedback',
  'userReports',
  'searchHistory',
  'commentCount',
  'completedChallengeCount',
] as const

export function applySnapshot(snap: AppSnapshot | null | undefined): void {
  if (!snap) return
  for (const key of SNAPSHOT_KEYS) {
    if (snap[key] === undefined) continue
    if (key === 'settings') {
      const mine = (snap.settings as { userId?: string }[]) ?? []
      const mineIds = new Set(mine.map((s) => s.userId).filter(Boolean))
      const prev = getItem<{ userId: string }[]>('settings', [])
      setItem('settings', [...prev.filter((s) => !mineIds.has(s.userId)), ...mine])
      continue
    }
    setItem(key, snap[key])
  }
  if (snap.session) setItem('session', snap.session)
  setItem('seeded', true)
}

export async function pullSnapshot(): Promise<AppSnapshot> {
  const data = await api<{ snapshot: AppSnapshot; me?: User }>('/api/snapshot')
  applySnapshot(data.snapshot)
  return { ...data.snapshot, me: data.me ?? data.snapshot.me ?? null }
}

export function sync(name: string, body: Record<string, unknown> = {}): Promise<void> {
  if (!getToken()) return Promise.resolve()
  return api(`/api/actions/${encodeURIComponent(name)}`, { method: 'POST', body })
    .then(() => undefined)
    .catch((err) => {
      console.warn('[api]', name, err)
    })
}
