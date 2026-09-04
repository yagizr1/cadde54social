import { Sparkles } from 'lucide-react'
import { useNavigate } from '../../lib/nav'
import { Sheet } from '../ui/Sheet'

export function BoostSheet({
  open,
  onClose,
  kindLabel,
  boosted,
  hoursLeft,
  replacing,
  premium,
  busy,
  onConfirm,
  onStop,
}: {
  open: boolean
  onClose: () => void
  kindLabel: string
  boosted: boolean
  hoursLeft: number
  replacing: boolean
  premium: boolean
  busy: boolean
  onConfirm: () => void
  onStop: () => void
}) {
  const navigate = useNavigate()

  return (
    <Sheet open={open} onClose={onClose} title={boosted ? 'Öne çıkarılıyor' : 'Öne çıkar'}>
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-hot/15">
        <Sparkles className="h-6 w-6 text-hot" />
      </div>
      {boosted ? (
        <p className="text-center text-sm leading-relaxed text-mute">
          Bu {kindLabel} Keşfet ve akışta yaklaşık {hoursLeft} saat daha önde durur.
        </p>
      ) : premium ? (
        <p className="text-center text-sm leading-relaxed text-mute">
          24 saat Keşfet’te büyük görünür, takip etmeyenlerin akışında üste çıkar.
          {replacing
            ? ' Şu an başka bir içerik öne çıkıyor; bunu seçersen diğeri durur.'
            : ' Aynı anda bir içerik öne çıkarılır.'}
        </p>
      ) : (
        <p className="text-center text-sm leading-relaxed text-mute">
          Premium ile {kindLabel}ni 24 saat Keşfet’te ve akışta öne çıkar.
        </p>
      )}

      {boosted ? (
        <button
          type="button"
          disabled={busy}
          onClick={onStop}
          className="mt-4 w-full rounded-2xl bg-panel py-3 text-sm font-semibold disabled:opacity-50"
        >
          Öne çıkarmayı durdur
        </button>
      ) : premium ? (
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="mt-4 w-full rounded-2xl bg-hot py-3 text-sm font-semibold text-ink disabled:opacity-50"
        >
          24 saat öne çıkar
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            onClose()
            navigate('/premium')
          }}
          className="mt-4 w-full rounded-2xl bg-hot py-3 text-sm font-semibold text-ink"
        >
          Premium’a geç
        </button>
      )}
      <button type="button" onClick={onClose} className="mt-2 w-full rounded-2xl bg-panel py-3 text-sm font-semibold">
        Vazgeç
      </button>
    </Sheet>
  )
}
