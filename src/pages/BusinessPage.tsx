import { Store } from 'lucide-react'

export function BusinessPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 anim-page">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-hot/15 text-hot">
        <Store className="h-6 w-6" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold">İşletmeler</h1>
      <p className="mt-2 text-sm leading-relaxed text-mute">
        Cadde 54 çevresi işletmeler ve kampanyalar henüz yayında değil. Sahte liste veya kayıt
        yok; bu sayfa yer tutucudur. Açılınca buradan duyurulur.
      </p>
    </div>
  )
}
