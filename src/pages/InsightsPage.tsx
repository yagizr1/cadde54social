import { ChevronRight } from 'lucide-react'
import { Link } from '../lib/nav'
import { PremiumGate } from '../components/premium/PremiumGate'
import { useApp } from '../hooks/useApp'
import { formatCount } from '../lib/utils'
import { insightsService } from '../services/insightsService'
import { premiumService } from '../services/premiumService'

const LOCKED = [
  ['Profil görüntülenme', '128'],
  ['Beğeni', '64'],
  ['Yorum', '18'],
  ['Hikaye', '41'],
  ['Takipçi', '96'],
  ['Gönderi', '12'],
]

export function InsightsPage() {
  const { user } = useApp()
  if (!user) return null
  const premium = premiumService.isActive(user)
  const stats = insightsService.forUser(user.id)
  const likes = stats.postLikes + stats.reelLikes

  const cards = [
    { label: 'Profil görüntülenme', value: stats.views7d, hint: 'Son 7 gün' },
    { label: 'Toplam görüntülenme', value: stats.viewsAll, hint: 'Tüm zamanlar' },
    { label: 'Beğeni', value: likes, hint: 'Gönderi + Reels' },
    { label: 'Yorum', value: stats.comments, hint: 'Gelen yorum' },
    { label: 'Hikaye izlenme', value: stats.storyViews, hint: 'Aktif hikayeler' },
    { label: 'Takipçi', value: stats.followers, hint: 'Şu an' },
  ]

  return (
    <div className="mx-auto max-w-xl px-4 py-4 anim-page">
      <h1 className="font-display text-2xl font-bold">İstatistikler</h1>
      <p className="mt-1 text-sm text-mute">Profesyonel pano. Hesabının görünürlüğü ve etkileşimi.</p>

      {!premium ? (
        <div className="mt-6">
          <PremiumGate title="Premium ile detaylı istatistikleri gör.">
            <div className="grid grid-cols-2 gap-2">
              {LOCKED.map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-panel p-4">
                  <p className="text-[22px] font-bold">{value}</p>
                  <p className="mt-1 text-[13px] text-mute">{label}</p>
                </div>
              ))}
            </div>
          </PremiumGate>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-2">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-line bg-panel p-4">
              <p className="text-[22px] font-bold">{formatCount(c.value)}</p>
              <p className="mt-1 text-[13px] font-semibold">{c.label}</p>
              <p className="text-[11px] text-mute">{c.hint}</p>
            </div>
          ))}
        </div>
      )}

      <Link
        to="/profile/views"
        className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-panel px-4 py-3"
      >
        <div>
          <p className="text-[14px] font-semibold">Kimler görüntüledi</p>
          <p className="text-[12px] text-mute">Ziyaret listesi ve hayalet modu</p>
        </div>
        <ChevronRight className="h-5 w-5 text-mute" />
      </Link>
    </div>
  )
}
