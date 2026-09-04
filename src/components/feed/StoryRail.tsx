import { Plus } from 'lucide-react'
import { useNavigate } from '../../lib/nav'
import { startCreate } from '../../lib/createPicker'
import { settingsService } from '../../services/settingsService'
import { storyService } from '../../services/storyService'
import { userService } from '../../services/userService'
import { useUiStore } from '../../store/uiStore'
import { Avatar } from '../ui/Avatar'

export function StoryRail({ meId }: { meId: string }) {
  const groups = storyService.grouped()
  const me = userService.getById(meId)
  const mine = groups.find((g) => g.userId === meId)
  const others = groups.filter(
    (g) =>
      g.userId !== meId &&
      Boolean(me?.following.includes(g.userId)) &&
      !settingsService.isMuted(meId, g.userId) &&
      !settingsService.iBlocked(g.userId, meId),
  )
  const openStories = useUiStore((s) => s.openStories)
  const navigate = useNavigate()
  const hasMine = Boolean(mine?.stories.length)
  const ordered = mine ? [mine, ...others] : others
  const userIds = ordered.map((g) => g.userId)
  const mySeen = mine ? mine.stories.every((s) => s.viewedBy.includes(meId)) : false

  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto border-b border-white/10 px-3 py-3">
      <div className="w-[66px] shrink-0 text-center">
        <div className="relative mx-auto w-fit">
          <button
            type="button"
            onClick={() => {
              if (hasMine) openStories(userIds, 0)
              else startCreate(navigate, 'story')
            }}
          >
            <Avatar
              src={me?.avatar ?? ''}
              name={me?.name ?? 'Sen'}
              size={64}
              ring={hasMine ? (mySeen ? 'story-seen' : 'story') : 'none'}
            />
          </button>
          <button
            type="button"
            onClick={() => startCreate(navigate, 'story')}
            className="absolute right-0 bottom-0 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-ink bg-hot"
            aria-label="Hikaye ekle"
          >
            <Plus className="h-2.5 w-2.5 text-ink" strokeWidth={3} />
          </button>
        </div>
        <p className="mt-1.5 truncate text-[11px] text-white/90">Hikayen</p>
      </div>
      {others.map((g, index) => {
        const u = userService.getById(g.userId)
        if (!u) return null
        const seen = g.stories.every((s) => s.viewedBy.includes(meId))
        return (
          <button
            key={g.userId}
            className="w-[66px] shrink-0 text-center"
            onClick={() => openStories(userIds, hasMine ? index + 1 : index)}
          >
            <Avatar
              src={u.avatar}
              name={u.name}
              size={64}
              ring={seen ? 'story-seen' : 'story'}
              className="mx-auto"
            />
            <p className="mt-1.5 truncate text-[11px]">{u.username}</p>
          </button>
        )
      })}
    </div>
  )
}
