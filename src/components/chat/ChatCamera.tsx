import { RefreshCw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../../lib/utils'

export function ChatCamera({
  onCapture,
  onClose,
  onFallback,
}: {
  onCapture: (file: File) => void
  onClose: () => void
  onFallback: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const onCloseRef = useRef(onClose)
  const onFallbackRef = useRef(onFallback)
  onCloseRef.current = onClose
  onFallbackRef.current = onFallback
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [ready, setReady] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [shot, setShot] = useState<File | null>(null)

  useEffect(() => {
    if (preview) return
    let cancelled = false

    async function start() {
      stopStream()
      setReady(false)
      try {
        const stream = await openStream(facing)
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play()
        }
        setReady(true)
      } catch {
        if (!cancelled) {
          onFallbackRef.current()
          onCloseRef.current()
        }
      }
    }

    void start()
    return () => {
      cancelled = true
      stopStream()
    }
  }, [facing, preview])

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  async function snap() {
    const video = videoRef.current
    if (!video || !ready) return
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)
    const file = await new Promise<File | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : null),
        'image/jpeg',
        0.9,
      )
    })
    if (!file) return
    stopStream()
    setShot(file)
    setPreview(URL.createObjectURL(file))
  }

  function retake() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setShot(null)
  }

  function send() {
    if (!shot) return
    if (preview) URL.revokeObjectURL(preview)
    onCapture(shot)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] bg-black">
      {preview ? (
        <img src={preview} alt="" className="h-full w-full object-cover" />
      ) : (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cx('h-full w-full object-cover', facing === 'user' && '-scale-x-100')}
        />
      )}

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => {
            if (preview) URL.revokeObjectURL(preview)
            onClose()
          }}
          className="grid h-11 w-11 place-items-center rounded-full bg-black/40"
          aria-label="Kapat"
        >
          <X className="h-6 w-6" />
        </button>
        {preview ? null : (
          <button
            type="button"
            onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            className="grid h-11 w-11 place-items-center rounded-full bg-black/40"
            aria-label="Kamerayı çevir"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-6 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {preview ? (
          <>
            <button
              type="button"
              onClick={retake}
              className="rounded-full bg-white/15 px-5 py-3 text-sm font-semibold"
            >
              Yeniden çek
            </button>
            <button
              type="button"
              onClick={send}
              className="rounded-full bg-hot px-6 py-3 text-sm font-semibold text-ink"
            >
              Gönder
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!ready}
            onClick={() => void snap()}
            className="grid h-[72px] w-[72px] place-items-center rounded-full border-4 border-white disabled:opacity-40"
            aria-label="Çek"
          >
            <span className="h-14 w-14 rounded-full bg-white" />
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}

async function openStream(facing: 'environment' | 'user') {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 1280 } },
    })
  } catch {
    return navigator.mediaDevices.getUserMedia({ audio: false, video: true })
  }
}
