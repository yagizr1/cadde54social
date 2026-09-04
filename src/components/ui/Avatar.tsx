import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../../lib/utils'

export function Avatar({
  src,
  name,
  size = 40,
  ring,
  className,
  peek = true,
}: {
  src: string
  name: string
  size?: number
  ring?: 'story' | 'story-seen' | 'none'
  className?: string
  peek?: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  const start = useRef({ x: 0, y: 0 })
  const swallowed = useRef(false)
  const endRef = useRef<() => void>(() => {})
  const [from, setFrom] = useState<DOMRect | null>(null)

  const ringClass =
    ring === 'story'
      ? 'bg-[conic-gradient(from_200deg,#f9ce34,#ee2a7b,#6228d7,#f9ce34)] p-[2px]'
      : ring === 'story-seen'
        ? 'bg-[#8e8e8e] p-[2px]'
        : ''

  function clearTimer() {
    window.clearTimeout(timer.current)
    timer.current = 0
  }

  function closePeek() {
    clearTimer()
    setFrom(null)
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!peek || !src || e.button !== 0) return
    swallowed.current = false
    start.current = { x: e.clientX, y: e.clientY }
    clearTimer()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    timer.current = window.setTimeout(() => {
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) return
      swallowed.current = true
      try {
        navigator.vibrate?.(12)
      } catch {
        /* ignore */
      }
      setFrom(rect)
    }, 380)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (from) return
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 12) clearTimer()
  }

  function onPointerEnd() {
    if (swallowed.current) {
      window.setTimeout(() => {
        swallowed.current = false
      }, 420)
    }
    closePeek()
  }

  endRef.current = onPointerEnd

  useEffect(() => {
    if (!from) return
    const up = () => endRef.current()
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [from])

  return (
    <>
      <div
        ref={rootRef}
        className={cx('avatar-hold shrink-0 rounded-full', ringClass, className)}
        style={{ width: size, height: size }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onContextMenu={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (!swallowed.current) return
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <div className={cx('h-full w-full rounded-full', ringClass && 'bg-ink p-[2px]')}>
          <img
            src={src}
            alt={name}
            draggable={false}
            className="pointer-events-none h-full w-full rounded-full bg-panel-2 object-cover"
          />
        </div>
      </div>
      {from && src ? <AvatarPeek src={src} name={name} from={from} /> : null}
    </>
  )
}

function AvatarPeek({ src, name, from }: { src: string; name: string; from: DOMRect }) {
  const [on, setOn] = useState(false)

  useLayoutEffect(() => {
    let live = true
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (live) setOn(true)
      })
    })
    return () => {
      live = false
      document.body.style.overflow = prev
    }
  }, [])

  const target = Math.min(340, Math.min(window.innerWidth, window.innerHeight) * 0.7)
  const tx = window.innerWidth / 2 - (from.left + from.width / 2)
  const ty = window.innerHeight / 2 - (from.top + from.height / 2)
  const scale = target / Math.max(from.width, 1)

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[160]">
      <div
        className={cx('absolute inset-0 bg-black/75 transition-opacity duration-200', on ? 'opacity-100' : 'opacity-0')}
      />
      <img
        src={src}
        alt={name}
        className="absolute rounded-full bg-panel-2 object-cover shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        style={{
          left: from.left,
          top: from.top,
          width: from.width,
          height: from.height,
          transform: on ? `translate(${tx}px, ${ty}px) scale(${scale})` : 'translate(0, 0) scale(1)',
          transformOrigin: 'center center',
          transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </div>,
    document.body,
  )
}
