import { cx } from '../../lib/utils'

export function CountBadge({
  count,
  className,
  ring = true,
}: {
  count: number
  className?: string
  ring?: boolean
}) {
  if (count <= 0) return null
  return (
    <span
      className={cx(
        'grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#ff3040] px-[5px] text-[11px] font-bold leading-none text-white',
        ring && 'ring-2 ring-ink',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
