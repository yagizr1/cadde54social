import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const PREFIX = 'scrypt'

export function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(plain), salt, 32).toString('hex')
  return `${PREFIX}$${salt}$${hash}`
}

export function isHashed(value) {
  return String(value ?? '').startsWith(`${PREFIX}$`)
}

export function verifyPassword(plain, stored) {
  const s = String(stored ?? '')
  if (!isHashed(s)) {
    const a = Buffer.from(String(plain))
    const b = Buffer.from(s)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  }
  const parts = s.split('$')
  const salt = parts[1]
  const hash = parts[2]
  if (!salt || !hash) return false
  const next = scryptSync(String(plain), salt, 32)
  const prev = Buffer.from(hash, 'hex')
  if (next.length !== prev.length) return false
  return timingSafeEqual(next, prev)
}
