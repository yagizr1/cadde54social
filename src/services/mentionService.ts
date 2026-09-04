import { mentionedUsers } from '../lib/mentions'
import type { User } from '../types'
import { notificationService } from './notificationService'
import { settingsService } from './settingsService'
import { userService } from './userService'

export const mentionService = {
  notify(
    actorId: string,
    text: string,
    opts: {
      label: string
      href?: string
      image?: string
      extraIds?: string[]
    },
  ): void {
    const actor = userService.getById(actorId)
    if (!actor) return
    const mentioned = new Set(mentionedUsers(text, actorId).map((u) => u.id))
    const targets = new Map<string, User>()
    for (const u of mentionedUsers(text, actorId)) targets.set(u.id, u)
    for (const id of opts.extraIds ?? []) {
      const u = userService.getById(id)
      if (u && u.id !== actorId) targets.set(u.id, u)
    }
    for (const u of targets.values()) {
      if (settingsService.iBlocked(actorId, u.id) || settingsService.iBlocked(u.id, actorId)) continue
      const allow = mentioned.has(u.id)
        ? settingsService.canMention(actorId, u.id).ok
        : settingsService.canTag(actorId, u.id).ok
      if (!allow) continue
      notificationService.notify({
        type: 'mention',
        actorId,
        recipientId: u.id,
        text: opts.label,
        href: opts.href ?? `/u/${actor.username}`,
        image: opts.image,
        groupKey: `mention:${opts.href ?? actor.username}:${actorId}`,
      })
    }
  },
}
