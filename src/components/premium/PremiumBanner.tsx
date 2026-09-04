import { Link } from '../../lib/nav'
import { premiumService } from '../../services/premiumService'

export function PremiumBanner() {
  return (
    <Link
      to="/premium"
      className="mx-3 mt-3 block rounded-xl border border-hot/40 bg-gradient-to-r from-hot/20 to-[#262626] px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-bold">Cadde54 Social Premium</p>
          <p className="mt-0.5 text-[12px] text-white/80">
            {premiumService
              .plans()
              .map((p) => `${p.label} ${p.price} TL`)
              .join(' · ')}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-hot px-3 py-1.5 text-[13px] font-semibold text-ink">Üye ol</span>
      </div>
    </Link>
  )
}
