import type { User } from '../types'

export function isSuspendedUser(user: User | null | undefined): boolean {
  if (!user?.suspended) return false
  if (user.suspendedUntil && user.suspendedUntil <= Date.now()) return false
  return true
}

export function isClosedUser(user: User | null | undefined): boolean {
  return Boolean(user?.banned) || isSuspendedUser(user)
}

export function accountStatusLabel(user: User): string {
  if (user.banned) return 'Banlı'
  if (isSuspendedUser(user)) return 'Askıda'
  return 'Açık'
}
