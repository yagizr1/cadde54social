import { getLevelInfo, uid } from '../lib/utils'
import type { Match, MeetLike, MeetLikeStatus, Swipe, User } from '../types'
import { messageService } from './messageService'
import { notificationService } from './notificationService'
import { settingsService } from './settingsService'
import { getItem, setItem } from './storage'
import { sync } from './syncService'
import { userService } from './userService'

function swipes(): Swipe[] {
  return getItem<Swipe[]>('swipes', [])
}

function matches(): Match[] {
  return getItem<Match[]>('matches', [])
}

function saveSwipes(list: Swipe[]): void {
  setItem('swipes', list)
}

function saveMatches(list: Match[]): void {
  setItem('matches', list)
}

function hasMatch(a: string, b: string): Match | undefined {
  return matches().find((m) => m.userIds.includes(a) && m.userIds.includes(b))
}

function likeStatus(fromId: string, toId: string): MeetLikeStatus {
  if (hasMatch(fromId, toId)) return 'accepted'
  const reply = swipes().find((s) => s.fromId === toId && s.toId === fromId)
  if (reply && !reply.liked) return 'rejected'
  return 'pending'
}

function visiblePair(a: string, b: string): boolean {
  return !settingsService.isBlocked(a, b) && !settingsService.iBlocked(a, b)
}

function followQuiet(a: string, b: string): void {
  userService.follow(a, b, true, false)
}

function ensureMatchChat(a: string, b: string): string | undefined {
  try {
    const conv = messageService.withUser(a, b)
    messageService.addSystem(conv.id, '🎉 Artık eşleştiniz!')
    return conv.id
  } catch {
    return undefined
  }
}

function notifyMatch(meId: string, otherId: string): void {
  const me = userService.getById(meId)
  const other = userService.getById(otherId)
  if (!me || !other) return
  notificationService.notify({
    type: 'match',
    actorId: other.id,
    recipientId: meId,
    text: 'ile eşleştiniz.',
    href: '/meet?tab=matches',
    image: other.avatar,
    persist: true,
  })
  notificationService.notify({
    type: 'match',
    actorId: me.id,
    recipientId: otherId,
    text: 'ile eşleştiniz.',
    href: '/meet?tab=matches',
    image: me.avatar,
    persist: true,
  })
}

function createMatch(meId: string, otherId: string): Match {
  const existing = hasMatch(meId, otherId)
  if (existing) return existing
  const conversationId = ensureMatchChat(meId, otherId)
  const created: Match = {
    id: uid('mt'),
    userIds: [meId, otherId],
    createdAt: Date.now(),
    conversationId,
  }
  saveMatches([created, ...matches()])
  followQuiet(meId, otherId)
  followQuiet(otherId, meId)
  notifyMatch(meId, otherId)
  return created
}

