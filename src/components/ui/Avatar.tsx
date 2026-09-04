import { cx } from '../../lib/utils'

export function Avatar({
  src,
  name,
  size = 40,
  ring,
  className,
}: {
  src: string
  name: string
  size?: number
  ring?: 'story' | 'story-seen' | 'none'
  className?: string
}) {
  const ringClass =
    ring === 'story'
      ? 'bg-[conic-gradient(from_200deg,#f9ce34,#ee2a7b,#6228d7,#f9ce34)] p-[2px]'
      : ring === 'story-seen'
        ? 'bg-[#8e8e8e] p-[2px]'
        : ''

  return (
    <div
      className={cx('shrink-0 rounded-full', ringClass, className)}
      style={{ width: size, height: size }}
    >
      <div className={cx('h-full w-full rounded-full', ringClass && 'bg-ink p-[2px]')}>
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full bg-panel-2 object-cover"
        />
      </div>
    </div>
  )
}
