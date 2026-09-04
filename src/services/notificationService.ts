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

export const notificationService = {
  list(userId: string): AppNotification[] {
    return all()
      .filter((n) => visibleTo(n, userId))
      .filter((n) => !n.actorId || settingsService.visibleTo(userId, n.actorId))
      .sort((a, b) => b.createdAt - a.createdAt)
  },

  unreadCount(userId: string): number {
    return this.list(userId).filter((n) => !n.read).length
  },

  push(n: AppNotification): void {
    if (n.actorId && n.recipientId && n.actorId === n.recipientId) return
    if (n.actorId && n.recipientId && settingsService.iBlocked(n.actorId, n.recipientId)) return
    if (n.recipientId && !settingsService.wantsNotify(n.recipientId, n.type)) return
    setItem('notifications', [n, ...all()].slice(0, 80))
  },

  notify(input: Omit<AppNotification, 'id' | 'read' | 'createdAt'> & { recipientId: string; persist?: boolean }): void {
    const { persist, ...rest } = input
    this.push({
      id: uid('n'),
      read: false,
      createdAt: Date.now(),
      ...rest,
      href: rest.href ? appPath(rest.href) : rest.href,
    })
    if (persist || rest.type === 'mention') {
      sync('notifications.push', { ...rest })
    }
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
    const drop = new Set(ids)
    setItem(
      'notifications',
      all().filter((n) => !drop.has(n.id)),
    )
    sync('notifications.remove', { ids })
  },
}
