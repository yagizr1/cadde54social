import { appPath } from '../lib/appPath'
import { uid } from '../lib/utils'
import type { AppNotification } from '../types'
import { settingsService } from './settingsService'
import { getItem, setItem } from './storage'
import { sync } from './syncService'

function all(): AppNotification[] {
  return getItem<AppNotification[]>('notifications', [])
}

function visibleTo(n: AppNotification, userId: string): boolean {
  if (n.recipientId) return n.recipientId === userId
  if (n.actorId === userId) return false
  return true
}

function pathId(href: string | undefined, kind: 'p' | 'reels' | 'messages'): string | undefined {
  const m = String(href ?? '').match(new RegExp(`/${kind}/([^/?#]+)`))
  return m?.[1]
}

function inferGroupKey(n: Pick<AppNotification, 'type' | 'actorId' | 'href' | 'groupKey' | 'text'>): string | undefined {
  if (n.groupKey) return n.groupKey
  const href = n.href
  const postId = pathId(href, 'p')
  const reelId = pathId(href, 'reels')
  const convId = pathId(href, 'messages')
  const text = String(n.text ?? '').toLowerCase()
  if (n.type === 'like') {
    if (text.includes('yorum')) return n.actorId && postId ? `like:comment:${postId}:${n.actorId}` : n.groupKey
    if (postId) return `like:post:${postId}`
    if (reelId) return `like:reel:${reelId}`
    if (text.includes('story')) return n.actorId ? `like:story-actor:${n.actorId}` : undefined
  }
  if (n.type === 'comment' && n.actorId) {
    if (postId) return `comment:post:${postId}:${n.actorId}`
    if (reelId) return `comment:reel:${reelId}:${n.actorId}`
  }
  if (n.type === 'follow' && n.actorId) return `follow:${n.actorId}`
  if (n.type === 'view' && n.actorId) {
    return text.includes('profil') ? `view:profile:${n.actorId}` : `view:story:${n.actorId}`
  }
  if (n.type === 'message' && convId) return `message:${convId}`
  if (n.type === 'mention' && n.actorId) return `mention:${href ?? ''}:${n.actorId}`
  if (n.type === 'meet_like') return 'meet_like'
  if (n.type === 'repost' && n.actorId) return `repost:${href ?? ''}:${n.actorId}`
  return undefined
}

function notifyKey(n: Pick<AppNotification, 'type' | 'recipientId' | 'actorId' | 'href' | 'groupKey' | 'text'>): string | null {
  const groupKey = inferGroupKey(n)
  if (groupKey && n.recipientId) return `${n.recipientId}:${groupKey}`
  return null
}

function mergeActors(existing: AppNotification, actorId?: string): string[] {
  const ids = [...(existing.actorIds ?? (existing.actorId ? [existing.actorId] : []))]
  if (actorId && !ids.includes(actorId)) ids.push(actorId)
  return ids
}

function collapseGrouped(items: AppNotification[]): AppNotification[] {
  const grouped = new Map<string, AppNotification>()
  const rest: AppNotification[] = []
  for (const n of items) {
    const key = notifyKey(n)
    if (!key) {
      rest.push(n)
      continue
    }
    const prev = grouped.get(key)
    if (!prev) {
      grouped.set(key, {
        ...n,
        groupKey: inferGroupKey(n),
        actorIds: n.actorIds ?? (n.actorId ? [n.actorId] : []),
      })
      continue
    }
    grouped.set(key, {
      ...prev,
      actorIds: [...new Set([...mergeActors(prev, n.actorId), ...(n.actorIds ?? [])])],
      read: prev.read && n.read,
    })
  }
  return [...grouped.values(), ...rest].sort((a, b) => b.createdAt - a.createdAt)
}

export const notificationService = {
  list(userId: string): AppNotification[] {
    return collapseGrouped(
      all()
        .filter((n) => visibleTo(n, userId))
        .filter((n) => !n.actorId || settingsService.visibleTo(userId, n.actorId))
        .sort((a, b) => b.createdAt - a.createdAt),
    )
  },

  unreadCount(userId: string): number {
    return this.list(userId).filter((n) => !n.read).length
  },

  push(n: AppNotification): boolean {
    if (n.actorId && n.recipientId && n.actorId === n.recipientId) return false
    if (n.actorId && n.recipientId && settingsService.iBlocked(n.actorId, n.recipientId)) return false
    if (n.recipientId && !settingsService.wantsNotify(n.recipientId, n.type)) return false
    const key = notifyKey(n)
    const list = all()
    if (key) {
      const idx = list.findIndex((x) => notifyKey(x) === key)
      if (idx >= 0) {
        const prev = list[idx]
        const actorIds = mergeActors(prev, n.actorId)
        const next: AppNotification = {
          ...prev,
          ...n,
          id: prev.id,
          actorId: n.actorId ?? prev.actorId,
          actorIds,
          groupKey: inferGroupKey({ ...prev, ...n }),
          createdAt: Date.now(),
          read: false,
          href: n.href ?? prev.href,
          image: n.image ?? prev.image,
          text: n.text || prev.text,
        }
        setItem('notifications', [next, ...list.filter((_, i) => i !== idx)].slice(0, 80))
        return false
      }
    }
    const row = {
      ...n,
      groupKey: inferGroupKey(n),
      actorIds: n.actorId ? [n.actorId] : n.actorIds,
    }
    setItem('notifications', [row, ...list].slice(0, 80))
    return true
  },

  notify(input: Omit<AppNotification, 'id' | 'read' | 'createdAt'> & { recipientId: string; persist?: boolean }): void {
    const { persist, ...rest } = input
    const fresh = this.push({
      id: uid('n'),
      read: false,
      createdAt: Date.now(),
      ...rest,
      href: rest.href ? appPath(rest.href) : rest.href,
    })
    if (persist || rest.type === 'mention') {
      sync('notifications.push', { ...rest })
    }
    void fresh
  },

  markRead(id: string): void {
    setItem(
      'notifications',
      all().map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  },

  markAllRead(userId: string): void {
    setItem(
      'notifications',
      all().map((n) => (visibleTo(n, userId) ? { ...n, read: true } : n)),
    )
    sync('notifications.readAll')
  },

  remove(ids: string[]): void {
    if (!ids.length) return
    const list = all()
    const keys = new Set(
      list.filter((n) => ids.includes(n.id)).map((n) => notifyKey(n)).filter((k): k is string => Boolean(k)),
    )
    const drop = new Set(
      list.filter((n) => ids.includes(n.id) || (notifyKey(n) && keys.has(notifyKey(n) as string))).map((n) => n.id),
    )
    setItem(
      'notifications',
      list.filter((n) => !drop.has(n.id)),
    )
    sync('notifications.remove', { ids: [...drop] })
  },
}
