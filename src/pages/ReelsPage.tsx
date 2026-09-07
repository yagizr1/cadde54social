import { Camera, ChevronLeft, MessageCircle, MoreVertical, Music2, Plus, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link, useNavigate } from '../lib/nav'
import { CommentSheet } from '../components/ui/CommentSheet'
import { LikersSheet } from '../components/ui/LikersSheet'
import { MentionText } from '../components/ui/MentionText'
import { LikeButton } from '../components/ui/LikeButton'
import { QuickShareButton } from '../components/ui/QuickShareButton'
import { ShareSheet } from '../components/ui/ShareSheet'
import { Avatar } from '../components/ui/Avatar'
import { ReelMenuSheet } from '../components/feed/ReelMenuSheet'
import { goBack } from '../components/layout/BackButton'
import { startCreate } from '../lib/createPicker'
import { useApp } from '../hooks/useApp'
import { formatCount } from '../lib/utils'
import { postService } from '../services/postService'
import { isBoosted } from '../services/boostService'
import { reelsService } from '../services/reelsService'
import { settingsService } from '../services/settingsService'
import { userService } from '../services/userService'
import type { Reel } from '../types'

export function ReelsPage() {
  const { user, refresh } = useApp()
  const { id } = useParams()
  const all = reelsService.list().filter((r) => !user || settingsService.visibleTo(user.id, r.userId))
  const start = id ? all.findIndex((r) => r.id === id) : 0
  const reels = start > 0 ? [...all.slice(start), ...all.slice(0, start)] : all
  const [muted, setMuted] = useState(true)
  const [muteFlash, setMuteFlash] = useState(false)
  const [flashMuted, setFlashMuted] = useState(true)
  const navigate = useNavigate()
  const scroller = useRef<HTMLDivElement>(null)
  const flashTimer = useRef(0)

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [id])

  function toggleMute() {
    const next = !muted
    setMuted(next)
    setFlashMuted(next)
    setMuteFlash(true)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setMuteFlash(false), 700)
  }

  if (!user) return null

  return (
    <div className="relative h-dvh bg-black lg:pl-0">
      <div className="safe-topbar pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent px-2">
        <div className="pointer-events-auto flex items-center">
          <button
            type="button"
            onClick={() => goBack(navigate)}
            className="grid h-10 w-10 place-items-center"
            aria-label="Geri"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <p className="text-[22px] font-bold">Reels</p>
        </div>
        <button
          type="button"
          onClick={() => startCreate(navigate, 'reel')}
          className="pointer-events-auto grid h-10 w-10 place-items-center"
          aria-label="Reels çek"
        >
          <Camera className="h-6 w-6" />
        </button>
      </div>
      {muteFlash ? (
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-30 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45">
          {flashMuted ? <VolumeX className="h-8 w-8" /> : <Volume2 className="h-8 w-8" />}
        </div>
      ) : null}
      <div ref={scroller} className="h-full snap-y snap-mandatory overflow-y-auto no-scrollbar">
        {reels.map((reel) => (
          <ReelSlide
            key={reel.id}
            reel={reel}
            meId={user.id}
            muted={muted}
            onMute={toggleMute}
            onChange={refresh}
          />
        ))}
      </div>
    </div>
  )
}

