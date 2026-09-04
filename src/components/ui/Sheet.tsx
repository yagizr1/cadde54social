import type { ReactNode } from 'react'

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center">
      <button className="absolute inset-0 bg-black/60 anim-backdrop" onClick={onClose} aria-label="Kapat" />
      <div className="relative w-full max-w-lg rounded-t-2xl border border-white/10 bg-ink-2 p-4 anim-sheet md:rounded-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25 md:hidden" />
        {title ? <h3 className="mb-3 text-center text-[16px] font-semibold">{title}</h3> : null}
        {children}
      </div>
    </div>
  )
}
