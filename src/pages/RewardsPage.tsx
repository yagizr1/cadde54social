import { Gift } from 'lucide-react'

export function RewardsPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 anim-page">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-hot/15 text-hot">
        <Gift className="h-6 w-6" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold">Ayın ödülleri</h1>
      <p className="mt-2 text-sm leading-relaxed text-mute">
        Çekiliş ve ödül programı henüz başlamadı. Katılım, XP hakkı veya kazanan belirlenmez.
        Gerçek bir kampanya açılana kadar bu sayfa yalnızca yer tutucudur.
      </p>
    </div>
  )
}
