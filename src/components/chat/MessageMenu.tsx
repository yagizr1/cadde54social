import { Copy, CornerUpLeft, Forward, Trash2 } from 'lucide-react'
import { createPortal } from 'react-dom'

export const REACT_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👍']

export function MessageMenu({
  mine,
  canCopy,
  canForward = true,
  canInteract = true,
  onReact,
  onReply,
  onForward,
  onCopy,
  onUnsend,
  onClose,
}: {
  mine: boolean
  canCopy: boolean
  canForward?: boolean
  canInteract?: boolean
  onReact: (emoji: string) => void
  onReply: () => void
  onForward: () => void
  onCopy: () => void
  onUnsend: () => void
  onClose: () => void
}) {
  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-center justify-center px-8">
      <button type="button" className="absolute inset-0 bg-black/55 anim-backdrop" onClick={onClose} aria-label="Kapat" />
      <div className="relative w-full max-w-[250px]">
        {canInteract ? (
          <div className="mb-2 flex justify-between rounded-full bg-[#2a2a2a] px-1.5 py-1 shadow-2xl">
            {REACT_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onReact(e)}
                className="grid h-11 w-11 place-items-center text-[22px] leading-none active:scale-90"
              >
                {e}
              </button>
            ))}
          </div>
        ) : null}
        <div className="overflow-hidden rounded-[14px] bg-[#2a2a2a] shadow-2xl">
          {canInteract ? <MenuItem icon={CornerUpLeft} label="Yanıtla" onClick={onReply} /> : null}
          {canForward ? <MenuItem icon={Forward} label="İlet" onClick={onForward} /> : null}
          {canCopy ? <MenuItem icon={Copy} label="Kopyala" onClick={onCopy} /> : null}
          {mine ? <MenuItem icon={Trash2} label="Geri al" danger onClick={onUnsend} /> : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Copy
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between border-b border-white/5 px-4 py-[13px] text-[15px] last:border-0 ${danger ? 'text-red-500' : ''}`}
    >
      {label}
      <Icon className="h-[18px] w-[18px]" />
    </button>
  )
}
