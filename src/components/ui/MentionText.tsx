import { Link } from '../../lib/nav'
import { settingsService } from '../../services/settingsService'
import { userService } from '../../services/userService'
import { useAuthStore } from '../../store/authStore'

export function MentionText({ text, className }: { text: string; className?: string }) {
  const meId = useAuthStore((s) => s.user?.id)
  const parts = text.split(/(@[a-zA-Z0-9._]+)/g)
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part.startsWith('@')) return <span key={i}>{part}</span>
        const user = userService.getByUsername(part.slice(1))
        if (!user || (meId && !settingsService.visibleTo(meId, user.id))) return <span key={i}>{part}</span>
        return (
          <Link
            key={i}
            to={`/u/${user.username}`}
            className="font-semibold"
            onClick={(e) => e.stopPropagation()}
          >
            @{user.username}
          </Link>
        )
      })}
    </span>
  )
}
