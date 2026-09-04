import type { ChatShare, User } from '../types'
import { messageService } from './messageService'
import { settingsService } from './settingsService'
import { userService } from './userService'

export type SharePayload = {
  text: string
  image?: string
  video?: string
  share?: ChatShare
}

export function profileSharePayload(user: User): SharePayload {
  return {
    text: `Sana bir profil gönderdi (@${user.username})`,
    image: user.avatar,
    share: { kind: 'profile', username: user.username },
  }
}

export const shareService = {
  targets(meId: string): User[] {
    const me = userService.getById(meId)
    const blocked = new Set([
      ...settingsService.get(meId).blockedIds,
    ])
    const others = userService.list().filter((u) => {
      if (u.id === meId) return false
      if (blocked.has(u.id)) return false
      if (settingsService.get(u.id).blockedIds.includes(meId)) return false
      return true
    })
    const byId = new Map(others.map((u) => [u.id, u]))

    const dmIds: string[] = []
    for (const conv of messageService.list(meId)) {
      const otherId = conv.participantIds.find((id) => id !== meId)
      if (otherId && byId.has(otherId) && !dmIds.includes(otherId)) dmIds.push(otherId)
    }

    const mutualIds = others
      .filter(
        (u) =>
          !dmIds.includes(u.id) &&
          Boolean(me?.following.includes(u.id)) &&
          Boolean(me?.followers.includes(u.id)),
      )
      .map((u) => u.id)

    const restIds = others
      .filter((u) => !dmIds.includes(u.id) && !mutualIds.includes(u.id))
      .map((u) => u.id)

    return [...dmIds, ...mutualIds, ...restIds]
      .map((id) => byId.get(id))
      .filter((u): u is User => Boolean(u))
  },

  recentChats(meId: string, limit = 4): User[] {
    const ids: string[] = []
    for (const conv of messageService.list(meId)) {
      const otherId = conv.participantIds.find((id) => id !== meId)
      if (!otherId || ids.includes(otherId)) continue
      if (settingsService.isBlocked(meId, otherId)) continue
      const user = userService.getById(otherId)
      if (!user) continue
      ids.push(otherId)
      if (ids.length >= limit) break
    }
    return ids
      .map((id) => userService.getById(id))
      .filter((u): u is User => Boolean(u))
  },

  sendTo(meId: string, userIds: string[], payload: SharePayload): number {
    let sent = 0
    for (const userId of userIds) {
      const can = settingsService.canMessage(meId, userId)
      if (!can.ok) continue
      const conv = messageService.withUser(meId, userId)
      messageService.send(conv.id, meId, payload.text, payload.image, payload.video, payload.share)
      sent += 1
    }
    return sent
  },
}
