import { useRef } from 'react'
import { useApp } from '../../hooks/useApp'
import { cx } from '../../lib/utils'

export function BrandLabel({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center leading-none lining-nums', className)}>
      Cadde<span className="text-hot lining-nums">54</span>
      <span className="ml-[0.28em]">Social</span>
    </span>
  )
}

export function BrandMark({ className }: { className?: string }) {
  const { refresh } = useApp()
  const timer = useRef<number | null>(null)

  function toTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type="button"
      className={cx('font-display text-[15px] font-bold tracking-tight', className)}
      onClick={() => {
        if (timer.current) {
          window.clearTimeout(timer.current)
          timer.current = null
          toTop()
          refresh()
          return
        }
        timer.current = window.setTimeout(() => {
          timer.current = null
          toTop()
        }, 260)
      }}
    >
      <BrandLabel />
    </button>
  )
}
