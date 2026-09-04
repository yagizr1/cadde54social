import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useWebPush } from '../../hooks/useWebPush'
import { isIosInAppBrowser } from '../../lib/pwaInstall'
import { IosInstallGuide } from './IosInstallGuide'

export function PushPrompt() {
  const push = useWebPush()
  const [ready, setReady] = useState(false)
  const [guide, setGuide] = useState(false)

  useEffect(() => {
    if (!push.showPrompt) {
      setReady(false)
      return
    }
    const t = window.setTimeout(() => setReady(true), 800)
    return () => window.clearTimeout(t)
  }, [push.showPrompt])

  if (guide) {
    return <IosInstallGuide inApp={isIosInAppBrowser()} onClose={() => setGuide(false)} />
  }

  if (!push.showPrompt || !ready) return null

  return createPortal(
    <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-black/70 anim-backdrop" onClick={push.dismiss} aria-label="Kapat" />
      <div className="relative w-full max-w-sm rounded-t-3xl border border-white/10 bg-ink-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 anim-sheet sm:mb-0 sm:rounded-3xl">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-hot/15">
          <Bell className="h-7 w-7 text-hot" />
        </div>
        <p className="text-center text-[20px] font-bold">Bildirimlere izin ver</p>
        <p className="mt-2 text-center text-[14px] leading-snug text-mute">
          {push.needsInstall
            ? 'iPhone’da önce uygulamayı ana ekrana ekle, oradan aç, sonra mesaj ve beğeniler kilit ekranına düşer.'
            : 'Mesaj, beğeni, yorum, takip ve eşleşmeler telefonunun bildirim tepsisine düşsün.'}
        </p>
        {push.error ? <p className="mt-3 text-center text-[12px] text-red-400">{push.error}</p> : null}
        {push.needsInstall ? (
          <button
            type="button"
            onClick={() => setGuide(true)}
            className="mt-5 h-12 w-full rounded-2xl bg-hot text-[16px] font-semibold text-ink"
          >
            Nasıl eklerim
          </button>
        ) : (
          <button
            type="button"
            disabled={push.busy}
            onClick={() => void push.enable().catch(() => undefined)}
            className="mt-5 h-12 w-full rounded-2xl bg-hot text-[16px] font-semibold text-ink disabled:opacity-50"
          >
            {push.busy ? '...' : 'İzin ver'}
          </button>
        )}
        <button
          type="button"
          onClick={push.dismiss}
          className="mt-2 h-11 w-full text-[15px] font-semibold text-mute"
        >
          Şimdi değil
        </button>
      </div>
    </div>,
    document.body,
  )
}
