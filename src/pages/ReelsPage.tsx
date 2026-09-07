import { Camera, ChevronLeft, MessageCircle, MoreVertical, Music2, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
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
import { cx, formatCount } from '../lib/utils'
import { postService } from '../services/postService'
import { isBoosted } from '../services/boostService'
import { reelsService } from '../services/reelsService'
import { settingsService } from '../services/settingsService'
import { userService } from '../services/userService'
import { useAuthStore } from '../store/authStore'
import type { Reel } from '../types'

export function ReelsPage() {
  const user = useAuthStore((s) => s.user)
  const { id } = useParams()
  const [rev, setRev] = useState(0)
  const [active, setActive] = useState(0)
  const [muted, setMuted] = useState(true)
  const [holding, setHolding] = useState(false)
  const navigate = useNavigate()
  const scroller = useRef<HTMLDivElement>(null)
  void rev

  const all = reelsService.list().filter((r) => !user || settingsService.visibleTo(user.id, r.userId))
  const start = id ? all.findIndex((r) => r.id === id) : 0
  const reels = start > 0 ? [...all.slice(start), ...all.slice(0, start)] : all

  useEffect(() => {
    setActive(0)
    scroller.current?.scrollTo({ top: 0 })
  }, [id])

  if (!user) return null

  return (
    <div className="relative h-dvh overflow-hidden bg-black lg:pl-0">
      <div
        className={cx(
          'safe-topbar pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent px-2 transition-opacity duration-150',
          holding && 'opacity-0',
        )}
      >
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
      <div
        ref={scroller}
        className="h-full snap-y snap-mandatory overflow-y-auto no-scrollbar"
        onScroll={(e) => {
          const el = e.currentTarget
          const next = Math.round(el.scrollTop / Math.max(el.clientHeight, 1))
          setActive((cur) => (cur === next ? cur : next))
        }}
      >
        {reels.map((reel, i) => (
          <ReelSlide
            key={reel.id}
            reel={reel}
            meId={user.id}
            muted={muted}
            active={i === active}
            near={Math.abs(i - active) <= 1}
            holding={holding && i === active}
            onHoldChange={setHolding}
            onUnmute={() => setMuted(false)}
            onChange={() => setRev((n) => n + 1)}
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
  active,
  near,
  holding,
  onHoldChange,
  onUnmute,
  onChange,
}: {
  reel: Reel
  meId: string
  muted: boolean
  active: boolean
  near: boolean
  holding: boolean
  onHoldChange: (on: boolean) => void
  onUnmute: () => void
  onChange: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const lastTap = useRef(0)
  const tapTimer = useRef(0)
  const holdTimer = useRef(0)
  const gesture = useRef<'none' | 'hold' | 'scroll'>('none')
  const origin = useRef({ x: 0, y: 0 })
  const [open, setOpen] = useState(false)
  const [likersOpen, setLikersOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [paused, setPaused] = useState(false)
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
    if (active) return
    setPaused(false)
    onHoldChange(false)
    gesture.current = 'none'
    window.clearTimeout(holdTimer.current)
    window.clearTimeout(tapTimer.current)
  }, [active, onHoldChange])

  useEffect(() => {
    const video = ref.current
    if (!video || !near) return
    video.setAttribute('playsinline', 'true')
    video.setAttribute('webkit-playsinline', 'true')
    if (active && !paused && !holding) void video.play().catch(() => undefined)
    else video.pause()
  }, [active, paused, holding, near, url])

  useEffect(() => {
    return () => {
      window.clearTimeout(holdTimer.current)
      window.clearTimeout(tapTimer.current)
    }
  }, [])

  function like() {
    if (!liked) {
      reelsService.toggleLike(reel.id, meId)
      onChange()
    }
    setBurst(true)
    window.setTimeout(() => setBurst(false), 650)
  }

  function play() {
    setPaused(false)
    onUnmute()
    void ref.current?.play().catch(() => undefined)
  }

  function pause() {
    setPaused(true)
    ref.current?.pause()
  }

  function onPointerDown(e: PointerEvent) {
    if (!active || e.button !== 0) return
    gesture.current = 'none'
    origin.current = { x: e.clientX, y: e.clientY }
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = 0
      gesture.current = 'hold'
      onHoldChange(true)
      ref.current?.pause()
    }, 140)
  }

  function onPointerMove(e: PointerEvent) {
    if (Math.hypot(e.clientX - origin.current.x, e.clientY - origin.current.y) < 12) return
    window.clearTimeout(holdTimer.current)
    holdTimer.current = 0
    if (gesture.current === 'hold') {
      onHoldChange(false)
      if (active && !paused) void ref.current?.play().catch(() => undefined)
    }
    gesture.current = 'scroll'
  }

  function onPointerUp() {
    window.clearTimeout(holdTimer.current)
    holdTimer.current = 0
    if (gesture.current === 'hold') {
      gesture.current = 'none'
      onHoldChange(false)
      if (!paused) play()
      return
    }
    if (gesture.current === 'scroll') {
      gesture.current = 'none'
      return
    }
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
      if (lastTap.current !== now) return
      if (paused) play()
      else pause()
    }, 260)
  }

  function onPointerCancel() {
    window.clearTimeout(holdTimer.current)
    holdTimer.current = 0
    if (gesture.current === 'hold') {
      onHoldChange(false)
      if (!paused) play()
    }
    gesture.current = 'none'
  }

  return (
    <section className="relative h-dvh w-full snap-start snap-always">
      {near ? (
        <video
          ref={ref}
          src={url}
          className="h-full w-full object-cover [transform:translateZ(0)]"
          loop
          playsInline
          muted={muted}
          preload={active ? 'auto' : 'metadata'}
          disablePictureInPicture
          disableRemotePlayback
          controls={false}
        />
      ) : (
        <div className="h-full w-full bg-black" />
      )}
      <div
        className="absolute inset-0 z-[5] touch-pan-y select-none"
        style={{ WebkitTouchCallout: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
      />
      {burst ? (
        <span className="pointer-events-none absolute inset-0 z-20 grid place-items-center text-[88px] leading-none anim-ig-heart">
          ❤️
        </span>
      ) : null}

      {paused && !holding ? (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
          <div className="reel-pause-in pointer-events-auto flex flex-col items-center">
            <button
              type="button"
              aria-label="Kapat"
              onClick={play}
              className="mb-5 grid h-10 w-10 place-items-center rounded-full bg-black/45"
            >
              <X className="h-6 w-6" strokeWidth={2.4} />
            </button>
            <button
              type="button"
              aria-label="Oynat"
              onClick={play}
              className="grid h-[72px] w-[72px] place-items-center"
            >
              <span className="flex gap-[7px]">
                <span className="h-9 w-[9px] rounded-[2px] bg-white shadow" />
                <span className="h-9 w-[9px] rounded-[2px] bg-white shadow" />
              </span>
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={cx(
          'pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-150',
          holding && 'opacity-0',
        )}
      />

      <div
        className={cx(
          'absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 px-3 pb-[calc(3.35rem+env(safe-area-inset-bottom))] transition-opacity duration-150 lg:pb-[max(1.1rem,env(safe-area-inset-bottom))]',
          holding && 'pointer-events-none opacity-0',
        )}
      >
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
              <span className={cx('reel-marquee', (paused || holding || muted) && '[animation-play-state:paused]')}>
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
            style={paused || holding || muted ? { animationPlayState: 'paused' } : undefined}
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
