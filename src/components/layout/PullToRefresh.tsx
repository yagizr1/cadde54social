import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '../../lib/utils'

const THRESHOLD = 68
const MAX = 108
const LOCK = 14

function pageTop() {
  return (window.scrollY || document.documentElement.scrollTop || 0) <= 2
}

export function PullToRefresh({
  onRefresh,
  disabled,
  children,
}: {
  onRefresh: () => void | Promise<void>
  disabled?: boolean
  children: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const start = useRef<{ y: number; x: number } | null>(null)
  const mode = useRef<'none' | 'pull' | 'scroll'>('none')
  const pullRef = useRef(0)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  function setPullBoth(n: number) {
    pullRef.current = n
    setPull(n)
  }

  function reset() {
    start.current = null
    mode.current = 'none'
    if (!refreshing) setPullBoth(0)
  }

  async function runRefresh() {
    setRefreshing(true)
    setPullBoth(THRESHOLD)
    try {
      await Promise.all([
        Promise.resolve(onRefresh()),
        new Promise((r) => window.setTimeout(r, 450)),
      ])
    } finally {
      setRefreshing(false)
      setPullBoth(0)
    }
  }

  useEffect(() => {
    const el = root.current
    if (!el) return
    const onMove = (e: TouchEvent) => {
      if (mode.current === 'pull' && pullRef.current > 0) e.preventDefault()
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [])

  const progress = Math.min(1, pull / THRESHOLD)

  return (
    <div
      ref={root}
      className="relative"
      onPointerDown={(e) => {
        if (disabled || refreshing || e.button !== 0) return
        if (!pageTop()) return
        start.current = { y: e.clientY, x: e.clientX }
        mode.current = 'none'
      }}
      onPointerMove={(e) => {
        if (disabled || refreshing || !start.current) return
        const dy = e.clientY - start.current.y
        const dx = e.clientX - start.current.x
        if (mode.current === 'none') {
          if (Math.abs(dx) < LOCK && Math.abs(dy) < LOCK) return
          if (dy > 0 && Math.abs(dy) >= Math.abs(dx) && pageTop()) {
            mode.current = 'pull'
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {
              /* ignore */
            }
          } else {
            mode.current = 'scroll'
            return
          }
        }
        if (mode.current !== 'pull') return
        if (dy <= 0 || !pageTop()) {
          setPullBoth(0)
          mode.current = 'scroll'
          try {
            e.currentTarget.releasePointerCapture(e.pointerId)
          } catch {
            /* ignore */
          }
          return
        }
        setPullBoth(Math.min(MAX, (dy - LOCK) * 0.48))
      }}
      onPointerUp={() => {
        if (disabled) return
        if (mode.current === 'pull' && pullRef.current >= THRESHOLD) void runRefresh()
        else reset()
        start.current = null
        mode.current = 'none'
      }}
      onPointerCancel={reset}
    >
      <div
        className="pointer-events-none flex items-end justify-center overflow-hidden"
        style={{ height: refreshing ? THRESHOLD : pull }}
      >
        <span
          className={cx('mb-2 grid h-8 w-8 place-items-center', refreshing && 'animate-spin')}
          style={refreshing ? undefined : { transform: `rotate(${progress * 280}deg)` }}
        >
          <svg viewBox="0 0 32 32" className="h-7 w-7 text-white">
            <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeWidth="2.4" className="opacity-20" />
            <circle
              cx="16"
              cy="16"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(4, progress * 62)} 62`}
              className={refreshing || progress >= 1 ? 'text-hot' : 'text-white'}
            />
          </svg>
        </span>
      </div>
      {children}
    </div>
  )
}
