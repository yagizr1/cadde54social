import { MIN_AGE } from '../lib/constants'
import type { AudiencePrivacy, MessagePrivacy, UserSettings } from '../types'
import { getItem, setItem } from './storage'
import { sync } from './syncService'
import { userService } from './userService'

const defaults = (userId: string): UserSettings => ({
  userId,
  privateAccount: false,
  hideHereStatus: false,
  hideLikes: false,
  ghostMode: false,
  allowMessages: 'everyone',
  allowComments: 'everyone',
  allowMentions: 'everyone',
  allowTags: 'everyone',
  allowStoryReplies: true,
  hiddenWords: [],
  loginAlerts: true,
  notifyPaused: false,
  notifyLikes: true,
  notifyComments: true,
  notifyFollows: true,
  notifyMessages: true,
  notifyStory: true,
  showInMeet: true,
  meetShowGender: 'everyone',
  meetAgeMin: MIN_AGE,
  meetAgeMax: 40,
  unmatchRemovesFollow: false,
  blockedIds: [],
  mutedIds: [],
})

function all(): UserSettings[] {
  return getItem<UserSettings[]>('settings', [])
}

function sessionUserId(): string | null {
  return getItem<{ userId?: string } | null>('session', null)?.userId ?? null
}

function blockedBy(): string[] {
  return getItem<string[]>('blockedBy', [])
}

