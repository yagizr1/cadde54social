import { useEffect, useState } from 'react'
import { Link } from '../lib/nav'
import { FeedPost } from '../components/feed/FeedPost'
import { StoryRail } from '../components/feed/StoryRail'
import { PremiumBanner } from '../components/premium/PremiumBanner'
import { EmptyState } from '../components/ui/EmptyState'
import { useApp } from '../hooks/useApp'
import { postService } from '../services/postService'
import { premiumService } from '../services/premiumService'
import { repostService } from '../services/repostService'
import { settingsService } from '../services/settingsService'

const shortcuts = [
  { to: '/premium', label: '💎 Premium' },
  { to: '/meet', label: '🔥 Tanış' },
  { to: '/meetups', label: '☕ Buluşmalar' },
  { to: '/confessions', label: '🕵️ İtiraflar' },
  { to: '/here', label: '📍 Buradayım' },
  { to: '/challenges', label: '⚡ Görevler' },
  { to: '/leaderboard', label: '🏆 Sıralama' },
]

export function HomePage() {
  const { user, tick } = useApp()
  const [, setBump] = useState(0)
  const feed = user
    ? repostService.homeFeed(user.id, user.following, tick).filter(
        (item) =>
          postService.isVisible(item.post, user.id) &&
          !settingsService.isMuted(user.id, item.post.userId) &&
          !settingsService.iBlocked(item.post.userId, user.id) &&
          (!item.repostedById ||
            (!settingsService.isMuted(user.id, item.repostedById) &&
              !settingsService.iBlocked(item.repostedById, user.id))),
      )
    : []
  const firstSuggested = feed.findIndex((item) => item.suggested)

  useEffect(() => {
    if (!user) return
    repostService.rememberHomeFeed(user.id, feed)
  }, [user?.id, tick])

  function onChange() {
    setBump((n) => n + 1)
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-xl anim-page">
      {!premiumService.isActive(user) ? <PremiumBanner /> : null}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pt-2 lg:hidden">
        {shortcuts.map((s) => (
          <Link key={s.to} to={s.to} className="shrink-0 rounded-lg bg-[#262626] px-2.5 py-1.5 text-[12px] font-medium text-white/85">
            {s.label}
          </Link>
        ))}
      </div>
      <StoryRail meId={user.id} />
      {feed.length === 0 ? (
        <div className="p-4">
          <EmptyState title="Feed boş" text="İlk gönderiyi sen paylaş." />
        </div>
      ) : (
        feed.map((item, i) => (
          <div key={item.key}>
            {i === firstSuggested ? (
              <div className="border-t border-white/10 px-4 py-3">
                <p className="text-[13px] font-semibold">Senin için önerilen</p>
                <p className="text-[12px] text-mute">Takip ettiklerini gördün. Keşfetmeye devam et.</p>
              </div>
            ) : null}
            <FeedPost
              post={item.post}
              meId={user.id}
              onChange={onChange}
              repostedById={item.repostedById}
              suggested={item.suggested}
            />
          </div>
        ))
      )}
    </div>
  )
}
