import { Bookmark, Heart, MessageCircle, MoreHorizontal, Repeat2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from '../../lib/nav'
import { cx, formatCount, timeAgo } from '../../lib/utils'
import { postService } from '../../services/postService'
import { repostService } from '../../services/repostService'
import { settingsService } from '../../services/settingsService'
import { storyService } from '../../services/storyService'
import { userService } from '../../services/userService'
import { isBoosted } from '../../services/boostService'
import { useUiStore } from '../../store/uiStore'
import type { Post } from '../../types'
import { UserActionsSheet } from '../profile/UserActionsSheet'
import { EditPostPanel } from './EditPostPanel'
import { OwnPostSheet } from './OwnPostSheet'
import { Avatar } from '../ui/Avatar'
import { CommentSheet } from '../ui/CommentSheet'
import { MentionText } from '../ui/MentionText'
import { LikeButton } from '../ui/LikeButton'
import { QuickShareButton } from '../ui/QuickShareButton'
import { ShareSheet } from '../ui/ShareSheet'

export function FeedPost({
  post,
  meId,
  onChange,
  repostedById,
  suggested,
}: {
  post: Post
  meId: string
  onChange: () => void
  repostedById?: string
  suggested?: boolean
}) {
  const user = userService.getById(post.userId)
  const toast = useUiStore((s) => s.toast)
  const openStories = useUiStore((s) => s.openStories)
  const [pop, setPop] = useState(false)
  const [burst, setBurst] = useState(false)
  const lastTap = useRef(0)
  const popTimer = useRef(0)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const liked = post.likes.includes(meId)
  const saved = post.saves.includes(meId)
  const reposted = repostService.has(meId, 'post', post.id)
  const reposter = repostedById ? userService.getById(repostedById) : undefined
  const hasStory = user
    ? storyService.grouped().some((g) => g.userId === user.id && g.stories.length)
    : false
  const storySeen = user
    ? storyService.grouped().find((g) => g.userId === user.id)?.stories.every((s) => s.viewedBy.includes(meId))
    : true

  if (!user) return null
  const visibleComments = postService.visibleComments(post.comments, meId, post.userId)

  function pulse(ms = 350) {
    setPop(true)
    window.clearTimeout(popTimer.current)
    popTimer.current = window.setTimeout(() => {
      setPop(false)
      setBurst(false)
    }, ms)
  }

  function onPhotoTap() {
    const now = Date.now()
    if (now - lastTap.current < 320) {
      if (!liked) {
        postService.toggleLike(post.id, meId, post.userId)
        onChange()
      }
      setBurst(true)
      pulse(650)
      lastTap.current = 0
      return
    }
    lastTap.current = now
  }

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
          {post.location || post.sponsored || suggested || isBoosted(post) ? (
            <p className="truncate text-[11px] text-mute">
              {[
                isBoosted(post) ? 'Öne çıkan' : suggested ? 'Önerilen' : null,
                post.location,
                post.sponsored && !isBoosted(post) ? 'Sponsorlu' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
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
      <button
        type="button"
        className="relative block w-full select-none"
        onClick={onPhotoTap}
        onDoubleClick={(e) => e.preventDefault()}
      >
        <img src={post.image} alt={post.altText || ''} className="aspect-square w-full object-cover" draggable={false} />
        {burst ? (
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <Heart className="h-20 w-20 fill-white text-white drop-shadow-lg anim-like" />
          </span>
        ) : null}
      </button>
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center">
          <LikeButton
            liked={liked}
            pop={pop}
            onClick={() => {
              postService.toggleLike(post.id, meId, post.userId)
              if (!liked) pulse()
              onChange()
            }}
          />
          <button
            className="grid h-11 w-11 place-items-center"
            onClick={() => {
              if (post.commentsOff && meId !== post.userId) {
                toast('Yorumlar kapalı', 'err')
                return
              }
              const gate = settingsService.canComment(meId, post.userId)
              if (meId !== post.userId && !gate.ok) {
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
            payload={{
              text: `Sana bir gönderi gönderdi (@${user.username})`,
              image: post.image,
              share: { kind: 'post', username: user.username, caption: post.caption },
            }}
          />
          {post.userId !== meId ? (
            <button
              type="button"
              className="grid h-11 w-11 place-items-center"
              aria-label="Tekrar paylaş"
              onClick={() => {
                const on = repostService.toggle(meId, 'post', post.id, post.userId)
                toast(on ? 'Tekrar paylaşıldı' : 'Tekrar paylaşım kaldırıldı')
                onChange()
              }}
            >
              <Repeat2 className={cx('h-6 w-6', reposted && 'text-hot')} />
            </button>
          ) : null}
        </div>
        <button
          className="grid h-11 w-11 place-items-center"
          onClick={() => {
            postService.toggleSave(post.id, meId)
            toast(saved ? 'Kayıtlardan çıkarıldı' : 'Kaydedildi')
            onChange()
          }}
        >
          <Bookmark className={cx('h-6 w-6', saved && 'fill-white')} />
        </button>
      </div>
      <div className="px-3">
        <p className="text-[14px] font-semibold">
          {(post.hideLikes || settingsService.get(post.userId).hideLikes) && meId !== post.userId
            ? 'Beğeniler gizli'
            : `${formatCount(post.likes.length)} beğeni`}
        </p>
        {post.caption ? (
          <p className="mt-1 text-[14px] leading-snug">
            <Link to={`/u/${user.username}`} className="font-semibold">
              {user.username}
            </Link>{' '}
            <MentionText text={post.caption} />
          </p>
        ) : null}
        {post.commentsOff && meId !== post.userId ? (
          <p className="mt-1 text-[14px] text-mute">Yorumlar kapalı</p>
        ) : visibleComments.length > 0 ? (
          <button className="mt-1 text-[14px] text-mute" onClick={() => setCommentsOpen(true)}>
            {visibleComments.length} yorumun tümünü gör
          </button>
        ) : null}
        <p className="mt-1 text-[11px] uppercase tracking-wide text-mute">{timeAgo(post.createdAt)}</p>
      </div>
      <CommentSheet
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        comments={visibleComments}
        ownerId={post.userId}
        mentionHref={`/p/${post.id}`}
        mentionImage={post.image}
        commentsOff={post.commentsOff}
        onSend={(text) => {
          postService.comment(post.id, meId, text, post.userId)
          onChange()
        }}
        onApprove={(commentId) => {
          postService.approveComment(post.id, commentId, meId)
          onChange()
        }}
      />
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        payload={{
          text: `Sana bir gönderi gönderdi (@${user.username})`,
          image: post.image,
          share: { kind: 'post', username: user.username, caption: post.caption },
        }}
      />
      {post.userId === meId ? (
        <>
          <OwnPostSheet
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            post={post}
            meId={meId}
            onChange={onChange}
            onEdit={() => setEditOpen(true)}
          />
          <EditPostPanel
            open={editOpen}
            post={post}
            meId={meId}
            onClose={() => setEditOpen(false)}
            onChange={onChange}
          />
        </>
      ) : (
        <UserActionsSheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          meId={meId}
          target={user}
          onChange={onChange}
        />
      )}
    </article>
  )
}
