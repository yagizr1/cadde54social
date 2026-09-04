import { MoreHorizontal, Send, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link, Navigate, useNavigate } from '../lib/nav'
import { BackButton } from '../components/layout/BackButton'
import { ProfileGrid } from '../components/profile/ProfileGrid'
import { ProfileHero } from '../components/profile/ProfileHero'
import { ProfileRepostGrid } from '../components/profile/ProfileRepostGrid'
import { ProfileTabs } from '../components/profile/ProfileTabs'
import { UserActionsSheet } from '../components/profile/UserActionsSheet'
import { ShareSheet } from '../components/ui/ShareSheet'
import { VerifiedName } from '../components/ui/VerifiedName'
import { profileSharePayload } from '../services/shareService'
import { useApp } from '../hooks/useApp'
import { getLevelInfo } from '../lib/utils'
import { meetService } from '../services/meetService'
import { challengeService } from '../services/challengeService'
import { messageService } from '../services/messageService'
import { postService } from '../services/postService'
import { profileViewService } from '../services/profileViewService'
import { reelsService } from '../services/reelsService'
import { isBoosted } from '../services/boostService'
import { settingsService } from '../services/settingsService'
import { userService } from '../services/userService'
import { useUiStore } from '../store/uiStore'

export function UserProfilePage() {
  const { username = '' } = useParams()
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const navigate = useNavigate()
  const [tab, setTab] = useState<'posts' | 'reels' | 'reposts'>('posts')
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const target = userService.getByUsername(username)

  useEffect(() => {
    if (user && target && user.id !== target.id) {
      profileViewService.record(user.id, target.id)
    }
  }, [user?.id, target?.id])

  if (!user) return null
  if (!target) {
    return <div className="p-6 text-center text-mute">Kullanıcı bulunamadı.</div>
  }
  if (target.id === user.id) {
    return <Navigate to="/profile" replace />
  }

  const theyBlocked = settingsService.iBlocked(target.id, user.id)
  const following = user.following.includes(target.id)
  const here = settingsService.isHereVisible(target.id, target.hereUntil, user.id)
  const targetSettings = settingsService.get(target.id)
  const locked = targetSettings.privateAccount && !following
  const posts = postService.byUser(target.id)
  const level = getLevelInfo(target.xp)
  const common = meetService.commonFollowers(user.id, target.id)

  if (theyBlocked) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-xl overflow-x-hidden anim-page">
        <header className="sticky top-0 z-20 flex h-12 items-center gap-1 bg-ink/90 px-1 backdrop-blur-xl">
          <BackButton />
        </header>
        <div className="px-6 py-20 text-center">
          <p className="text-[18px] font-semibold">Kullanıcı bulunamadı</p>
          <p className="mt-2 text-sm text-mute">Bu profile ulaşılamıyor.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-xl overflow-x-hidden anim-page">
      <header className="sticky top-0 z-20 flex h-12 items-center gap-1 bg-ink/90 px-1 backdrop-blur-xl">
        <BackButton />
        <h1 className="min-w-0 flex-1 truncate text-[16px] font-semibold">
          <VerifiedName user={target} size={16} />
        </h1>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="grid h-10 w-10 place-items-center"
          aria-label="Daha fazla"
        >
          <MoreHorizontal className="h-6 w-6" />
        </button>
      </header>

      <ProfileHero
        user={target}
        postCount={posts.length}
        here={here}
        locked={targetSettings.privateAccount}
        badges={
          locked ? null : (
            <div className="mt-2 space-y-1">
              <p className="text-[13px] text-mute">
                Seviye {level.level} · {target.xp} XP
              </p>
              {common.length ? (
                <p className="text-[13px] text-mute">
                  Ortak takipçiler:{' '}
                  {common.slice(0, 3).map((u) => u.name).join(', ')}
                  {common.length > 3 ? ` +${common.length - 3}` : ''}
                </p>
              ) : null}
            </div>
          )
        }
        actions={
          <>
            <button
              type="button"
              className={`flex h-8 flex-1 items-center justify-center rounded-lg text-[13px] font-semibold ${
                following ? 'bg-[#262626]' : 'bg-hot text-ink'
              }`}
              onClick={() => {
                if (following) userService.unfollow(user.id, target.id)
                else {
                  userService.follow(user.id, target.id)
                  challengeService.track(user.id, 'interact_users', target.id)
                }
                toast(following ? 'Takipten çıkıldı' : `${target.username} takip ediliyor`)
                refresh()
              }}
            >
              {following ? 'Takiptesin' : 'Takip et'}
            </button>
            <button
              type="button"
              className="flex h-8 flex-1 items-center justify-center rounded-lg bg-[#262626] text-[13px] font-semibold"
              onClick={() => {
                const gate = settingsService.canMessage(user.id, target.id)
                if (!gate.ok) {
                  toast(gate.reason ?? 'Mesaj gönderilemez', 'err')
                  return
                }
                const conv = messageService.withUser(user.id, target.id)
                navigate(`/messages/${conv.id}`)
              }}
            >
              Mesaj
            </button>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="grid h-8 w-8 place-items-center rounded-lg bg-[#262626]"
              aria-label="Profili gönder"
            >
              <Send className="h-4 w-4" />
            </button>
          </>
        }
      />

      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} payload={profileSharePayload(target)} />
      <UserActionsSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        meId={user.id}
        target={target}
        onChange={refresh}
      />
      <ProfileTabs tabs={['posts', 'reels', 'reposts']} value={tab} onChange={setTab} />
      <div>
        {locked ? (
          <p className="px-6 py-16 text-center text-sm text-mute">
            Gizli hesap. Gönderileri görmek için takip et.
          </p>
        ) : tab === 'posts' ? (
          <ProfileGrid posts={posts} empty="Gönderi yok." meId={user.id} onChange={refresh} />
        ) : tab === 'reposts' ? (
          <ProfileRepostGrid userId={target.id} meId={user.id} onChange={refresh} />
        ) : (
          <div className="grid w-full min-w-0 grid-cols-3 gap-px overflow-hidden bg-ink">
            {reelsService.byUser(target.id).map((r) => (
              <Link key={r.id} to={`/reels/${r.id}`} className="relative min-w-0 overflow-hidden bg-ink">
                <video src={r.videoUrl} muted className="aspect-[9/16] w-full object-cover" />
                {isBoosted(r) ? <Sparkles className="absolute top-1.5 right-1.5 h-3.5 w-3.5 fill-white text-white drop-shadow" /> : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
