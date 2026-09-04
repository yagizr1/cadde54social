import { Heart, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from '../../lib/nav'
import { cx, formatCount, timeAgo } from '../../lib/utils'
import { mentionService } from '../../services/mentionService'
import { userService } from '../../services/userService'
import { useAuthStore } from '../../store/authStore'
import type { Comment } from '../../types'
import { Avatar } from './Avatar'
import { MentionField } from './MentionField'
import { MentionText } from './MentionText'
import { Sheet } from './Sheet'

export function CommentSheet({
  open,
  onClose,
  comments,
  onSend,
  onLike,
  mentionHref,
  mentionImage,
  ownerId,
  onApprove,
  commentsOff,
}: {
  open: boolean
  onClose: () => void
  comments: Comment[]
  onSend: (text: string, parentId?: string) => void
  onLike?: (commentId: string) => void
  mentionHref?: string
  mentionImage?: string
  ownerId?: string
  onApprove?: (commentId: string) => void
  commentsOff?: boolean
}) {
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({})
  const me = useAuthStore((s) => s.user)

  useEffect(() => {
    if (open) return
    setText('')
    setReplyTo(null)
  }, [open])

  const roots = useMemo(() => comments.filter((c) => !c.parentId), [comments])
  const repliesByParent = useMemo(() => {
    const map = new Map<string, Comment[]>()
    for (const c of comments) {
      if (!c.parentId) continue
      const list = map.get(c.parentId) ?? []
      list.push(c)
      map.set(c.parentId, list)
    }
    return map
  }, [comments])

  function startReply(comment: Comment) {
    const u = userService.getById(comment.userId)
    setReplyTo(comment)
    setText(u?.username ? `@${u.username} ` : '')
  }

  function clearReply() {
    setReplyTo(null)
    setText('')
  }

  return (
    <Sheet open={open} onClose={onClose} title="Yorumlar">
      <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
        {roots.length === 0 ? (
          <p className="py-10 text-center text-sm text-mute">Henüz yorum yok.</p>
        ) : (
          roots.map((c) => {
            const replies = repliesByParent.get(c.id) ?? []
            const shown = openReplies[c.id] || replies.length <= 2 ? replies : []
            return (
              <div key={c.id}>
                <CommentRow
                  comment={c}
                  meId={me?.id}
                  ownerId={ownerId}
                  onApprove={onApprove}
                  onLike={onLike}
                  onReply={() => startReply(c)}
                />
                {replies.length > 2 && !openReplies[c.id] ? (
                  <button
                    type="button"
                    className="mt-2 ml-11 text-[12px] font-semibold text-mute"
                    onClick={() => setOpenReplies((cur) => ({ ...cur, [c.id]: true }))}
                  >
                    ── {replies.length} yanıtı gör
                  </button>
                ) : null}
                {shown.length ? (
                  <div className="mt-3 ml-11 space-y-3">
                    {shown.map((reply) => (
                      <CommentRow
                        key={reply.id}
                        comment={reply}
                        meId={me?.id}
                        ownerId={ownerId}
                        onApprove={onApprove}
                        onLike={onLike}
                        onReply={() => startReply(reply)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </div>
      {commentsOff && me?.id !== ownerId ? (
        <p className="mt-3 border-t border-white/10 pt-3 text-center text-[13px] text-mute">Yorumlar kapalı</p>
      ) : (
        <form
          className="mt-3 border-t border-white/10 pt-3"
          onSubmit={(e) => {
            e.preventDefault()
            const next = text.trim()
            if (!next || !me) return
            onSend(next, replyTo?.id)
            mentionService.notify(me.id, next, {
              label: 'bir yorumda senden bahsetti',
              href: mentionHref,
              image: mentionImage,
            })
            clearReply()
          }}
        >
          {replyTo ? (
            <div className="mb-2 flex items-center gap-2 text-[12px] text-mute">
              <span className="min-w-0 flex-1 truncate">
                @{userService.getById(replyTo.userId)?.username ?? 'kullanıcı'} kullanıcısına yanıt
              </span>
              <button type="button" onClick={clearReply} className="grid h-7 w-7 place-items-center" aria-label="Yanıtı iptal">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Avatar src={me?.avatar ?? ''} name={me?.name ?? ''} size={32} />
            <MentionField
              value={text}
              onChange={setText}
              placeholder={replyTo ? 'Yanıt ekle...' : 'Yorum ekle...'}
              inputClassName="h-10 w-full bg-transparent text-[14px] outline-none placeholder:text-mute"
            />
            <button
              className="text-[14px] font-semibold text-hot disabled:opacity-40"
              type="submit"
              disabled={!text.trim()}
            >
              Paylaş
            </button>
          </div>
        </form>
      )}
    </Sheet>
  )
}

function CommentRow({
  comment,
  meId,
  ownerId,
  onApprove,
  onLike,
  onReply,
}: {
  comment: Comment
  meId?: string
  ownerId?: string
  onApprove?: (commentId: string) => void
  onLike?: (commentId: string) => void
  onReply: () => void
}) {
  const u = userService.getById(comment.userId)
  const likes = comment.likes ?? []
  const liked = Boolean(meId && likes.includes(meId))

  return (
    <div className="flex gap-3">
      <Link to={u ? `/u/${u.username}` : '#'} className="shrink-0">
        <Avatar src={u?.avatar ?? ''} name={u?.name ?? 'Kullanıcı'} size={32} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug">
          <Link to={u ? `/u/${u.username}` : '#'} className="font-semibold">
            {u?.username ?? 'anonim'}
          </Link>{' '}
          <MentionText text={comment.text} />
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-mute">
          <span>{timeAgo(comment.createdAt)}</span>
          {likes.length > 0 ? <span className="font-semibold">{formatCount(likes.length)} beğeni</span> : null}
          <button type="button" className="font-semibold" onClick={onReply}>
            Yanıtla
          </button>
          {comment.hidden ? (
            <>
              <span>Sadece sen görüyorsun</span>
              {meId === ownerId && onApprove ? (
                <button type="button" className="font-semibold text-hot" onClick={() => onApprove(comment.id)}>
                  Onayla
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      {onLike ? (
        <button
          type="button"
          className="mt-1 grid h-8 w-8 shrink-0 place-items-center self-start"
          onClick={() => onLike(comment.id)}
          aria-label="Beğen"
        >
          <Heart className={cx('h-3.5 w-3.5', liked ? 'fill-[#ff3040] text-[#ff3040]' : 'text-mute')} />
        </button>
      ) : null}
    </div>
  )
}
