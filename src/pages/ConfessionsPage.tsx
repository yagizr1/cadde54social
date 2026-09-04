import { Flag, MessageCircle, Send } from 'lucide-react'
import { useState } from 'react'
import { CommentSheet } from '../components/ui/CommentSheet'
import { Button } from '../components/ui/Button'
import { LikeButton } from '../components/ui/LikeButton'
import { useApp } from '../hooks/useApp'
import { copyText, timeAgo } from '../lib/utils'
import { confessionService } from '../services/confessionService'
import { useUiStore } from '../store/uiStore'
import type { Confession } from '../types'

export function ConfessionsPage() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const [text, setText] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  if (!user) return null
  const items = confessionService.list()
  const active = items.find((c) => c.id === openId)

  return (
    <div className="mx-auto max-w-xl px-4 py-4 anim-page">
      <h1 className="font-display text-2xl font-bold">🕵️ İtiraflar</h1>
      <div className="mt-3 rounded-2xl border border-white/25 bg-white/5 p-3 text-xs leading-relaxed text-white/80">
        Topluluk kuralları: kişisel bilgi, taciz, tehdit, ifşa ve hedef gösterme yasaktır. İhlalleri “Şikayet Et”
        ile bildir. Anonimlik, başkasını rencide etme hakkı vermez.
      </div>
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim().length < 8) {
            toast('İtiraf biraz daha uzun olsun', 'err')
            return
          }
          confessionService.create(text.trim())
          setText('')
          toast('İtirafın anonim olarak yayınlandı')
          refresh()
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Anonim itirafını yaz..."
          className="min-h-28 w-full rounded-2xl border border-line bg-panel px-4 py-3 text-sm outline-none"
        />
        <Button className="mt-2 w-full">Anonim gönder</Button>
      </form>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <ConfessionCard
            key={item.id}
            item={item}
            meId={user.id}
            onOpen={() => setOpenId(item.id)}
            onChange={refresh}
          />
        ))}
      </div>
      <CommentSheet
        open={Boolean(active)}
        onClose={() => setOpenId(null)}
        comments={active?.comments ?? []}
        onSend={(t) => {
          if (!active) return
          confessionService.comment(active.id, user.id, t)
          refresh()
        }}
      />
    </div>
  )
}

function ConfessionCard({
  item,
  meId,
  onOpen,
  onChange,
}: {
  item: Confession
  meId: string
  onOpen: () => void
  onChange: () => void
}) {
  const toast = useUiStore((s) => s.toast)
  const liked = item.likes.includes(meId)
  return (
    <article className="rounded-3xl border border-line bg-panel p-4">
      <p className="text-xs text-mute">Anonim · {timeAgo(item.createdAt)}</p>
      <p className="mt-2 text-sm leading-relaxed">{item.content}</p>
      <div className="mt-3 flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1">
          <LikeButton
            liked={liked}
            size="sm"
            onClick={() => {
              confessionService.toggleLike(item.id, meId)
              onChange()
            }}
          />
          {item.likes.length}
        </div>
        <button className="flex items-center gap-1" onClick={onOpen}>
          <MessageCircle className="h-4 w-4" /> {item.comments.length}
        </button>
        <button
          className="flex items-center gap-1"
          onClick={async () => {
            await copyText(item.content)
            toast('İtiraf kopyalandı')
          }}
        >
          <Send className="h-4 w-4" /> Paylaş
        </button>
        <button
          className="ml-auto flex items-center gap-1 text-mute"
          onClick={() => {
            confessionService.report(item.id, meId)
            toast('Şikayetin alındı. Moderasyon kuyruğuna düştü.')
            onChange()
          }}
        >
          <Flag className="h-4 w-4" /> Şikayet Et
        </button>
      </div>
    </article>
  )
}
