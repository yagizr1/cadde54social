import { CADDE54_CENTER, CADDE54_RADIUS_M, HERE_DURATION_MS, HERE_LEFT_MS } from '../lib/constants'
import { haversineMeters } from '../lib/utils'
import type { User } from '../types'
import { challengeService } from './challengeService'
import { settingsService } from './settingsService'
import { setItem } from './storage'
import { sync } from './syncService'
import { hereTimeService } from './hereTimeService'
import { userService } from './userService'
import { xpService } from './xpService'

export type PresenceResult = {
  verified: boolean
  distance: number
  until: number
}

export const presenceService = {
  isHere(until: number | null | undefined): boolean {
    return Boolean(until && until > Date.now())
  },

  isRecentlyLeft(leftAt: number | null | undefined): boolean {
    return Boolean(leftAt && Date.now() - leftAt < HERE_LEFT_MS)
  },

  leftMinutes(leftAt: number | null | undefined): number {
    if (!leftAt) return 0
    return Math.floor((Date.now() - leftAt) / 60_000)
  },

  leftLabel(leftAt: number | null | undefined): string {
    if (!this.isRecentlyLeft(leftAt)) return ''
    const min = this.leftMinutes(leftAt)
    if (min < 1) return 'yeni ayrıldı'
    return `yeni ayrıldı · ${min} dk`
  },

  canSeePresence(viewerId: string, user: User): boolean {
    if (settingsService.iBlocked(user.id, viewerId)) return false
    if (user.id === viewerId) return true
    if (settingsService.get(user.id).hideHereStatus) return false
    return true
  },

  hereNow(viewerId: string): User[] {
    return userService
      .list()
      .filter((u) => {
        if (!this.canSeePresence(viewerId, u)) return false
        return this.isHere(u.hereUntil) || this.isRecentlyLeft(u.hereLeftAt)
      })
      .sort((a, b) => {
        const aHere = this.isHere(a.hereUntil)
        const bHere = this.isHere(b.hereUntil)
        if (aHere !== bHere) return aHere ? -1 : 1
        if (aHere) {
          if (a.id === viewerId) return -1
          if (b.id === viewerId) return 1
          return (b.hereUntil ?? 0) - (a.hereUntil ?? 0)
        }
        return (b.hereLeftAt ?? 0) - (a.hereLeftAt ?? 0)
      })
  },

  markHere(userId: string, coords: { lat: number; lng: number }, award = true): number {
    const user = userService.getById(userId)
    const wasHere = this.isHere(user?.hereUntil)
    const until = Date.now() + HERE_DURATION_MS
    userService.update(userId, { hereUntil: until, hereLeftAt: null, hereDemo: false })
    if (!wasHere) hereTimeService.start(userId)
    setItem('completedHere', true)
    sync('presence.check', { lat: coords.lat, lng: coords.lng })
    if (award && !wasHere && !this.isRecentlyLeft(user?.hereLeftAt)) {
      challengeService.track(userId, 'here')
      xpService.add(userId, 20, 'Buradayım')
    }
    return until
  },

  leave(userId: string): boolean {
    const user = userService.getById(userId)
    if (!user || !this.isHere(user.hereUntil)) return false
    userService.update(userId, { hereUntil: null, hereLeftAt: Date.now(), hereDemo: false })
    hereTimeService.end(userId)
    sync('presence.leave')
    return true
  },

  syncLocation(userId: string, coords: { lat: number; lng: number }): 'here' | 'left' | 'same' {
    const user = userService.getById(userId)
    if (!user) return 'same'
    const inside = haversineMeters(coords, CADDE54_CENTER) <= CADDE54_RADIUS_M
    if (inside) {
      if (this.isHere(user.hereUntil)) return 'same'
      this.markHere(userId, coords, !this.isHere(user.hereUntil))
      return 'here'
    }
    if (this.isHere(user.hereUntil)) {
      this.leave(userId)
      return 'left'
    }
    return 'same'
  },

  async checkHere(userId: string, coords: { lat: number; lng: number }): Promise<PresenceResult> {
    if (!coords) throw new Error('Konum alınamadı')
    const distance = haversineMeters(coords, CADDE54_CENTER)
    if (distance > CADDE54_RADIUS_M) {
      if (this.leave(userId)) {
        throw new Error('Cadde 54 alanından çıktın')
      }
      throw new Error(`Cadde 54 alanının dışındasın (${Math.round(distance)} m)`)
    }
    const until = this.markHere(userId, coords)
    return { verified: true, distance, until }
  },

  readBrowserCoords(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Tarayıcı konum desteklemiyor'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(new Error('Konum izni verilmedi')),
        { enableHighAccuracy: true, timeout: 8000 },
      )
    })
  },
}
