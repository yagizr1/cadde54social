import type { ReactNode } from 'react'
import { Check, ChevronDown, Copy, Share, X } from 'lucide-react'
import { useState } from 'react'
import { copyText } from '../../lib/utils'
import { useUiStore } from '../../store/uiStore'

function Row({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-hot text-[15px] font-bold text-ink">
        {n}
      </span>
      <p className="pt-1 text-[16px] leading-snug">{children}</p>
    </div>
  )
}

export function IosInstallGuide({
  inApp,
  onClose,
}: {
  inApp: boolean
  onClose: () => void
}) {
  const toast = useUiStore((s) => s.toast)
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    await copyText(window.location.origin)
    setCopied(true)
    toast('Link kopyalandı')
  }

  return (
    <div className="fixed inset-0 z-[80]">
      <button type="button" className="absolute inset-0 bg-black/75" onClick={onClose} aria-label="Kapat" />

      <div
        className={`absolute inset-x-0 top-0 flex justify-center overflow-y-auto px-4 pt-[calc(env(safe-area-inset-top)+12px)] ${
          inApp ? 'bottom-0 pb-[max(12px,env(safe-area-inset-bottom))]' : 'bottom-16'
        }`}
      >
        <div className="my-auto w-full max-w-sm rounded-2xl bg-[#1a1a1a] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[18px] font-bold">Telefona ekle</p>
            <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center" aria-label="Kapat">
              <X className="h-5 w-5 text-mute" />
            </button>
          </div>

          {inApp ? (
            <div className="mt-2 divide-y divide-white/10">
              <Row n={1}>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="inline-flex items-center gap-2 font-semibold text-hot"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Kopyalandı' : 'Buraya bas, link kopyalansın'}
                </button>
              </Row>
              <Row n={2}>Safari uygulamasını aç</Row>
              <Row n={3}>Yapıştır, siteyi aç</Row>
              <Row n={4}>Yeşil İndir yazısına bas</Row>
            </div>
          ) : (
            <>
              <div className="mt-2 divide-y divide-white/10">
                <Row n={1}>
                  En alttaki{' '}
                  <Share className="mx-0.5 inline h-5 w-5 text-hot" strokeWidth={2.4} />{' '}
                  kare ok düğmesine bas
                </Row>
                <Row n={2}>Açılan listeyi parmağınla aşağı kaydır</Row>
                <Row n={3}>
                  <span className="font-semibold">Ana Ekrana Ekle</span> yazısına bas
                </Row>
                <Row n={4}>
                  Sağ üstteki <span className="font-semibold">Ekle</span> yazısına bas
                </Row>
                <Row n={5}>Uygulama indirildi. Telefondaki uygulamalar kısmından girebilirsin</Row>
              </div>
              <p className="mt-3 text-[13px] leading-snug text-mute">
                Not: Safari’de Ana Ekrana Ekle çıkmıyorsa aynı adımları Google Chrome’dan yap.
              </p>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-hot py-3 text-[16px] font-semibold text-ink"
          >
            Tamam
          </button>
        </div>
      </div>

      {inApp ? null : (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-16 flex-col items-center justify-end pb-2">
          <ChevronDown className="h-8 w-8 animate-bounce text-hot" />
        </div>
      )}
    </div>
  )
}
