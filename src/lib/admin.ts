import { ADMIN_ID } from './constants'
import type { User } from '../types'

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false
  return user.id === ADMIN_ID || user.role === 'admin' || user.username === 'admin'
}
