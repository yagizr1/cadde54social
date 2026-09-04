import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'

const VIEW = 280
const OUT = 720

function clampOffset(x: number, y: number, zoom: number, w: number, h: number) {
  const s = (VIEW / Math.min(w, h)) * zoom
  const maxX = Math.max(0, (w * s - VIEW) / 2)
  const maxY = Math.max(0, (h * s - VIEW) / 2)
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  }
}

export function AvatarCropSheet({
  file,
  onClose,
  onDone,
}: {
  file: File
  onClose: () => void
  onDone: (dataUrl: string) => Promise<void>
}) {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const [src, setSrc] = useState('')
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const s = size.w ? (VIEW / Math.min(size.w, size.h)) * zoom : 1
  const left = VIEW / 2 + pos.x - (size.w * s) / 2
  const top = VIEW / 2 + pos.y - (size.h * s) / 2

  function setZoomClamped(next: number) {
    const z = Math.min(4, Math.max(1, next))
    setZoom(z)
    setPos((p) => clampOffset(p.x, p.y, z, size.w, size.h))
  }

  function onPointerDown(e: React.PointerEvent) {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) {
      drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y }
      pinch.current = null
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()]
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      pinch.current = { dist, zoom }
      drag.current = null
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && pointers.current.size >= 2) {
      const pts = [...pointers.current.values()]
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (pinch.current.dist > 0) setZoomClamped(pinch.current.zoom * (dist / pinch.current.dist))
      return
    }
    if (!drag.current) return
    const nx = drag.current.ox + (e.clientX - drag.current.x)
    const ny = drag.current.oy + (e.clientY - drag.current.y)
    setPos(clampOffset(nx, ny, zoom, size.w, size.h))
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) drag.current = null
  }

  async function confirm() {
    const img = imgRef.current
    if (!img || !size.w) return
    setBusy(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = OUT
      canvas.height = OUT
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const k = OUT / VIEW
      ctx.fillStyle = '#111'
      ctx.fillRect(0, 0, OUT, OUT)
      ctx.drawImage(img, left * k, top * k, size.w * s * k, size.h * s * k)
      await onDone(canvas.toDataURL('image/jpeg', 0.9))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center md:items-center">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Kapat" />
      <div className="relative w-full max-w-md rounded-t-2xl border border-white/10 bg-ink-2 p-4 md:rounded-2xl">
        <h3 className="mb-3 text-center text-[16px] font-semibold">Fotoğrafı ayarla</h3>
        <p className="mb-3 text-center text-[12px] text-mute">Sürükle, pinch veya zoom</p>
        <div
          className="relative mx-auto overflow-hidden rounded-full bg-black touch-none"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={(e) => {
            e.preventDefault()
            setZoomClamped(zoom + (e.deltaY < 0 ? 0.12 : -0.12))
          }}
        >
          {src ? (
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              className="absolute max-w-none select-none"
              style={{ width: size.w * s, height: size.h * s, left, top }}
              onLoad={(e) => {
                const el = e.currentTarget
                setSize({ w: el.naturalWidth, h: el.naturalHeight })
                setZoom(1)
                setPos({ x: 0, y: 0 })
              }}
            />
          ) : null}
        </div>
        <label className="mt-4 block text-[12px] text-mute">
          Zoom
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoomClamped(Number(e.target.value))}
            className="mt-1 w-full accent-hot"
          />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button type="button" onClick={() => void confirm()} disabled={busy || !size.w}>
            {busy ? 'Kaydediliyor' : 'Kullan'}
          </Button>
        </div>
      </div>
    </div>
  )
}
