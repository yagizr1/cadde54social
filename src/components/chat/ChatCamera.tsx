import { Image as ImageIcon, Repeat2, Send, SwitchCamera, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../../lib/utils'

export function ChatCamera({
  onCapture,
  onClose,
  onFallback,
}: {
  onCapture: (file: File, opts: { viewOnce: boolean; caption: string }) => void
  onClose: () => void
  onFallback: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const onCloseRef = useRef(onClose)
  const onFallbackRef = useRef(onFallback)
  onCloseRef.current = onClose
  onFallbackRef.current = onFallback
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [ready, setReady] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [shot, setShot] = useState<File | null>(null)
  const [viewOnce, setViewOnce] = useState(true)
  const [caption, setCaption] = useState('')

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
          video.setAttribute('playsinline', 'true')
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

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  function setFile(file: File) {
    if (preview) URL.revokeObjectURL(preview)
    stopStream()
    setShot(file)
    setPreview(URL.createObjectURL(file))
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
    if (facing === 'user') {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, w, h)
    const file = await new Promise<File | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : null),
        'image/jpeg',
        0.92,
      )
    })
    if (!file) return
    setFile(file)
  }

  function retake() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setShot(null)
    setCaption('')
  }

  function send() {
    if (!shot) return
    const file = shot
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    onCapture(file, { viewOnce, caption: caption.trim() })
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

      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <button
          type="button"
          onClick={() => {
            if (preview) URL.revokeObjectURL(preview)
            onClose()
          }}
          className="grid h-11 w-11 place-items-center"
          aria-label="Kapat"
        >
          <X className="h-7 w-7" strokeWidth={1.75} />
        </button>
      </div>

      {preview ? (
        <div className="absolute inset-x-0 bottom-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewOnce(true)}
              className={cx(
                'grid h-11 w-11 place-items-center rounded-full border-2 text-[15px] font-bold',
                viewOnce ? 'border-white bg-white text-black' : 'border-white/70 text-white',
              )}
              aria-label="Tek görüntüleme"
            >
              1
            </button>
            <button
              type="button"
              onClick={() => setViewOnce(false)}
              className={cx(
                'grid h-11 w-11 place-items-center rounded-full border-2',
                !viewOnce ? 'border-white bg-white text-black' : 'border-white/70 text-white',
              )}
              aria-label="Tekrar izlenebilir"
            >
              <Repeat2 className="h-5 w-5" />
            </button>
            <p className="text-[13px] font-semibold text-white/90">
              {viewOnce ? 'Tek görüntüleme' : 'Tekrar izle'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={retake}
              className="shrink-0 rounded-full bg-white/15 px-4 py-2.5 text-[13px] font-semibold"
            >
              Yeniden
            </button>
            <div className="flex h-12 min-w-0 flex-1 items-center rounded-full bg-black/45 px-4 ring-1 ring-white/20">
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Mesaj ekle..."
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-white/55"
              />
            </div>
            <button
              type="button"
              onClick={send}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0095f6]"
              aria-label="Gönder"
            >
              <Send className="h-5 w-5 fill-white text-white" />
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center px-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="absolute bottom-6 left-8 grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-white/35 bg-white/10"
            aria-label="Galeri"
          >
            <ImageIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => void snap()}
            className="grid h-[78px] w-[78px] place-items-center rounded-full border-[4px] border-white p-[5px] disabled:opacity-40"
            aria-label="Çek"
          >
            <span className="h-full w-full rounded-full bg-white" />
          </button>
          <button
            type="button"
            onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            className="absolute bottom-6 right-8 grid h-12 w-12 place-items-center rounded-full bg-black/35"
            aria-label="Kamerayı çevir"
          >
            <SwitchCamera className="h-6 w-6" />
          </button>
        </div>
      )}

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) setFile(file)
        }}
      />
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
