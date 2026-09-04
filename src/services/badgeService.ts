import { badgeCatalog } from '../data/mockBadges'
import { ADMIN_ID } from '../lib/constants'
import { getLevelInfo } from '../lib/utils'
import type { User } from '../types'
import { getItem, setItem } from './storage'
import { storyService } from './storyService'
import { reelsService } from './reelsService'
import { presenceService } from './presenceService'
import { userService } from './userService'
import { weekKey } from '../lib/utils'

export const badgeService = {
  catalog() {
    return badgeCatalog
  },

  unlockedIds(user: User): string[] {
    const stored = new Set(getItem<string[]>('unlockedBadges', []))
    if (user.xp >= 1000) stored.add('xp1000')
    if (presenceService.isHere(user.hereUntil) || getItem('completedHere', false)) stored.add('regular')
    if (getItem('completedChallengeCount', 0) >= 10) stored.add('challenges10')
    if (storyService.list().some((s) => s.userId === user.id)) stored.add('firstStory')
    if (reelsService.list().some((r) => r.userId === user.id)) stored.add('firstReel')
    if (getItem('commentCount', 0) >= 100) stored.add('comments100')
    if (user.isPremium) stored.add('premium')

    const others = userService.list().filter((u) => u.id !== user.id)
    const weeklyXp = user.xp
    const isFirst = others.every((u) => u.xp * 0.35 < weeklyXp * 0.35) && getLevelInfo(user.xp).level >= 8
    if (user.id === ADMIN_ID && weekKey() && isFirst && user.xp >= 4000) stored.add('weeklyFirst')

    const ids = [...stored]
    setItem('unlockedBadges', ids)
    return ids
  },
}