export const meetService = {
  photos(user: User): string[] {
    const own = (user.meetPhotos ?? []).filter(Boolean).slice(0, 3)
    if (own.length) return own
    return user.avatar ? [user.avatar] : []
  },

  hasPhotos(user: User): boolean {
    return (user.meetPhotos ?? []).filter(Boolean).length > 0
  },

  level(user: User) {
    return getLevelInfo(user.xp)
  },

  commonFollowers(meId: string, otherId: string): User[] {
    const me = userService.getById(meId)
    const other = userService.getById(otherId)
    if (!me || !other) return []
    const ids = new Set<string>()
    for (const id of other.followers) {
      if (id !== meId && (me.following.includes(id) || me.followers.includes(id))) ids.add(id)
    }
    return [...ids]
      .map((id) => userService.getById(id))
      .filter((u): u is User => u != null && visiblePair(meId, u.id))
  },

  deck(meId: string): User[] {
    const prefs = settingsService.get(meId)
    const seen = new Set(swipes().filter((s) => s.fromId === meId).map((s) => s.toId))
    const matched = new Set(
      matches()
        .filter((m) => m.userIds.includes(meId))
        .flatMap((m) => m.userIds)
        .filter((id) => id !== meId),
    )
    return userService.list().filter((u) => {
      if (u.id === meId) return false
      if (seen.has(u.id) || matched.has(u.id)) return false
      if (!visiblePair(meId, u.id)) return false
      if (u.showInMeet === false) return false
      const theirs = settingsService.get(u.id)
      if (theirs.showInMeet === false || theirs.ghostMode) return false
      if (prefs.meetShowGender !== 'everyone' && u.gender !== 'unspecified' && u.gender !== prefs.meetShowGender) {
        return false
      }
      if (u.age != null && (u.age < prefs.meetAgeMin || u.age > prefs.meetAgeMax)) return false
      if (!this.hasPhotos(u)) return false
      return true
    })
  },

  likes(meId: string): MeetLike[] {
    return swipes()
      .filter((s) => s.toId === meId && s.liked)
      .map((s) => ({
        id: s.id,
        fromUserId: s.fromId,
        toUserId: s.toId,
        status: likeStatus(s.fromId, s.toId),
        createdAt: s.createdAt,
      }))
  },

  incomingLikes(meId: string): User[] {
    return this.likes(meId)
      .filter((like) => like.status === 'pending')
      .map((like) => userService.getById(like.fromUserId))
      .filter((u): u is User => u != null && visiblePair(meId, u.id))
  },

  swipe(meId: string, toId: string, liked: boolean): { match: boolean; matchId?: string } {
    if (meId === toId) return { match: false }
    if (!visiblePair(meId, toId)) return { match: false }
    if (swipes().some((s) => s.fromId === meId && s.toId === toId)) return { match: false }

    const row: Swipe = { id: uid('sw'), fromId: meId, toId, liked, createdAt: Date.now() }
    saveSwipes([row, ...swipes()])
    sync('meet.swipe', { id: row.id, toId, liked })

    if (!liked) return { match: false }

    notificationService.notify({
      type: 'meet_like',
      recipientId: toId,
      text: 'Yeni bir beğeni! Birisi seni beğendi.',
      href: '/meet?tab=likes',
      persist: true,
    })

    const mutual = swipes().some((s) => s.fromId === toId && s.toId === meId && s.liked)
    if (!mutual) return { match: false }

    const created = createMatch(meId, toId)
    return { match: true, matchId: created.id }
  },

  acceptLike(meId: string, fromId: string): { match: boolean; matchId?: string } {
    return this.swipe(meId, fromId, true)
  },

  rejectLike(meId: string, fromId: string): void {
    this.swipe(meId, fromId, false)
  },

  matchesFor(meId: string): User[] {
    return this.matchRows(meId).map((row) => row.user)
  },

  matchRows(meId: string): {
    match: Match
    user: User
    lastMessage?: string
    lastActive?: string
  }[] {
    return matches()
      .filter((m) => m.userIds.includes(meId))
      .map((match) => {
        const otherId = match.userIds.find((id) => id !== meId) ?? ''
        const user = userService.getById(otherId)
        if (!user || !visiblePair(meId, user.id)) return null
        const conv = messageService.list(meId).find((c) => c.participantIds.includes(user.id))
        const last = [...(conv?.messages ?? [])].reverse().find((m) => !m.system)
        const here = settingsService.isHereVisible(user.id, user.hereUntil, meId)
        return {
          match,
          user,
          lastMessage: last
            ? `${last.senderId === meId ? 'Sen: ' : ''}${last.text || (last.image ? 'Fotoğraf' : 'Mesaj')}`
            : '🎉 Artık eşleştiniz!',
          lastActive: here ? 'Cadde 54’te' : conv ? `Son mesaj ${new Date(conv.updatedAt).toLocaleDateString('tr-TR')}` : undefined,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .sort((a, b) => b.match.createdAt - a.match.createdAt)
  },

  conversationWith(meId: string, otherId: string) {
    return messageService.withUser(meId, otherId)
  },

  unmatch(meId: string, otherId: string): void {
    const next = matches().filter((m) => !(m.userIds.includes(meId) && m.userIds.includes(otherId)))
    saveMatches(next)
    sync('meet.unmatch', { otherId })
    if (settingsService.get(meId).unmatchRemovesFollow) {
      userService.unfollow(meId, otherId)
      userService.unfollow(otherId, meId, false)
    }
  },

  closeBetween(a: string, b: string): void {
    saveMatches(matches().filter((m) => !(m.userIds.includes(a) && m.userIds.includes(b))))
  },

  lastSwipe(meId: string): Swipe | undefined {
    return swipes().find((s) => s.fromId === meId)
  },

  undoLast(meId: string): boolean {
    const last = this.lastSwipe(meId)
    if (!last) return false
    saveSwipes(swipes().filter((s) => s.id !== last.id))
    if (last.liked) {
      const match = hasMatch(meId, last.toId)
      if (match && Math.abs(match.createdAt - last.createdAt) < 8_000) {
        saveMatches(matches().filter((m) => m.id !== match.id))
      }
    }
    sync('meet.undo', { swipeId: last.id })
    return true
  },

  resetPasses(meId: string): void {
    saveSwipes(swipes().filter((s) => !(s.fromId === meId && !s.liked)))
    sync('meet.resetPasses')
  },
}
