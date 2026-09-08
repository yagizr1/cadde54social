import { Bookmark, Clapperboard, Heart, MessageCircle, MoreHorizontal, Music2, Repeat2, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from '../../lib/nav'
import { cx, formatCount, timeAgo } from '../../lib/utils'
import { isBoosted } from '../../services/boostService'
import { postService } from '../../services/postService'
import { reelsService } from '../../services/reelsService'
import { repostService } from '../../services/repostService'
import { settingsService } from '../../services/settingsService'
import { storyService } from '../../services/storyService'
import { userService } from '../../services/userService'
import { useUiStore } from '../../store/uiStore'
import type { Reel } from '../../types'
import { Avatar } from '../ui/Avatar'
import { CommentSheet } from '../ui/CommentSheet'
import { LikersSheet } from '../ui/LikersSheet'
import { MentionText } from '../ui/MentionText'
import { LikeButton } from '../ui/LikeButton'
import { QuickShareButton } from '../ui/QuickShareButton'
import { ShareSheet } from '../ui/ShareSheet'
import { ReelMenuSheet } from './ReelMenuSheet'

export function FeedReel({
  reel,
  meId,
  onChange,
  repostedById,
  suggested,
}: {
  reel: Reel
  meId: string
  onChange: () => void
  repostedById?: string
  suggested?: boolean
}) {
  const user = userService.getById(reel.userId)
  const toast = useUiStore((s) => s.toast)
  const openStories = useUiStore((s) => s.openStories)
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastTap = useRef(0)
  const tapTimer = useRef(0)
  const popTimer = useRef(0)
  const [url, setUrl] = useState(reel.videoUrl)
  const [inView, setInView] = useState(false)
  const [muted, setMuted] = useState(true)
  const [paused, setPaused] = useState(false)
  const [pop, setPop] = useState(false)
  const [burst, setBurst] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [likersOpen, setLikersOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const liked = reel.likes.includes(meId)
  const saved = reel.saves.includes(meId)
  const reposted = repostService.has(meId, 'reel', reel.id)
  const reposter = repostedById ? userService.getById(repostedById) : undefined
  const hasStory = user
    ? storyService.grouped().some((g) => g.userId === user.id && g.stories.length)
    : false
  const storySeen = user
    ? storyService.grouped().find((g) => g.userId === user.id)?.stories.every((s) => s.viewedBy.includes(meId))
    : true
  const visibleComments = postService.visibleComments(reel.comments, meId, reel.userId)
  const likesHidden = settingsService.get(reel.userId).hideLikes && meId !== reel.userId
  const sharePayload = {
    text: `Sana bir Reels gönderdi (@${user?.username ?? 'cadde54'})`,
    video: url,
    share: { kind: 'reel' as const, username: user?.username, caption: reel.caption },
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
    const video = videoRef.current
    if (!video) return
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.55),
      { threshold: [0, 0.55, 1] },
    )
    io.observe(video)
    return () => io.disconnect()
  }, [url])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.setAttribute('playsinline', 'true')
    video.setAttribute('webkit-playsinline', 'true')
    if (inView && !paused) void video.play().catch(() => undefined)
    else video.pause()
  }, [inView, paused, url])

  useEffect(() => {
    return () => {
      window.clearTimeout(tapTimer.current)
      window.clearTimeout(popTimer.current)
    }
  }, [])

  function pulse(ms = 350) {
    setPop(true)
    window.clearTimeout(popTimer.current)
    popTimer.current = window.setTimeout(() => {
      setPop(false)
      setBurst(false)
    }, ms)
  }

  function onVideoTap() {
    const now = Date.now()
    if (now - lastTap.current < 280) {
      window.clearTimeout(tapTimer.current)
      lastTap.current = 0
      if (!liked) {
        reelsService.toggleLike(reel.id, meId)
        onChange()
      }
      setBurst(true)
      pulse(650)
      return
    }
    lastTap.current = now
    window.clearTimeout(tapTimer.current)
    tapTimer.current = window.setTimeout(() => {
      if (lastTap.current !== now) return
      setPaused((on) => !on)
    }, 260)
  }

  if (!user) return null

  return (
    <article className="pb-3">
      {reposter ? (
        <Link
          to={`/u/${reposter.username}`}
          className="flex items-center gap-1.5 px-3 pt-2 text-[12px] font-semibold text-mute"
        >
          <Repeat2 className="h-3.5 w-3.5" />
          {reposter.id === meId ? 'Tekrar paylaştın' : `${reposter.username} tekrar paylaştı`}
        </Link>
      ) : null}
      <div className="flex items-center gap-2.5 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            if (!hasStory) return
            const ids = storyService.grouped().map((g) => g.userId)
            const i = ids.indexOf(user.id)
            if (i >= 0) openStories(ids, i)
          }}
        >
          <Avatar
            src={user.avatar}
            name={user.name}
            size={32}
            ring={hasStory ? (storySeen ? 'story-seen' : 'story') : 'none'}
          />
        </button>
        <div className="min-w-0 flex-1">
          <Link to={`/u/${user.username}`} className="block truncate text-[13px] font-semibold">
            {user.username}
          </Link>
          <p className="truncate text-[11px] text-mute">
            {[isBoosted(reel) ? 'Öne çıkan' : suggested ? 'Önerilen' : null, 'Reels'].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="grid h-9 w-9 place-items-center"
          aria-label="Daha fazla"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
      <div className="relative w-full select-none bg-ink">
        <video
          ref={videoRef}
          src={url}
          poster={reel.poster}
          className="aspect-[4/5] w-full object-cover"
          loop
          playsInline
          muted={muted}
          preload="metadata"
          disablePictureInPicture
          disableRemotePlayback
          controls={false}
        />
        <button
          type="button"
          aria-label={paused ? 'Oynat' : 'Duraklat'}
          className="absolute inset-0 z-[1]"
          onClick={onVideoTap}
          onDoubleClick={(e) => e.preventDefault()}
        />
        {paused ? (
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="flex gap-[6px]">
              <span className="h-8 w-[8px] rounded-[2px] bg-white/90 shadow" />
              <span className="h-8 w-[8px] rounded-[2px] bg-white/90 shadow" />
            </span>
          </span>
        ) : null}
        {burst ? (
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <Heart className="h-20 w-20 fill-white text-white drop-shadow-lg anim-like" />
          </span>
        ) : null}
        <Link
          to={`/reels/${reel.id}`}
          className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-semibold"
        >
          <Clapperboard className="h-3.5 w-3.5" />
          Reels
        </Link>
        <button
          type="button"
          aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
          className="absolute bottom-3 right-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/55"
          onClick={() => setMuted((on) => !on)}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex h-11 items-center justify-between px-1 pt-1">
        <div className="flex h-11 items-center">
          <LikeButton
            liked={liked}
            pop={pop}
            className="h-11 w-11"
            onClick={() => {
              reelsService.toggleLike(reel.id, meId)
              if (!liked) pulse()
              onChange()
            }}
          />
          <button
            type="button"
            className="grid h-11 w-11 place-items-center"
            onClick={() => {
              const gate = settingsService.canComment(meId, reel.userId)
              if (meId !== reel.userId && !gate.ok) {
                toast(gate.reason ?? 'Yorum yapılamaz', 'err')
                return
              }
              setCommentsOpen(true)
            }}
          >
            <MessageCircle className="h-6 w-6" />
          </button>
          <QuickShareButton
            meId={meId}
            onOpenSheet={() => setShareOpen(true)}
            className="grid h-11 w-11 place-items-center"
            iconClassName="h-6 w-6"
            payload={sharePayload}
          />
          {reel.userId !== meId ? (
            <button
              type="button"
              className="grid h-11 w-11 place-items-center"
              aria-label="Tekrar paylaş"
              onClick={() => {
                const on = repostService.toggle(meId, 'reel', reel.id, reel.userId)
                toast(on ? 'Tekrar paylaşıldı' : 'Tekrar paylaşım kaldırıldı')
                onChange()
              }}
            >
              <Repeat2 className={cx('h-6 w-6', reposted && 'text-hot')} />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center"
          onClick={() => {
            reelsService.toggleSave(reel.id, meId)
            toast(saved ? 'Kayıtlardan çıkarıldı' : 'Kaydedildi')
            onChange()
          }}
        >
          <Bookmark className={cx('h-6 w-6', saved && 'fill-white')} />
        </button>
      </div>
      <div className="px-3">
        {likesHidden ? (
          <p className="block text-[14px] font-semibold">Beğeniler gizli</p>
        ) : (
          <button type="button" className="block text-[14px] font-semibold" onClick={() => setLikersOpen(true)}>
            {formatCount(reel.likes.length)} beğeni
          </button>
        )}
        {reel.caption ? (
          <p className="mt-1 text-[14px] leading-snug">
            <Link to={`/u/${user.username}`} className="font-semibold">
              {user.username}
            </Link>{' '}
            <MentionText text={reel.caption} />
          </p>
        ) : null}
        {reel.music ? (
          <p className="mt-1 flex items-center gap-1 text-[13px] text-mute">
            <Music2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{reel.music}</span>
          </p>
        ) : null}
        {visibleComments.length > 0 ? (
          <button type="button" className="mt-1 block text-left text-[14px] text-mute" onClick={() => setCommentsOpen(true)}>
            {visibleComments.length} yorumun tümünü gör
          </button>
        ) : null}
        <p className="mt-1 text-[11px] uppercase tracking-wide text-mute">{timeAgo(reel.createdAt)}</p>
      </div>
      <CommentSheet
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
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
      <ReelMenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} reel={reel} meId={meId} author={user} onChange={onChange} />
    </article>
  )
}
