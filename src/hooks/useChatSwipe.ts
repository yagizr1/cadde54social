import { useRef, useState, type PointerEvent } from 'react'
import { clamp } from '../lib/utils'

export const TIME_REVEAL_MAX = 56
const REPLY_MAX = 72
const REPLY_OK = 48
const LOCK = 12

export function useChatSwipe(onReply: (id: string) => void) {
  const [reveal, setReveal] = useState(0)
  const [reply, setReply] = useState({ id: '', x: 0 })
  const revealRef = useRef(0)
  const replyRef = useRef({ id: '', x: 0 })
  const swiped = useRef(false)
  const g = useRef({
    mode: 'none' as 'none' | 'time' | 'reply' | 'scroll',
    x: 0,
    y: 0,
    id: '',
  })

  function finish() {
    if (g.current.mode === 'reply' && replyRef.current.x >= REPLY_OK && replyRef.current.id) {
      onReply(replyRef.current.id)
    }
    if (g.current.mode === 'time' && revealRef.current > 2) {
      const from = revealRef.current
      const t0 = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / 220)
        const eased = 1 - (1 - p) * (1 - p)
        const v = from * (1 - eased)
        revealRef.current = v
        setReveal(v)
        if (p < 1) requestAnimationFrame(step)
        else {
          revealRef.current = 0
          setReveal(0)
        }
      }
      requestAnimationFrame(step)
    } else if (g.current.mode !== 'scroll') {
      revealRef.current = 0
      setReveal(0)
    }
    replyRef.current = { id: '', x: 0 }
    setReply({ id: '', x: 0 })
    g.current.mode = 'none'
  }

  return {
    reveal,
    reply,
    didSwipe: () => swiped.current,
    bind: {
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return
        swiped.current = false
        const mid = (e.target as HTMLElement).closest('[data-mid]')?.getAttribute('data-mid') ?? ''
        g.current = { mode: 'none', x: e.clientX, y: e.clientY, id: mid }
      },
      onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
        const dx = e.clientX - g.current.x
        const dy = e.clientY - g.current.y
        if (g.current.mode === 'none') {
          if (Math.abs(dx) < LOCK && Math.abs(dy) < LOCK) return
          if (Math.abs(dy) >= Math.abs(dx)) {
            g.current.mode = 'scroll'
            return
          }
          if (dx < 0) g.current.mode = 'time'
          else if (g.current.id) g.current.mode = 'reply'
          else {
            g.current.mode = 'scroll'
            return
          }
          swiped.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
        }
        if (g.current.mode === 'time') {
          const v = clamp(-dx, 0, TIME_REVEAL_MAX)
          revealRef.current = v
          setReveal(v)
        }
        if (g.current.mode === 'reply') {
          const v = clamp(dx, 0, REPLY_MAX)
          replyRef.current = { id: g.current.id, x: v }
          setReply({ id: g.current.id, x: v })
        }
      },
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  }
}
