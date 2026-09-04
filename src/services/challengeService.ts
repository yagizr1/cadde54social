import { mockChallenges } from '../data/mockChallenges'
import { dayKey, weekKey, weekKeyFromDayKey } from '../lib/utils'
import type { ChallengeDef, ChallengeMetric, ChallengeState } from '../types'
import { getItem, setItem } from './storage'
import { notificationService } from './notificationService'
import { sync } from './syncService'
import { userService } from './userService'
import { xpService } from './xpService'

function periodKey(type: ChallengeDef['type']): string {
  return type === 'daily' ? dayKey() : weekKey()
}

function states(): ChallengeState[] {
  return getItem<ChallengeState[]>('challengeStates', [])
}

function saveStates(list: ChallengeState[]): void {
  setItem('challengeStates', list)
}

function uniqueList(key: string): string[] {
  return getItem<string[]>(key, [])
}

export const challengeService = {
  defs(): ChallengeDef[] {
    return mockChallenges
  },

  getState(def: ChallengeDef): ChallengeState {
    const key = periodKey(def.type)
    const found = states().find((s) => s.id === def.id && s.periodKey === key)
    if (found) return found
    return { id: def.id, periodKey: key, progress: 0, claimed: false }
  },

  track(userId: string, metric: ChallengeMetric, extra?: string): void {
    if (metric === 'login_days') {
      const days = new Set(uniqueList('loginDays'))
      days.add(dayKey())
      setItem('loginDays', [...days])
    }
    if (metric === 'interact_users' && extra) {
      const users = new Set(uniqueList('interactUsers'))
      users.add(extra)
      setItem('interactUsers', [...users])
    }

    const defs = mockChallenges.filter((d) => d.metric === metric)
    const list = states()
    for (const def of defs) {
      const key = periodKey(def.type)
      let state = list.find((s) => s.id === def.id && s.periodKey === key)
      if (!state) {
        state = { id: def.id, periodKey: key, progress: 0, claimed: false }
        list.push(state)
      }
      if (state.claimed) continue

      if (metric === 'login_days') {
        const week = weekKey()
        state.progress = uniqueList('loginDays').filter((d) => weekKeyFromDayKey(d) === week).length
      } else if (metric === 'interact_users') {
        state.progress = uniqueList('interactUsers').length
      } else {
        state.progress += 1
      }

      if (state.progress >= def.target && !state.claimed) {
        state.claimed = true
        xpService.add(userId, def.xp, def.title)
        const count = getItem('completedChallengeCount', 0) + 1
        setItem('completedChallengeCount', count)
        notificationService.notify({
          type: 'challenge',
          recipientId: userId,
          text: `Günlük görevin tamamlandı: ${def.title}`,
          href: '/challenges',
        })
      }
    }
    saveStates(list)
    const user = userService.getById(userId)
    sync('progress.save', {
      xp: user?.xp,
      xpHistory: getItem('xpHistory', []),
      challengeStates: list,
      loginDays: uniqueList('loginDays'),
      interactUsers: uniqueList('interactUsers'),
      unlockedBadges: getItem('unlockedBadges', []),
      completedChallengeCount: getItem('completedChallengeCount', 0),
      commentCount: getItem('commentCount', 0),
    })
  },

  recordLogin(userId: string): void {
    this.track(userId, 'login_days')
  },
}