function ReelSlide({
  reel,
  meId,
  muted,
  onMute,
  onChange,
}: {
  reel: Reel
  meId: string
  muted: boolean
  onMute: () => void
  onChange: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const wrap = useRef<HTMLElement>(null)
  const lastTap = useRef(0)
  const tapTimer = useRef(0)
  const [open, setOpen] = useState(false)
  const [likersOpen, setLikersOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [url, setUrl] = useState(reel.videoUrl)
  const [burst, setBurst] = useState(false)
  const author = userService.getById(reel.userId)
  const me = userService.getById(meId)
  const liked = reel.likes.includes(meId)
  const visibleComments = postService.visibleComments(reel.comments, meId, reel.userId)
  const likesHidden = settingsService.get(reel.userId).hideLikes && meId !== reel.userId
  const boosted = isBoosted(reel)
  const following = Boolean(author && me?.following.includes(author.id))
  const own = reel.userId === meId
  const sharePayload = {
    text: `Sana bir Reels gönderdi (@${author?.username ?? 'cadde54'})`,
    video: url,
    share: { kind: 'reel' as const, username: author?.username, caption: reel.caption },
  }

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

  function like() {
    if (!liked) {
      reelsService.toggleLike(reel.id, meId)
      onChange()
    }
    setBurst(true)
    window.setTimeout(() => setBurst(false), 650)
  }

  function onVideoClick() {
    const now = Date.now()
    if (now - lastTap.current < 280) {
      window.clearTimeout(tapTimer.current)
      lastTap.current = 0
      like()
      return
    }
    lastTap.current = now
    window.clearTimeout(tapTimer.current)
    tapTimer.current = window.setTimeout(() => {
      if (lastTap.current === now) onMute()
    }, 280)
  }

  return (
    <section ref={wrap} className="relative h-dvh w-full snap-start">
      <video
        ref={ref}
        src={url}
        className="h-full w-full object-cover"
        loop
        playsInline
        muted={muted}
        onClick={onVideoClick}
      />
      {burst ? (
        <span className="pointer-events-none absolute inset-0 z-20 grid place-items-center text-[88px] leading-none anim-ig-heart">
          ❤️
        </span>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 px-3 pb-[calc(3.35rem+env(safe-area-inset-bottom))] lg:pb-[max(1.1rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1 pb-1 pr-1">
          <div className="flex items-center gap-2">
            <Link to={`/u/${author?.username}`} className="flex min-w-0 items-center gap-2">
              <span className="text-[15px] font-semibold drop-shadow">{author?.username}</span>
            </Link>
            {boosted ? <span className="text-[12px] font-semibold text-hot">Öne çıkan</span> : null}
            {!own && author && !following ? (
              <button
                type="button"
                onClick={() => {
                  userService.follow(meId, author.id)
                  onChange()
                }}
                className="rounded-md border border-white/80 px-2 py-0.5 text-[13px] font-semibold"
              >
                Takip et
              </button>
            ) : null}
          </div>
          {reel.caption ? (
            <p className="mt-2 line-clamp-2 max-w-[78%] text-[14px] leading-snug text-white drop-shadow">
              <MentionText text={reel.caption} />
            </p>
          ) : null}
          <div className="mt-2 flex max-w-[72%] items-center gap-1.5 overflow-hidden text-[13px] text-white/90">
            <Music2 className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 overflow-hidden whitespace-nowrap">
              <span className="reel-marquee">
                {reel.music} · {author?.username ?? ''} · {reel.music} · {author?.username ?? ''} ·
              </span>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-[18px] pb-1">
          {author ? (
            <div className="relative">
              <Link to={`/u/${author.username}`} className="block rounded-full ring-2 ring-white">
                <Avatar src={author.avatar} name={author.name} size={40} peek={false} />
              </Link>
              {!own && !following ? (
                <button
                  type="button"
                  aria-label="Takip et"
                  onClick={() => {
                    userService.follow(meId, author.id)
                    onChange()
                  }}
                  className="absolute -bottom-1.5 left-1/2 grid h-[18px] w-[18px] -translate-x-1/2 place-items-center rounded-full bg-[#ff3040] text-white"
                >
                  <Plus className="h-2.5 w-2.5" strokeWidth={3} />
                </button>
              ) : null}
            </div>
          ) : null}

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
            {likesHidden ? null : (
              <button type="button" className="mt-0.5 text-[12px] font-semibold drop-shadow" onClick={() => setLikersOpen(true)}>
                {formatCount(reel.likes.length)}
              </button>
            )}
          </div>

          <button type="button" onClick={() => setOpen(true)} className="text-center" aria-label="Yorumlar">
            <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
            <p className="mt-0.5 text-[12px] font-semibold drop-shadow">{formatCount(visibleComments.length)}</p>
          </button>

          <QuickShareButton
            meId={meId}
            placement="left"
            onOpenSheet={() => setShareOpen(true)}
            className="grid h-11 w-11 place-items-center"
            iconClassName="h-7 w-7"
            payload={sharePayload}
          />

          <button type="button" aria-label="Daha fazla" onClick={() => setMenuOpen(true)} className="grid h-11 w-11 place-items-center">
            <MoreVertical className="h-6 w-6" strokeWidth={2} />
          </button>

          <div
            className="reel-disc grid h-10 w-10 place-items-center overflow-hidden rounded-full border-2 border-white/90 bg-black"
            style={muted ? { animationPlayState: 'paused' } : undefined}
          >
            {author?.avatar ? (
              <img src={author.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold">{author?.name?.slice(0, 1) ?? '♪'}</span>
            )}
          </div>
        </div>
      </div>

      <ReelMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        reel={reel}
        meId={meId}
        author={author}
        onChange={onChange}
      />
      <CommentSheet
        open={open}
        onClose={() => setOpen(false)}
        comments={visibleComments}
        ownerId={reel.userId}
        mentionHref={`/reels/${reel.id}`}
        onSend={(text, parentId) => {
          reelsService.comment(reel.id, meId, text, parentId)
          onChange()
        }}
        onLike={(commentId) => {
          reelsService.toggleCommentLike(reel.id, commentId, meId)
          onChange()
        }}
        onApprove={(commentId) => {
          reelsService.approveComment(reel.id, commentId, meId)
          onChange()
        }}
      />
      <LikersSheet open={likersOpen} onClose={() => setLikersOpen(false)} userIds={reel.likes} />
      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} payload={sharePayload} />
    </section>
  )
}
