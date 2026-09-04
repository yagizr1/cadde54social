import { useSearchParams } from 'react-router-dom'
import { Link } from '../lib/nav'
import { BackButton } from '../components/layout/BackButton'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { useApp } from '../hooks/useApp'
import { settingsService } from '../services/settingsService'
import { userService } from '../services/userService'
import { useUiStore } from '../store/uiStore'
import type { User } from '../types'

type Tab = 'followers' | 'following'

export function FriendsPage() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const [params, setParams] = useSearchParams()
  if (!user) return null

  const tab: Tab = params.get('tab') === 'following' ? 'following' : 'followers'
  const ids = tab === 'following' ? user.following : user.followers
  const people = ids
    .map((id) => userService.getById(id))
    .filter((u): u is User => u != null && u.id !== user.id && settingsService.visibleTo(user.id, u.id))

  return (
    <div className="mx-auto max-w-xl anim-page">
      <header className="safe-t sticky top-0 z-20 bg-ink/90 backdrop-blur-xl">
        <div className="flex h-12 items-center gap-1 px-1">
          <BackButton />
          <h1 className="min-w-0 flex-1 truncate text-[16px] font-semibold">{user.username}</h1>
        </div>
        <div className="grid grid-cols-2 border-b border-white/10">
          <button
            onClick={() => setParams({ tab: 'followers' })}
            className={`relative py-2.5 text-[14px] font-semibold ${tab === 'followers' ? 'text-white' : 'text-mute'}`}
          >
            Takipçi
            {tab === 'followers' ? <span className="absolute inset-x-0 bottom-0 h-[1px] bg-white" /> : null}
          </button>
          <button
            onClick={() => setParams({ tab: 'following' })}
            className={`relative py-2.5 text-[14px] font-semibold ${tab === 'following' ? 'text-white' : 'text-mute'}`}
          >
            Takip
            {tab === 'following' ? <span className="absolute inset-x-0 bottom-0 h-[1px] bg-white" /> : null}
          </button>
        </div>
      </header>
      <div>
        {people.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={tab === 'following' ? 'Kimseyi takip etmiyorsun' : 'Henüz takipçin yok'}
              text={tab === 'following' ? 'Keşfet’ten kullanıcı bul.' : 'Paylaşım yaptıkça burası dolar.'}
            />
          </div>
        ) : (
          people.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-2">
              <Link to={`/u/${u.username}`}>
                <Avatar src={u.avatar} name={u.name} size={44} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/u/${u.username}`} className="block truncate text-[14px] font-semibold">
                  {u.username}
                </Link>
                <p className="truncate text-[13px] text-mute">
                  {settingsService.isHereVisible(u.id, u.hereUntil, user.id) ? 'Cadde 54’te' : u.name}
                </p>
              </div>
              {tab === 'followers' ? (
                <button
                  type="button"
                  className="h-8 rounded-lg bg-[#262626] px-3 text-[13px] font-semibold"
                  onClick={() => {
                    userService.removeFollower(user.id, u.id)
                    toast(`${u.username} takipçilerden çıkarıldı`)
                    refresh()
                  }}
                >
                  Çıkar
                </button>
              ) : (
                <button
                  type="button"
                  className="h-8 rounded-lg bg-[#262626] px-3 text-[13px] font-semibold"
                  onClick={() => {
                    userService.unfollow(user.id, u.id)
                    toast(`${u.username} takipten çıkıldı`)
                    refresh()
                  }}
                >
                  Takiptesin
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
