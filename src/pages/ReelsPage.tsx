import { Bookmark, MessageCircle, Repeat2, Volume2, VolumeX, ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link, useNavigate } from '../lib/nav'
import { CommentSheet } from '../components/ui/CommentSheet'
import { MentionText } from '../components/ui/MentionText'
import { LikeButton } from '../components/ui/LikeButton'
import { QuickShareButton } from '../components/ui/QuickShareButton'
import { ShareSheet } from '../components/ui/ShareSheet'
import { goBack } from '../components/layout/BackButton'
import { useApp } from '../hooks/useApp'
import { cx, formatCount } from '../lib/utils'
import { postService } from '../services/postService'
import { reelsService } from '../services/reelsService'
import { repostService } from '../services/repostService'
import { settingsService } from '../services/settingsService'
import { userService } from '../services/userService'
import { useUiStore } from '../store/uiStore'
import type { Reel } from '../types'

export function ReelsPage() {
  const { user, refresh } = useApp()
  const { id } = useParams()
  const all = reelsService.list().filter((r) => !user || settingsService.visibleTo(user.id, r.userId))
  const start = id ? all.findIndex((r) => r.id === id) : 0
  const reels = start > 0 ? [...all.slice(start), ...all.slice(0, start)] : all
  const [muted, setMuted] = useState(true)
  const navigate = useNavigate()
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [id])

  if (!user) return null

  return (
    <div className="relative h-dvh bg-black lg:pl-0">
      <div className="absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-2 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => goBack(navigate)}
            className="grid h-10 w-10 place-items-center"
            aria-label="Geri"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <p className="text-[18px] font-bold">Reels</p>
        </div>
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="grid h-10 w-10 place-items-center rounded-full bg-black/40"
          aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
        >
          {muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </button>
      </div>
      <div ref={scroller} className="h-full snap-y snap-mandatory overflow-y-auto no-scrollbar">
        {reels.map((reel) => (
          <ReelSlide key={reel.id} reel={reel} meId={user.id} muted={muted} onChange={refresh} />
        ))}
      </div>
    </div>
  )
}

function ReelSlide({
  reel,
  meId,
  muted,
  onChange,
}: {
  reel: Reel
  meId: string
  muted: boolean
  onChange: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const wrap = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [url, setUrl] = useState(reel.videoUrl)
  const toast = useUiStore((s) => s.toast)
  const author = userService.getById(reel.userId)
  const liked = reel.likes.includes(meId)
  const saved = reel.saves.includes(meId)
  const reposted = repostService.has(meId, 'reel', reel.id)
  const visibleComments = postService.visibleComments(reel.comments, meId, reel.userId)

  useEffect(() => {
    let alive = true
    void reelsService.resolveUrl(reel).then((next) => {
      if (alive) setUrl(next)
    })
    return () => {
      alive = false
    }
  }, [reel])

  useEffect(() => {
    const video = ref.current
    const node = wrap.current
    if (!video || !node) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => undefined)
        else video.pause()
      },
      { threshold: 0.7 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [url])

  return (
    <section ref={wrap} className="relative h-dvh w-full snap-start">
      <video
        ref={ref}
        src={url}
        className="h-full w-full object-cover"
        loop
        playsInline
        muted={muted}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-24 lg:pb-8">
        <Link to={`/u/${author?.username}`} className="flex items-center gap-2">
          <img src={author?.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
          <span className="text-[14px] font-semibold">{author?.username}</span>
        </Link>
        <p className="mt-2 max-w-[78%] text-[14px] text-white/90">
          <MentionText text={reel.caption} />
        </p>
        <p className="mt-2 text-[13px] text-white/70">♪ {reel.music}</p>
      </div>
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-4">
        <div className="text-center">
          <LikeButton
            liked={liked}
            size="lg"
            className="mx-auto"
            onClick={() => {
              reelsService.toggleLike(reel.id, meId)
              onChange()
            }}
          />
          <p className="mt-1 text-xs">{formatCount(reel.likes.length)}</p>
        </div>
        <button onClick={() => setOpen(true)} className="text-center">
          <MessageCircle className="h-8 w-8" />
          <p className="text-xs">{visibleComments.length}</p>
        </button>
        {reel.userId !== meId ? (
          <button
            type="button"
            aria-label="Tekrar paylaş"
            onClick={() => {
              const on = repostService.toggle(meId, 'reel', reel.id, reel.userId)
              toast(on ? 'Tekrar paylaşıldı' : 'Tekrar paylaşım kaldırıldı')
              onChange()
            }}
          >
            <Repeat2 className={cx('h-8 w-8', reposted && 'text-hot')} />
          </button>
        ) : null}
        <QuickShareButton
          meId={meId}
          placement="left"
          onOpenSheet={() => setShareOpen(true)}
          iconClassName="h-8 w-8"
          payload={{
            text: `Sana bir Reels gönderdi (@${author?.username ?? 'cadde54'})`,
            video: url,
            share: { kind: 'reel', username: author?.username, caption: reel.caption },
          }}
        />
        <button
          onClick={() => {
            reelsService.toggleSave(reel.id, meId)
            toast(saved ? 'Kayıtlardan çıkarıldı' : 'Reels kaydedildi')
            onChange()
          }}
        >
          <Bookmark className={cx('h-8 w-8', saved && 'fill-white')} />
        </button>
      </div>
      <CommentSheet
        open={open}
        onClose={() => setOpen(false)}
        comments={visibleComments}
        ownerId={reel.userId}
        mentionHref={`/reels/${reel.id}`}
        onSend={(text) => {
          reelsService.comment(reel.id, meId, text)
          onChange()
        }}
        onApprove={(commentId) => {
          reelsService.approveComment(reel.id, commentId, meId)
          onChange()
        }}
      />
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        payload={{
          text: `Sana bir Reels gönderdi (@${author?.username ?? 'cadde54'})`,
          video: url,
          share: { kind: 'reel', username: author?.username, caption: reel.caption },
        }}
      />
    </section>
  )
}
