import { Bookmark, Clapperboard, Grid3x3, Medal, Repeat2, type LucideIcon } from 'lucide-react'
import { cx } from '../../lib/utils'

const ICONS = {
  posts: Grid3x3,
  reels: Clapperboard,
  reposts: Repeat2,
  saved: Bookmark,
  badges: Medal,
} as const

const LABELS = {
  posts: 'Gönderiler',
  reels: 'Reels',
  reposts: 'Tekrar paylaşılanlar',
  saved: 'Kaydedilenler',
  badges: 'Rozetler',
} as const

export type ProfileTab = keyof typeof ICONS

export function ProfileTabs<T extends ProfileTab>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly T[]
  value: T
  onChange: (tab: T) => void
}) {
  return (
    <div className="mt-4 flex border-t border-white/10">
      {tabs.map((t) => {
        const Icon = ICONS[t] as LucideIcon
        const on = value === t
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            aria-label={LABELS[t]}
            className={cx(
              'relative flex h-12 flex-1 items-center justify-center',
              on ? 'text-white' : 'text-mute',
            )}
          >
            {on ? <span className="absolute inset-x-0 top-0 h-[1px] bg-white" /> : null}
            <Icon className={cx('h-6 w-6', t === 'saved' && on && 'fill-white')} />
          </button>
        )
      })}
    </div>
  )
}
