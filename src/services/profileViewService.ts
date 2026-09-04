import { uid } from '../lib/utils'
import type { ProfileView } from '../types'
import { premiumService } from './premiumService'
import { settingsService } from './settingsService'
import { getItem, setItem } from './storage'
import { sync } from './syncService'
import { userService } from './userService'

export const profileViewService = {
  listFor(targetId: string): ProfileView[] {
    return getItem<ProfileView[]>('profileViews', [])
      .filter((v) => v.targetId === targetId)
      .sort((a, b) => b.createdAt - a.createdAt)
  },

  record(viewerId: string, targetId: string): void {
    if (viewerId === targetId) return
    if (settingsService.iBlocked(targetId, viewerId)) return
    const viewer = userService.getById(viewerId)
    if (premiumService.isActive(viewer) && settingsService.get(viewerId).ghostMode) return
    const views = getItem<ProfileView[]>('profileViews', [])
    const row: ProfileView = {
      id: uid('pv'),
      viewerId,
      targetId,
      createdAt: Date.now(),
    }
    views.unshift(row)
    setItem('profileViews', views.slice(0, 80))
    sync('views.record', { id: row.id, targetId })
  },
}
