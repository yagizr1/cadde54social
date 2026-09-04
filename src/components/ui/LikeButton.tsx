import { Heart } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cx } from '../../lib/utils'

export function LikeButton({
  liked,
  pop,
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  liked: boolean
  pop?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const box = size === 'lg' ? 'h-11 w-11' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const icon = size === 'lg' ? 'h-7 w-7' : size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'

  return (
    <button
      type="button"
      className={cx('grid place-items-center', box, pop && 'anim-like', className)}
      {...props}
    >
      <Heart className={cx(icon, liked ? 'fill-[#ff3040] text-[#ff3040]' : 'fill-none text-white')} />
    </button>
  )
}
