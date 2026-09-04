import { Link, useNavigate } from '../lib/nav'
import { PremiumGate } from '../components/premium/PremiumGate'
import { Avatar } from '../components/ui/Avatar'
import { useApp } from '../hooks/useApp'
import { timeAgo } from '../lib/utils'
import { premiumService } from '../services/premiumService'
import { profileViewService } from '../services/profileViewService'
import { settingsService } from '../services/settingsService'
import { userService } from '../services/userService'
import { useUiStore } from '../store/uiStore'

const LOCKED_ROWS = [1, 2, 3, 4, 5, 6]

export function ProfileViewsPage() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const navigate = useNavigate()
  if (!user) return null
  const userId = user.id
  const premium = premiumService.isActive(user)
  const views = profileViewService.listFor(userId).filter((v) => settingsService.visibleTo(userId, v.viewerId))
  const ghost = settingsService.get(userId).ghostMode

  function toggleGhost(next: boolean) {
    if (!premium) {
      toast('Hayalet modu Premium ile açılır', 'info')
      navigate('/premium')
      return
    }
    settingsService.update(userId, { ghostMode: next })
    refresh()
    toast(next ? 'Hayalet modu açık' : 'Hayalet modu kapalı')
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-4 anim-page">
      <h1 className="font-display text-2xl font-bold">Profilini kimler görüntüledi?</h1>
      <p className="mt-1 text-sm text-mute">Premium özellik. Tam konum değil, sadece ziyaret kaydı.</p>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-3">
        <div>
          <p className="font-semibold">Hayalet modu</p>
          <p className="text-xs text-mute">Açıkken sen başkasını görürsün, onlar seni görmez.</p>
        </div>
        <button
          type="button"
          onClick={() => toggleGhost(!ghost)}
          className={`relative h-7 w-12 rounded-full transition ${premium && ghost ? 'bg-hot' : 'bg-line'}`}
          aria-pressed={premium && ghost}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${premium && ghost ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      {!premium ? (
        <div className="mt-6">
          <PremiumGate title="Premium ile kimlerin profilini görüntülediğini gör.">
            <div className="space-y-2">
              {LOCKED_ROWS.map((row) => (
                <div key={row} className="flex items-center gap-3 rounded-2xl bg-panel p-3">
                  <span className="h-11 w-11 shrink-0 rounded-full bg-white/25" />
                  <div className="min-w-0 flex-1">
                    <p className="h-3.5 w-28 rounded-full bg-white/30" />
                    <p className="mt-2 h-2.5 w-16 rounded-full bg-white/15" />
                  </div>
                </div>
              ))}
            </div>
          </PremiumGate>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {views.length === 0 ? (
            <p className="rounded-2xl border border-line bg-panel px-4 py-8 text-center text-sm text-mute">
              Henüz görüntüleyen yok.
            </p>
          ) : (
            views.map((v) => {
              const u = userService.getById(v.viewerId)
              if (!u) return null
              return (
                <Link key={v.id} to={`/u/${u.username}`} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3">
                  <Avatar src={u.avatar} name={u.name} size={44} />
                  <div>
                    <p className="font-semibold">@{u.username}</p>
                    <p className="text-xs text-mute">{timeAgo(v.createdAt)}</p>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
