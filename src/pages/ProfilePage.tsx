import { ChartNoAxesColumn, ChevronDown, ChevronRight, Eye, Heart, Menu, Plus, Settings } from 'lucide-react'
import { useState } from 'react'
import { Link } from '../lib/nav'
import { ShareSheet } from '../components/ui/ShareSheet'
import { profileSharePayload } from '../services/shareService'
import { ProfileGrid } from '../components/profile/ProfileGrid'
import { ProfileHero } from '../components/profile/ProfileHero'
import { ProfileRepostGrid } from '../components/profile/ProfileRepostGrid'
import { ProfileTabs } from '../components/profile/ProfileTabs'
import { ProgressBar } from '../components/ui/ProgressBar'
import { VerifiedName } from '../components/ui/VerifiedName'
import { useApp } from '../hooks/useApp'
import { getLevelInfo } from '../lib/utils'
import { badgeService } from '../services/badgeService'
import { postService } from '../services/postService'
import { presenceService } from '../services/presenceService'
import { reelsService } from '../services/reelsService'
import { useUiStore } from '../store/uiStore'

export function ProfilePage() {
  const { user, refresh } = useApp()
  const setCreateOpen = useUiStore((s) => s.setCreateOpen)
  const setAccountSwitcher = useUiStore((s) => s.setAccountSwitcher)
  const [tab, setTab] = useState<'posts' | 'reels' | 'reposts' | 'saved' | 'badges'>('posts')
  const [shareOpen, setShareOpen] = useState(false)
  if (!user) return null

  const level = getLevelInfo(user.xp)
  const here = presenceService.isHere(user.hereUntil)
  const unlocked = badgeService.unlockedIds(user)
  const posts = postService.byUser(user.id)

  return (
    <div className="mx-auto w-full min-w-0 max-w-xl overflow-x-hidden anim-page">
      <header className="sticky top-0 z-20 flex h-12 items-center gap-2 bg-ink/90 px-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setAccountSwitcher(true)}
          className="flex min-w-0 flex-1 items-center gap-1 text-left"
        >
          <h1 className="min-w-0 truncate text-[20px] font-bold">
            <VerifiedName user={user} size={18} />
          </h1>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </button>
        <Link
          to="/profile/views"
          className="grid h-10 w-10 place-items-center"
          aria-label="Profilini kimler görüntüledi"
        >
          <Eye className="h-6 w-6" />
        </Link>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="grid h-10 w-10 place-items-center"
          aria-label="Yeni"
        >
          <Plus className="h-6 w-6" />
        </button>
        <Link to="/settings" className="grid h-10 w-10 place-items-center" aria-label="Ayarlar">
          <Menu className="h-6 w-6" />
        </Link>
      </header>

      <ProfileHero
        user={user}
        postCount={posts.length}
        here={here}
        linkStats
        badges={
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-mute">
              <span>Seviye {level.level}</span>
              <span>
                {user.xp} / {level.next} XP
              </span>
            </div>
            <ProgressBar value={user.xp / level.next} className="mt-1.5 h-1" />
          </div>
        }
        insights={
          <div className="mt-3 space-y-2">
            <Link
              to="/meet?tab=likes"
              className="flex items-center gap-3 rounded-lg bg-[#262626] px-3 py-2.5"
            >
              <Heart className="h-5 w-5 shrink-0 text-hot" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">Beni beğenenler</p>
                <p className="text-[12px] text-mute">Tanış’ta seni beğenenler</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-mute" />
            </Link>
            <Link
              to="/profile/insights"
              className="flex items-center gap-3 rounded-lg bg-[#262626] px-3 py-2.5"
            >
              <ChartNoAxesColumn className="h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">Profesyonel pano</p>
                <p className="text-[12px] text-mute">Görüntülenme, beğeni ve erişim</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-mute" />
            </Link>
          </div>
        }
        actions={
          <>
            <Link
              to="/profile/edit"
              className="flex h-8 flex-1 items-center justify-center rounded-lg bg-[#262626] text-[13px] font-semibold"
            >
              Profili düzenle
            </Link>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="flex h-8 flex-1 items-center justify-center rounded-lg bg-[#262626] text-[13px] font-semibold"
            >
              Paylaş
            </button>
            <Link
              to="/settings"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#262626]"
              aria-label="Ayarlar"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </>
        }
      />

      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} payload={profileSharePayload(user)} />
      <ProfileTabs tabs={['posts', 'reels', 'reposts', 'saved', 'badges']} value={tab} onChange={setTab} />
      <div>
        {tab === 'posts' ? (
          <ProfileGrid posts={posts} empty="Henüz gönderin yok." meId={user.id} onChange={refresh} />
        ) : null}
        {tab === 'reels' ? (
          <div className="grid w-full min-w-0 grid-cols-3 gap-px overflow-hidden bg-ink">
            {reelsService.byUser(user.id).map((r) => (
              <Link key={r.id} to="/reels" className="aspect-[9/16] min-w-0 overflow-hidden bg-ink">
                <video src={r.videoUrl} muted className="h-full w-full object-cover" />
              </Link>
            ))}
          </div>
        ) : null}
        {tab === 'reposts' ? (
          <ProfileRepostGrid userId={user.id} meId={user.id} onChange={refresh} />
        ) : null}
        {tab === 'saved' ? (
          <ProfileGrid posts={postService.savedBy(user.id)} empty="Kayıtlı gönderi yok." meId={user.id} onChange={refresh} />
        ) : null}
        {tab === 'badges' ? (
          <div className="grid grid-cols-2 gap-2 p-3">
            {badgeService.catalog().map((b) => {
              const on = unlocked.includes(b.id)
              return (
                <div key={b.id} className={`rounded-xl border p-4 ${on ? 'border-white/20 bg-panel' : 'border-line opacity-50'}`}>
                  <p className="text-2xl">{b.emoji}</p>
                  <p className="mt-2 font-semibold">{b.title}</p>
                  <p className="text-xs text-mute">
                    {on ? 'Açık' : 'Kilitli'} · {b.description}
                  </p>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
