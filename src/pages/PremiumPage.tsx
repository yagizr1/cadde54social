import { Check } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { premiumService } from '../services/premiumService'

const perks = [
  'Profilini kimlerin gördüğünü gör',
  'Detaylı profil istatistikleri',
  'Profil öne çıkarma',
  'Mavi tik (onaylı hesap)',
  'Hayalet modu',
  'Tanış — kaydırarak eşleş',
]

const WA_NUMBER = '905388544878'

function planLabel(user: { premiumPlan?: string; premiumUntil?: number | null }) {
  if (user.premiumPlan === 'lifetime' || !user.premiumUntil) return 'Süresiz'
  if (user.premiumPlan === 'half') return '6 aylık'
  if (user.premiumPlan === 'year') return '1 yıllık'
  return premiumService.plans()[0]?.label ?? 'Aylık'
}

export function PremiumPage() {
  const { user } = useApp()
  if (!user) return null

  const active = premiumService.isActive(user)
  const lifetime = premiumService.isLifetime(user)
  const plan = premiumService.plans()[0]
  if (!plan) return null

  function openWhatsApp() {
    const text = 'Premium üyelik almak istiyorum 1 aylık'
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="mx-auto max-w-xl anim-page">
      <div className="px-4 pt-5 pb-4">
        <h1 className="text-[26px] font-bold leading-tight">Premium</h1>
        <p className="mt-2 text-[14px] text-mute">
          {lifetime ? 'Premium üyeliğin süresiz.' : 'WhatsApp’tan yaz; üyeliğin açılır.'}
        </p>
      </div>

      {active ? (
        <div className="mx-4 mb-4 rounded-xl bg-hot/15 px-4 py-3 text-[14px]">
          <p className="font-semibold text-hot">Premium hesabın aktif</p>
          <p className="mt-0.5 text-[13px] text-white/80">
            {lifetime
              ? 'Süresiz üyelik'
              : `${planLabel(user)}${
                  user.premiumUntil
                    ? ` · ${new Date(user.premiumUntil).toLocaleDateString('tr-TR')} tarihine kadar`
                    : ''
                }`}
          </p>
        </div>
      ) : null}

      {!lifetime ? (
      <div className="px-4">
        <div className="flex w-full items-center justify-between rounded-xl border border-hot bg-hot/10 px-4 py-3.5">
          <div>
            <p className="text-[15px] font-semibold">{plan.label}</p>
            <p className="text-[12px] text-mute">{plan.hint}</p>
          </div>
          <p className="text-[18px] font-bold">
            {plan.price} <span className="text-[13px] font-semibold text-mute">TL</span>
          </p>
        </div>

        <button
          type="button"
          onClick={openWhatsApp}
          className="mt-4 h-11 w-full rounded-lg bg-hot text-[15px] font-semibold text-ink"
        >
          {active ? '1 aylık yenile' : '1 aylık üye ol'}
        </button>
      </div>
      ) : null}

      <div className="mt-6 border-t border-white/10 px-4 py-4">
        <p className="mb-2 text-[13px] font-semibold text-mute">Neler var</p>
        <ul className="space-y-2">
          {perks.map((p) => (
            <li key={p} className="flex items-center gap-2 text-[14px]">
              <Check className="h-4 w-4 shrink-0 text-hot" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
