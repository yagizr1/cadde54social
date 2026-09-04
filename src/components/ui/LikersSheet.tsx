import { Link } from '../../lib/nav'
import { settingsService } from '../../services/settingsService'
import { userService } from '../../services/userService'
import { useAuthStore } from '../../store/authStore'
import type { User } from '../../types'
import { Avatar } from './Avatar'
import { Sheet } from './Sheet'

export function LikersSheet({
  open,
  onClose,
  userIds,
}: {
  open: boolean
  onClose: () => void
  userIds: string[]
}) {
  const me = useAuthStore((s) => s.user)
  const people = userIds
    .map((id) => userService.getById(id))
    .filter((u): u is User => {
      if (!u) return false
      return !me || settingsService.visibleTo(me.id, u.id)
    })

  return (
    <Sheet open={open} onClose={onClose} title="Beğenmeler">
      <div className="max-h-[50vh] overflow-y-auto">
        {people.length === 0 ? (
          <p className="py-10 text-center text-sm text-mute">Henüz beğeni yok.</p>
        ) : (
          people.map((u) => (
            <Link
              key={u.id}
              to={`/u/${u.username}`}
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-1 py-2 hover:bg-white/5"
            >
              <Avatar src={u.avatar} name={u.name} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{u.username}</p>
                <p className="truncate text-[13px] text-mute">{u.name}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </Sheet>
  )
}
