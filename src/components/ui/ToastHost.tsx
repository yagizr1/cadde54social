import { useUiStore } from '../../store/uiStore'

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts)
  const xpBurst = useUiStore((s) => s.xpBurst)

  return (
    <>
      <div className="pointer-events-none fixed top-[calc(env(safe-area-inset-top)+1rem)] right-4 z-[210] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-xl anim-page ${
              t.tone === 'err' ? 'border-white/40 bg-panel' : 'border-line bg-panel'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
      {xpBurst ? (
        <div className="pointer-events-none fixed top-1/3 left-1/2 z-[110] -translate-x-1/2">
          <div className="anim-xp rounded-full border-2 border-white bg-hot px-5 py-2 font-display text-lg font-extrabold text-ink shadow-2xl">
            +{xpBurst.amount} XP
          </div>
        </div>
      ) : null}
    </>
  )
}
