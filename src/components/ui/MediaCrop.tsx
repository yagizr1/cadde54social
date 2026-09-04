import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'

export type MediaCropHandle = {
  exportFile: (filename?: string) => Promise<File>
}

function clampOffset(x: number, y: number, zoom: number, w: number, h: number, viewW: number, viewH: number) {
  const cover = Math.max(viewW / Math.max(w, 1), viewH / Math.max(h, 1))
  const s = cover * zoom
  const maxX = Math.max(0, (w * s - viewW) / 2)
  const maxY = Math.max(0, (h * s - viewH) / 2)
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  }
}

export const MediaCrop = forwardRef<
  MediaCropHandle,
  { src: string; aspect: number; className?: string }
>(function MediaCrop({ src, aspect, className }, ref) {
  const boxRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const [view, setView] = useState({ w: 0, h: 0 })
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setView({ w: Math.round(r.width), h: Math.round(r.height) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [src, aspect])

  useEffect(() => {
    setZoom(1)
    setPos({ x: 0, y: 0 })
  }, [src, aspect])

  const cover = size.w && view.w ? Math.max(view.w / size.w, view.h / size.h) : 1
  const s = cover * zoom
  const left = view.w / 2 + pos.x - (size.w * s) / 2
  const top = view.h / 2 + pos.y - (size.h * s) / 2

  function setZoomClamped(next: number) {
    const z = Math.min(4, Math.max(1, next))
    setZoom(z)
    setPos((p) => clampOffset(p.x, p.y, z, size.w, size.h, view.w, view.h))
  }

  function onPointerDown(e: React.PointerEvent) {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) {
      drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y }
      pinch.current = null
    } else if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), zoom }
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
    setPos(
      clampOffset(
        drag.current.ox + (e.clientX - drag.current.x),
        drag.current.oy + (e.clientY - drag.current.y),
        zoom,
        size.w,
        size.h,
        view.w,
        view.h,
      ),
    )
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) drag.current = null
  }

  useImperativeHandle(ref, () => ({
    async exportFile(filename = 'image.jpg') {
      const img = imgRef.current
      if (!img || !size.w || !view.w) throw new Error('Fotoğraf hazır değil')
      const max = 1080
      const outW = aspect >= 1 ? max : Math.max(1, Math.round(max * aspect))
      const outH = aspect >= 1 ? Math.max(1, Math.round(max / aspect)) : max
      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Kırpılamadı')
      const k = outW / view.w
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, outW, outH)
      ctx.drawImage(img, left * k, top * k, size.w * s * k, size.h * s * k)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((next) => {
          if (next) resolve(next)
          else reject(new Error('Kırpılamadı'))
        }, 'image/jpeg', 0.92)
      })
      return new File([blob], filename, { type: 'image/jpeg' })
    },
  }))

  return (
    <div
      ref={boxRef}
      className={`relative h-full w-full overflow-hidden bg-black touch-none ${className ?? ''}`}
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
  )
})
