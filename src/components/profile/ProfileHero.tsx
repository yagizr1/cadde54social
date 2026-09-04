import type { ReactNode } from 'react'
import { Link } from '../../lib/nav'
import { storyService } from '../../services/storyService'
import { useUiStore } from '../../store/uiStore'
import type { User } from '../../types'
import { Avatar } from '../ui/Avatar'

function Stat({
  value,
  label,
  to,
}: {
  value: number
  label: string
  to?: string
}) {
  const inner = (
    <>
      <p className="text-[16px] font-bold leading-none">{value}</p>
      <p className="mt-1 text-[13px] text-white/90">{label}</p>
    </>
  )
  if (to) {
    return (
      <Link to={to} className="min-w-[56px] text-center">
        {inner}
      </Link>
    )
  }
  return <div className="min-w-[56px] text-center">{inner}</div>
}

export function ProfileHero({
  user,
  postCount,
  here,
  locked,
  badges,
  insights,
  actions,
  linkStats,
}: {
  user: User
  postCount: number
  here?: boolean
  locked?: boolean
  badges?: ReactNode
  insights?: ReactNode
  actions: ReactNode
  linkStats?: boolean
}) {
  const openStories = useUiStore((s) => s.openStories)
  const hasStory = storyService.grouped().some((g) => g.userId === user.id && g.stories.length)

  return (
    <div>
      <div className="flex items-center gap-6 px-4 pt-1">
        <button
          type="button"
          className="shrink-0"
          onClick={() => {
            const ids = storyService.grouped().map((g) => g.userId)
            const i = ids.indexOf(user.id)
            if (i >= 0) openStories(ids, i)
          }}
        >
          <Avatar src={user.avatar} name={user.name} size={86} ring={hasStory ? 'story' : 'none'} />
        </button>
        <div className="flex min-w-0 flex-1 justify-around">
          <Stat value={postCount} label="gönderi" />
          <Stat
            value={user.followers.length}
            label="takipçi"
            to={linkStats ? '/friends?tab=followers' : undefined}
          />
          <Stat
            value={user.following.length}
            label="takip"
            to={linkStats ? '/friends?tab=following' : undefined}
          />
        </div>
      </div>
      <div className="mt-3 px-4">
        <p className="text-[14px] font-semibold leading-tight">{user.name}</p>
        {user.age ? (
          <span className="mt-1.5 inline-flex rounded-full bg-white/10 px-2.5 py-0.5 text-[12px] font-semibold text-white/90">
            Yaş {user.age}
          </span>
        ) : null}
        {here ? <p className="mt-0.5 text-[13px] text-hot">Cadde 54’te</p> : null}
        {locked ? <p className="mt-0.5 text-[13px] text-mute">Gizli hesap</p> : null}
        {user.bio ? <p className="mt-1 whitespace-pre-wrap text-[14px] leading-snug">{user.bio}</p> : null}
        {badges}
        {insights}
      </div>
      <div className="mt-3 flex gap-2 px-4">{actions}</div>
    </div>
  )
}
