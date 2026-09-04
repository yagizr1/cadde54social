import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../../lib/utils'
import { shareService, type SharePayload } from '../../services/shareService'
import { useUiStore } from '../../store/uiStore'
import { Avatar } from './Avatar'

export function QuickShareButton({
  meId,
  payload,
  onOpenSheet,
  className,
  iconClassName,
  placement = 'top',
}: {
  meId: string
  payload: SharePayload
  onOpenSheet: () => void
  className?: string
  iconClassName?: string
  placement?: 'top' | 'left'
}) {
  const toast = useUiStore((s) => s.toast)
  const btnRef = useRef<HTMLButtonElement>(null)
  const timer = useRef<number | null>(null)
  const opened = useRef(false)
  const suppressClick = useRef(false)
  const hoverRef = useRef<string | null>(null)
  const [open, setOpen] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [anchor, setAnchor] = useState({ top: 0, left: 0 })
  const recents = shareService.recentChats(meId, 4)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  function clearTimer() {
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  function place() {
    const rect = btnRef.current?.getBoundingClientRect()
    if (!rect) return
    setAnchor({
      top: placement === 'top' ? rect.top - 8 : rect.top + rect.height / 2,
      left: placement === 'top' ? rect.left + rect.width / 2 : rect.left - 8,
    })
  }

  function idAt(x: number, y: number) {
    const el = document.elementFromPoint(x, y)
    return el?.closest('[data-quick-share]')?.getAttribute('data-quick-share') ?? null
  }

  function sendTo(userId: string) {
    const count = shareService.sendTo(meId, [userId], payload)
    const user = recents.find((u) => u.id === userId)
    if (count) toast(`@${user?.username ?? ''} kişisine gönderildi`)
    else toast('Gönderilemedi', 'err')
  }

  function close() {
    opened.current = false
    hoverRef.current = null
    setOpen(false)
    setHoverId(null)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={className}
        aria-label="Gönder"
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation()
          if (suppressClick.current) {
            suppressClick.current = false
            return
          }
          onOpenSheet()
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
          if (e.button !== 0) return
          opened.current = false
          hoverRef.current = null
          clearTimer()
          e.currentTarget.setPointerCapture(e.pointerId)
          timer.current = window.setTimeout(() => {
            if (!recents.length) {
              onOpenSheet()
              return
            }
            opened.current = true
            place()
            setOpen(true)
          }, 340)
        }}
        onPointerMove={(e) => {
          if (!opened.current) return
          const id = idAt(e.clientX, e.clientY)
          hoverRef.current = id
          setHoverId(id)
        }}
        onPointerUp={(e) => {
          e.stopPropagation()
          clearTimer()
          const wasOpen = opened.current
          const target = hoverRef.current
          suppressClick.current = true
          if (wasOpen && target) sendTo(target)
          else if (!wasOpen) onOpenSheet()
          close()
          try {
            e.currentTarget.releasePointerCapture(e.pointerId)
          } catch {
            /* already released */
          }
        }}
        onPointerCancel={(e) => {
          e.stopPropagation()
          clearTimer()
          close()
        }}
      >
        <Send className={iconClassName} />
      </button>

      {open
        ? createPortal(
            <div className="pointer-events-none fixed inset-0 z-[130]">
          <div
            className={cx(
              'pointer-events-auto absolute flex gap-3 rounded-3xl border border-white/10 bg-panel/95 px-3 py-2 shadow-2xl backdrop-blur-xl',
              placement === 'top' ? '-translate-x-1/2 -translate-y-full' : '-translate-x-full -translate-y-1/2',
            )}
            style={{ top: anchor.top, left: anchor.left }}
          >
            {recents.map((u) => {
              const on = hoverId === u.id
              return (
                <div
                  key={u.id}
                  data-quick-share={u.id}
                  className={cx(
                    'flex w-14 flex-col items-center transition-transform',
                    on && 'scale-110',
                  )}
                >
                  <span className={cx('rounded-full', on && 'ring-2 ring-hot ring-offset-2 ring-offset-panel')}>
                    <Avatar src={u.avatar} name={u.name} size={48} />
                  </span>
                  <p className="mt-1 max-w-full truncate text-center text-[10px] text-white/80">
                    {on ? 'Gönder' : u.username}
                  </p>
                </div>
              )
            })}
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
  )
}
