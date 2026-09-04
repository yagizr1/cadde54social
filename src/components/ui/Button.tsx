import type { ButtonHTMLAttributes } from 'react'
import { cx } from '../../lib/utils'

type Variant = 'primary' | 'ghost' | 'line' | 'danger'

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-hot text-ink',
    ghost: 'bg-[#262626] text-white',
    line: 'bg-[#262626] text-white',
    danger: 'bg-[#262626] text-red-500',
  }
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition active:opacity-70 disabled:opacity-50',
        styles[variant],
        className,
      )}
      {...props}
    />
  )
}
