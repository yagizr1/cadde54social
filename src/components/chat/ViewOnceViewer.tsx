import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function ViewOnceViewer({
  src,
  caption,
  onClose,
}: {
  src: string
  caption?: string
  onClose: () => void
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <button type="button" className="fixed inset-0 z-[100] bg-black" onClick={onClose} aria-label="Kapat">
      <img src={src} alt="" className="h-full w-full object-contain" />
      <span className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
      <span className="absolute top-[calc(env(safe-area-inset-top)+0.6rem)] right-3 grid h-10 w-10 place-items-center rounded-full bg-black/45">
        <X className="h-6 w-6" />
      </span>
      <span className="absolute top-[calc(env(safe-area-inset-top)+0.85rem)] left-4 text-[13px] font-semibold text-white/80">
        Tek görüntüleme
      </span>
      {caption ? (
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-16 text-center text-[16px] font-medium">
          {caption}
        </span>
      ) : null}
    </button>,
    document.body,
  )
}
