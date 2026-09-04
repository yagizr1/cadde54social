import type { ReactNode } from 'react'
import { cx } from '../../lib/utils'
import { premiumService } from '../../services/premiumService'
import { userService } from '../../services/userService'
import type { User } from '../../types'

export function BlueTick({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={cx('shrink-0', className)}
      aria-label="Onaylı"
    >
      <circle cx="20" cy="20" r="20" fill="#0095F6" />
      <path
        fill="#fff"
        d="M17.4 26.2 11.8 20.6l2.3-2.3 3.3 3.3 8.5-8.5 2.3 2.3z"
      />
    </svg>
  )
}

export function VerifiedName({
  user,
  userId,
  username,
  children,
  className,
  size = 14,
}: {
  user?: User | null
  userId?: string
  username?: string
  children?: ReactNode
  className?: string
  size?: number
}) {
  const resolved =
    user ??
    (userId ? userService.getById(userId) : undefined) ??
    (username ? userService.getByUsername(username) : undefined)
  const label = children ?? resolved?.username ?? username ?? ''
  const on = premiumService.isActive(resolved)

  return (
    <span className={cx('inline-flex max-w-full items-center gap-1.5 align-middle', className)}>
      <span className="truncate">{label}</span>
      {on ? <BlueTick size={size} /> : null}
    </span>
  )
}
