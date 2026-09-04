import { isAdminUser } from '../lib/admin'
import { isSuspendedUser } from '../lib/accountStatus'
import { ADMIN_ID, HERE_LEFT_MS } from '../lib/constants'
import { handleize } from '../lib/utils'
import type { HereSession, User } from '../types'
import { notificationService } from './notificationService'
import { settingsService } from './settingsService'
import { getItem, setItem } from './storage'
import { sync } from './syncService'

function closeHereSession(userId: string, at: number): void {
  const list = getItem<HereSession[]>('hereSessions', [])
  let changed = false
  const next = list.map((s) => {
    if (s.userId !== userId || s.endedAt != null) return s
    changed = true
    return { ...s, endedAt: Math.max(s.startedAt, at) }
  })
  if (changed) setItem('hereSessions', next)
}

function withGender(user: User): User {
  return { ...user, gender: user.gender ?? 'unspecified' }
}

function expirePresence(users: User[]): User[] {
  const now = Date.now()
  let changed = false
  const next = users.map((u) => {
    let row = u
    if (row.hereUntil && row.hereUntil < now) {
      changed = true
      closeHereSession(row.id, row.hereUntil)
      row = { ...row, hereUntil: null, hereLeftAt: row.hereLeftAt ?? row.hereUntil, hereDemo: false }
    }
    if (row.hereLeftAt && now - row.hereLeftAt >= HERE_LEFT_MS) {
      changed = true
      row = { ...row, hereLeftAt: null }
    }
    return row
  })
  if (changed) setItem('users', next)
  return next
}

export const userService = {
  list(): User[] {
    const rows = expirePresence(getItem<User[]>('users', [])).map(withGender)
    const session = getItem<{ userId?: string } | null>('session', null)
    const me = rows.find((u) => u.id === session?.userId)
    if (isAdminUser(me)) return rows
    return rows
      .filter((u) => u.id === me?.id || (!isAdminUser(u) && !u.banned && !isSuspendedUser(u)))
      .map((u) => ({
        ...u,
        followers: u.followers.filter((id) => id !== ADMIN_ID),
        following: u.following.filter((id) => id !== ADMIN_ID),
      }))
  },

  save(users: User[]): void {
    setItem('users', users)
  },

  getById(id: string): User | undefined {
    return this.list().find((u) => u.id === id)
  },

  getByUsername(username: string): User | undefined {
    const handle = handleize(username)
    return this.list().find((u) => u.username.toLowerCase() === handle)
  },

  getByEmail(email: string): User | undefined {
    return this.list().find((u) => u.email.toLowerCase() === email.toLowerCase())
  },

  upsert(user: User): User {
    const users = this.list()
    const idx = users.findIndex((u) => u.id === user.id)
    if (idx >= 0) users[idx] = user
    else users.push(user)
    this.save(users)
    return user
  },

  update(id: string, patch: Partial<User>): User | undefined {
    const user = this.getById(id)
    if (!user) return undefined
    const clean: Partial<User> = { ...patch }
    if (clean.meetPhotos) clean.meetPhotos = clean.meetPhotos.filter(Boolean).slice(0, 3)
    const next = { ...user, ...clean, id: user.id }
    this.upsert(next)
    const synced: Record<string, unknown> = {}
    for (const key of ['name', 'bio', 'avatar', 'theme', 'gender', 'age', 'showInMeet', 'meetPhotos', 'meetPhotosReady', 'username', 'email'] as const) {
      if (clean[key] !== undefined) synced[key] = clean[key]
    }
    if (Object.keys(synced).length) sync('users.update', synced)
    return next
  },

  follow(meId: string, targetId: string, persist = true, notify = true): void {
    if (meId === targetId) return
    if (settingsService.iBlocked(targetId, meId)) return
    const me = this.getById(meId)
    const target = this.getById(targetId)
    if (!me || !target || isAdminUser(target) || target.banned || isSuspendedUser(target)) return
    const already = me.following.includes(targetId)
    if (!already) me.following = [...me.following, targetId]
    if (!target.followers.includes(meId)) target.followers = [...target.followers, meId]
    this.upsert(me)
    this.upsert(target)
    if (!already) {
      if (persist) sync('users.follow', { targetId, silent: !notify })
      if (notify) {
        notificationService.notify({
          type: 'follow',
          actorId: meId,
          recipientId: targetId,
          text: 'seni takip etmeye başladı',
          href: `/u/${me.username}`,
          groupKey: `follow:${meId}`,
        })
      }
    }
  },

  unfollow(meId: string, targetId: string, persist = true): void {
    const me = this.getById(meId)
    const target = this.getById(targetId)
    if (!me || !target) return
    me.following = me.following.filter((id) => id !== targetId)
    target.followers = target.followers.filter((id) => id !== meId)
    this.upsert(me)
    this.upsert(target)
    if (persist) sync('users.unfollow', { targetId })
  },

  removeFollower(meId: string, followerId: string): void {
    this.unfollow(followerId, meId, false)
    sync('users.removeFollower', { followerId })
  },
}