export const settingsService = {
  get(userId: string): UserSettings {
    const found = all().find((s) => s.userId === userId)
    const me = sessionUserId()
    let blockedIds = found?.blockedIds ?? []
    if (me && userId !== me && blockedBy().includes(userId) && !blockedIds.includes(me)) {
      blockedIds = [...blockedIds, me]
    }
    if (!found) {
      return { ...defaults(userId), blockedIds }
    }
    return {
      ...defaults(userId),
      ...found,
      blockedIds,
      mutedIds: found.mutedIds ?? [],
      hiddenWords: found.hiddenWords ?? [],
    }
  },

  update(userId: string, patch: Partial<UserSettings>): UserSettings {
    const list = all()
    const current = list.find((s) => s.userId === userId) ?? defaults(userId)
    const next = { ...current, ...patch, userId }
    const idx = list.findIndex((s) => s.userId === userId)
    if (idx >= 0) list[idx] = next
    else list.push(next)
    setItem('settings', list)
    if (patch.showInMeet !== undefined) {
      userService.update(userId, { showInMeet: patch.showInMeet })
    }
    sync('settings.update', { patch })
    return next
  },

  isHereVisible(userId: string, hereUntil: number | null | undefined, viewerId?: string): boolean {
    if (viewerId && this.iBlocked(userId, viewerId)) return false
    const settings = this.get(userId)
    if (settings.hideHereStatus) return false
    return Boolean(hereUntil && hereUntil > Date.now())
  },

  iBlocked(meId: string, targetId: string): boolean {
    if (this.get(meId).blockedIds.includes(targetId)) return true
    const me = sessionUserId()
    return Boolean(me && targetId === me && blockedBy().includes(meId))
  },

  visibleTo(meId: string, otherId: string): boolean {
    if (!meId || !otherId || meId === otherId) return true
    return !this.iBlocked(otherId, meId)
  },

  canMessage(fromId: string, toId: string): { ok: boolean; reason?: string } {
    const target = this.get(toId)
    const from = this.get(fromId)
    if (from.blockedIds.includes(toId) || target.blockedIds.includes(fromId)) {
      return { ok: false, reason: 'Bu kullanıcıyla mesajlaşamazsın' }
    }
    if (target.allowMessages === 'none') return { ok: false, reason: 'Mesajlar kapalı' }
    if (target.allowMessages === 'following') {
      const user = userService.getById(toId)
      if (!user?.following.includes(fromId)) {
        return { ok: false, reason: 'Sadece takip ettiği kişiler yazabilir' }
      }
    }
    return { ok: true }
  },

  canReplyStory(ownerId: string): boolean {
    return this.get(ownerId).allowStoryReplies
  },

  allowsFrom(ownerId: string, fromId: string, rule: AudiencePrivacy): { ok: boolean; reason?: string } {
    if (!fromId || fromId === ownerId) return { ok: true }
    if (rule === 'none') return { ok: false, reason: 'Kapalı' }
    if (rule === 'following') {
      const owner = userService.getById(ownerId)
      if (!owner?.following.includes(fromId)) {
        return { ok: false, reason: 'Sadece takip ettiği kişiler' }
      }
    }
    return { ok: true }
  },

  canComment(fromId: string, ownerId: string): { ok: boolean; reason?: string } {
    const gate = this.allowsFrom(ownerId, fromId, this.get(ownerId).allowComments)
    if (!gate.ok) return { ok: false, reason: gate.reason === 'Kapalı' ? 'Yorumlar kapalı' : 'Sadece takip ettiği kişiler yorum yapabilir' }
    return { ok: true }
  },

  canMention(fromId: string, ownerId: string): { ok: boolean; reason?: string } {
    const gate = this.allowsFrom(ownerId, fromId, this.get(ownerId).allowMentions)
    if (!gate.ok) return { ok: false, reason: 'Bu kişiden bahsedemezsin' }
    return { ok: true }
  },

  canTag(fromId: string, ownerId: string): { ok: boolean; reason?: string } {
    const gate = this.allowsFrom(ownerId, fromId, this.get(ownerId).allowTags)
    if (!gate.ok) return { ok: false, reason: 'Bu kişiyi etiketleyemezsin' }
    return { ok: true }
  },

  hasHiddenWord(ownerId: string, text: string): boolean {
    const words = this.get(ownerId).hiddenWords.map((w) => w.trim().toLowerCase()).filter(Boolean)
    if (!words.length) return false
    const hay = text.toLowerCase()
    return words.some((w) => hay.includes(w))
  },

  wantsNotify(userId: string, type: string): boolean {
    const s = this.get(userId)
    if (s.notifyPaused) return false
    if (type === 'like' || type === 'repost') return s.notifyLikes
    if (type === 'comment') return s.notifyComments
    if (type === 'follow') return s.notifyFollows
    if (type === 'mention') return s.notifyComments
    if (type === 'view') return s.notifyStory
    if (type === 'message') return s.notifyMessages
    if (type === 'meet_like') return s.notifyLikes
    return true
  },

  block(meId: string, targetId: string): void {
    const s = this.get(meId)
    if (s.blockedIds.includes(targetId)) return
    this.update(meId, { blockedIds: [...s.blockedIds, targetId] })
    userService.unfollow(meId, targetId)
    userService.unfollow(targetId, meId, false)
    setItem(
      'matches',
      getItem<{ userIds: string[] }[]>('matches', []).filter(
        (m) => !(m.userIds.includes(meId) && m.userIds.includes(targetId)),
      ),
    )
    sync('settings.block', { targetId })
  },

  unblock(meId: string, targetId: string): void {
    const s = this.get(meId)
    this.update(meId, { blockedIds: s.blockedIds.filter((id) => id !== targetId) })
    sync('settings.unblock', { targetId })
  },

  isBlocked(meId: string, targetId: string): boolean {
    return this.get(meId).blockedIds.includes(targetId) || this.get(targetId).blockedIds.includes(meId)
  },

  isMuted(meId: string, targetId: string): boolean {
    return this.get(meId).mutedIds.includes(targetId)
  },

  mute(meId: string, targetId: string): void {
    const s = this.get(meId)
    if (s.mutedIds.includes(targetId)) return
    this.update(meId, { mutedIds: [...s.mutedIds, targetId] })
    sync('settings.mute', { targetId })
  },

  unmute(meId: string, targetId: string): void {
    const s = this.get(meId)
    this.update(meId, { mutedIds: s.mutedIds.filter((id) => id !== targetId) })
    sync('settings.unmute', { targetId })
  },

  report(meId: string, targetId: string, reason: string): void {
    const list = getItem<{ id: string; fromId: string; targetId: string; reason: string; createdAt: number }[]>(
      'userReports',
      [],
    )
    setItem('userReports', [
      { id: `ur_${Date.now()}`, fromId: meId, targetId, reason, createdAt: Date.now() },
      ...list,
    ])
    sync('settings.report', { targetId, reason })
  },
}

export type { AudiencePrivacy, MessagePrivacy }
