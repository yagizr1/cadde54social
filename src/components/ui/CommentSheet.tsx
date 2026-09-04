import { useState } from 'react'
import { timeAgo } from '../../lib/utils'
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
  mentionHref,
  mentionImage,
  ownerId,
  onApprove,
  commentsOff,
}: {
  open: boolean
  onClose: () => void
  comments: Comment[]
  onSend: (text: string) => void
  mentionHref?: string
  mentionImage?: string
  ownerId?: string
  onApprove?: (commentId: string) => void
  commentsOff?: boolean
}) {
  const [text, setText] = useState('')
  const me = useAuthStore((s) => s.user)

  return (
    <Sheet open={open} onClose={onClose} title="Yorumlar">
      <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="py-10 text-center text-sm text-mute">Henüz yorum yok.</p>
        ) : (
          comments.map((c) => {
            const u = userService.getById(c.userId)
            return (
              <div key={c.id} className="flex gap-3">
                <Avatar src={u?.avatar ?? ''} name={u?.name ?? 'Kullanıcı'} size={32} />
                <div className="min-w-0">
                  <p className="text-[13px] leading-snug">
                    <span className="font-semibold">{u?.username ?? 'anonim'}</span>{' '}
                    <MentionText text={c.text} />
                  </p>
                  <p className="mt-1 text-[11px] text-mute">{timeAgo(c.createdAt)}</p>
                  {c.hidden ? (
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-[11px] text-mute">Sadece sen görüyorsun</p>
                      {me?.id === ownerId && onApprove ? (
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-hot"
                          onClick={() => onApprove(c.id)}
                        >
                          Onayla
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>
      {commentsOff && me?.id !== ownerId ? (
        <p className="mt-3 border-t border-white/10 pt-3 text-center text-[13px] text-mute">Yorumlar kapalı</p>
      ) : (
      <form
        className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3"
        onSubmit={(e) => {
          e.preventDefault()
          const next = text.trim()
          if (!next || !me) return
          onSend(next)
          mentionService.notify(me.id, next, {
            label: 'bir yorumda senden bahsetti',
            href: mentionHref,
            image: mentionImage,
          })
          setText('')
        }}
      >
        <Avatar src={me?.avatar ?? ''} name={me?.name ?? ''} size={32} />
        <MentionField
          value={text}
          onChange={setText}
          placeholder="Yorum ekle..."
          inputClassName="h-10 w-full bg-transparent text-[14px] outline-none placeholder:text-mute"
        />
        <button
          className="text-[14px] font-semibold text-hot disabled:opacity-40"
          type="submit"
          disabled={!text.trim()}
        >
          Paylaş
        </button>
      </form>
      )}
    </Sheet>
  )
}
