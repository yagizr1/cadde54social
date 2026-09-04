import type { User } from '../types'
import { api } from '../lib/api'
import { userService } from './userService'

export type PremiumPlanId = 'month' | 'half' | 'year'

export const PREMIUM_PLANS: {
  id: PremiumPlanId
  label: string
  months: number
  price: number
  hint: string
}[] = [{ id: 'month', label: 'Aylık', months: 1, price: 200, hint: '200 TL / ay' }]

const LIFETIME_HANDLES = new Set(['yagiztalhaazman'])

export const premiumService = {
  plans() {
    return PREMIUM_PLANS
  },

  plan(id: PremiumPlanId) {
    return PREMIUM_PLANS.find((p) => p.id === id)
  },

  isLifetime(user: User | null | undefined): boolean {
    return Boolean(user && LIFETIME_HANDLES.has(user.username.toLowerCase()))
  },

  isActive(user: User | null | undefined): boolean {
    if (this.isLifetime(user)) return true
    if (!user?.isPremium) return false
    if (!user.premiumUntil) return true
    return user.premiumUntil > Date.now()
  },

  async grant(username: string, months = 1): Promise<void> {
    const handle = username.trim()
    if (!handle) throw new Error('Kullanıcı adı gerekli')
    await api('/api/actions/premium.grant', { method: 'POST', body: { username: handle, months } })
  },

  deactivate(userId: string): void {
    const user = userService.getById(userId)
    if (this.isLifetime(user)) return
    userService.update(userId, { isPremium: false, premiumPlan: undefined, premiumUntil: null })
  },
}
