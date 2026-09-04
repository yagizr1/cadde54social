import { Clapperboard, Repeat2 } from 'lucide-react'
import { useNavigate } from '../../lib/nav'
import { postService } from '../../services/postService'
import { reelsService } from '../../services/reelsService'
import { repostService } from '../../services/repostService'
import type { Post } from '../../types'
import { EmptyProfileGrid, profileCellClass, profileGridClass } from './EmptyProfileGrid'
import { ProfileGrid } from './ProfileGrid'

export function ProfileRepostGrid({
  userId,
  meId,
  onChange,
}: {
  userId: string
  meId: string
  onChange: () => void
}) {
  const navigate = useNavigate()
  const items = repostService.byUser(userId)
  const posts = items
    .filter((r) => r.kind === 'post')
    .map((r) => postService.list().find((p) => p.id === r.targetId))
    .filter((p): p is Post => Boolean(p))
  const reels = items
    .filter((r) => r.kind === 'reel')
    .map((r) => reelsService.list().find((x) => x.id === r.targetId))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))

  if (!posts.length && !reels.length) {
    return <EmptyProfileGrid text="Henüz tekrar paylaşım yok." />
  }

  return (
    <div className="w-full min-w-0 overflow-hidden">
      {posts.length ? (
        <ProfileGrid posts={posts} empty="" meId={meId} onChange={onChange} repostBadge />
      ) : null}
      {reels.length ? (
        <div className={profileGridClass}>
          {reels.map((reel) => (
            <button
              key={reel.id}
              type="button"
              onClick={() => navigate(`/reels/${reel.id}`)}
              className={profileCellClass}
            >
              <video src={reel.videoUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              <Clapperboard className="absolute top-1.5 right-1.5 h-4 w-4 fill-white text-white drop-shadow" />
              <Repeat2 className="absolute right-1.5 bottom-1.5 h-4 w-4 text-white drop-shadow" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
