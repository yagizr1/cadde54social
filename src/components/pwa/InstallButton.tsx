import { Download, Share, X } from 'lucide-react'
import { useState } from 'react'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { cx } from '../../lib/utils'
import { useUiStore } from '../../store/uiStore'

export function InstallButton({
  className,
  label = 'İndir',
}: {
  className?: string
  label?: string
}) {
  const { installed, ios, prompt } = usePwaInstall()
  const toast = useUiStore((s) => s.toast)
  const [iosOpen, setIosOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  if (installed) return null

  async function onClick() {
    if (busy) return
    if (ios) {
      setIosOpen(true)
      return
    }
    setBusy(true)
    const result = await prompt()
    setBusy(false)
    if (result === 'accepted') toast('Uygulama indirildi')
    else if (result === 'unavailable') {
      toast('Yükleme bu tarayıcıda açılmıyor. Chrome veya Edge kullan.', 'err')
    }
  }

  return (
    <>
      <button type="button" onClick={() => void onClick()} className={className} disabled={busy}>
        <Download className="h-4 w-4" />
        {busy ? 'İndiriliyor...' : label}
      </button>
      {iosOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-4 sm:place-items-center">
          <div className="w-full max-w-sm rounded-3xl border border-line bg-panel p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[17px] font-bold">Ana ekrana ekle</p>
              <button type="button" onClick={() => setIosOpen(false)} aria-label="Kapat">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-[14px] text-mute">
              iPhone’da Apple otomatik indirmeye izin vermiyor. Paylaş → Ana Ekrana Ekle.
            </p>
            <ol className="mt-4 space-y-3 text-[14px] text-mute">
              <li className="flex gap-2">
                <Share className="mt-0.5 h-4 w-4 shrink-0 text-hot" />
                Alttaki paylaş düğmesine bas
              </li>
              <li>1. “Ana Ekrana Ekle”yi seç</li>
              <li>2. Ekle’ye bas — uygulama /app olarak açılır</li>
            </ol>
            <button
              type="button"
              onClick={() => setIosOpen(false)}
              className="mt-5 w-full rounded-full bg-hot py-2.5 text-sm font-semibold text-ink"
            >
              Tamam
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function installBtnClass(kind: 'header' | 'hero' | 'ghost' = 'hero'): string {
  return cx(
    'inline-flex items-center justify-center gap-2 font-semibold',
    kind === 'header' && 'rounded-full bg-hot px-3.5 py-1.5 text-[13px] text-ink',
    kind === 'hero' && 'rounded-full bg-hot px-5 py-2.5 text-sm text-ink',
    kind === 'ghost' && 'rounded-full border border-white/15 px-5 py-2.5 text-sm',
  )
}
