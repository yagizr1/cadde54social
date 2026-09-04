import { Camera, ChevronLeft, CornerUpLeft, Heart, Image as ImageIcon, Info, Smile, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import { Link, useNavigate } from '../lib/nav'
import { ChatCamera } from '../components/chat/ChatCamera'
import { MessageBubble } from '../components/chat/MessageBubble'
import { MessageMenu } from '../components/chat/MessageMenu'
import { ViewOnceViewer } from '../components/chat/ViewOnceViewer'
import { UserActionsSheet } from '../components/profile/UserActionsSheet'
import { Avatar } from '../components/ui/Avatar'
import { ShareSheet } from '../components/ui/ShareSheet'
import { useApp } from '../hooks/useApp'
import { TIME_REVEAL_MAX, useChatSwipe } from '../hooks/useChatSwipe'
import { parseShare } from '../lib/chatShare'
import { uploadImageFile } from '../lib/uploadMedia'
import { copyText, dayKey } from '../lib/utils'
import { messageService } from '../services/messageService'
import { settingsService } from '../services/settingsService'
import { userService } from '../services/userService'
import type { SharePayload } from '../services/shareService'
import { useUiStore } from '../store/uiStore'
import type { ChatMessage, ChatReplyTo } from '../types'

const EMOJIS = ['😂', '😮', '😍', '😢', '👏', '🔥', '❤️', '🙌']

function stampLabel(ts: number): string {
  const time = clock(ts)
  const key = dayKey(ts)
  if (key === dayKey()) return `Bugün ${time}`
  if (key === dayKey(Date.now() - 86_400_000)) return `Dün ${time}`
  const d = new Date(ts)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  const date = d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  return `${date} ${time}`
}

function clock(ts: number): string {
  return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function visibleText(m: ChatMessage): string {
  if (m.image && (m.text === 'Fotoğraf' || !m.text.trim())) return ''
  if (m.video && (m.text === 'Video' || !m.text.trim())) return ''
  return m.text
}

function previewOf(m: ChatMessage): string {
  const share = parseShare(m)
  if (share?.kind === 'story_reply') return share.reply || 'Hikâye yanıtı'
  if (share?.kind === 'post') return 'Gönderi'
  if (share?.kind === 'story') return 'Story'
  if (share?.kind === 'reel') return 'Reels'
  if (share?.kind === 'profile') return 'Profil'
  if (m.viewOnce) return 'Fotoğraf'
  return visibleText(m) || (m.image ? 'Fotoğraf' : m.video ? 'Video' : 'Mesaj')
}

export function ConversationPage() {
  const { id = '' } = useParams()
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<ChatReplyTo | null>(null)
  const [forward, setForward] = useState<SharePayload | null>(null)
  const [camOpen, setCamOpen] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [onceMsg, setOnceMsg] = useState<ChatMessage | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const prevLen = useRef(0)
  const prevId = useRef(id)
  const conv = messageService.get(id)

  const swipe = useChatSwipe((mid) => {
    const current = messageService.get(id)
    if (!current || !user) return
    const peer = current.participantIds.find((x) => x !== user.id)
    if (peer && settingsService.isBlocked(user.id, peer)) return
    const m = current.messages.find((x) => x.id === mid)
    if (!m) return
    setReplyTo({ id: m.id, senderId: m.senderId, text: previewOf(m) })
  })

  useEffect(() => {
    if (!photo) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPhoto(null)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [photo])

  useEffect(() => {
    const el = listRef.current
    const len = conv?.messages.length ?? 0
    if (!el) return
    const switched = prevId.current !== id
    if (switched || len >= prevLen.current) {
      el.scrollTop = el.scrollHeight
    }
    prevId.current = id
    prevLen.current = len
  }, [conv?.messages.length, id])

  useEffect(() => {
    if (!user || !conv) return
    const other = conv.participantIds.find((x) => x !== user.id)
    if (other && settingsService.isBlocked(user.id, other)) return
    messageService.markRead(conv.id, user.id)
  }, [user?.id, conv?.id, conv?.messages.length])

  if (!user || !conv) {
    return <div className="p-6 text-center text-mute">Sohbet bulunamadı.</div>
  }
  const conversation = conv
  const meId = user.id

  const otherId = conversation.participantIds.find((x) => x !== meId)
  const other = otherId ? userService.getById(otherId) : undefined
  const blocked = Boolean(otherId && settingsService.isBlocked(meId, otherId))
  const theyBlocked = Boolean(otherId && settingsService.iBlocked(otherId, meId))
  const canSeeProfile = Boolean(other && !theyBlocked)
  const profileUser = canSeeProfile ? other : undefined
  const here = Boolean(
    profileUser && settingsService.isHereVisible(profileUser.id, profileUser.hereUntil, meId),
  )
  const lastMineId = [...conversation.messages].reverse().find((m) => m.senderId === meId && !m.system)?.id
  const showSeen = Boolean(
    otherId && !blocked && lastMineId && messageService.seenByOther(conversation, meId, otherId),
  )
  const messages = conv.messages
  const active = messages.find((m) => m.id === activeId)
  const typing = text.trim().length > 0

  async function send(next = text, image?: string, viewOnce?: boolean) {
    if (blocked) {
      toast('Bu kullanıcıyla mesajlaşamazsın', 'err')
      return
    }
    const body = next.trim()
    if (!body && !image) return
    messageService.send(
      conversation.id,
      meId,
      body || (image ? 'Fotoğraf' : ''),
      image,
      undefined,
      undefined,
      replyTo ?? undefined,
      viewOnce,
    )
    setText('')
    setEmojiOpen(false)
    setReplyTo(null)
    refresh()
  }

  async function onPick(file?: File) {
    if (!file) return
    const img = await uploadImageFile(file, 900)
    await send('Fotoğraf', img)
  }

  function openCamera() {
    if (blocked) return
    if (!navigator.mediaDevices?.getUserMedia) {
      camRef.current?.click()
      return
    }
    setCamOpen(true)
  }

  return (
    <div className="flex h-dvh flex-col bg-black">
      <header className="safe-topbar-14 flex shrink-0 items-center gap-1 px-1">
        <button
          type="button"
          onClick={() => navigate('/messages', { replace: true })}
          className="grid h-11 w-11 place-items-center"
          aria-label="Geri"
        >
          <ChevronLeft className="h-8 w-8" strokeWidth={1.75} />
        </button>
        {profileUser ? (
          <Link to={`/u/${profileUser.username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
            <Avatar src={profileUser.avatar} name={profileUser.name} size={32} />
            <span className="min-w-0">
              <p className="truncate text-[16px] font-semibold leading-tight">{profileUser.username}</p>
              {here ? <p className="truncate text-[12px] leading-tight text-[#a8a8a8]">Cadde 54’te</p> : null}
            </span>
          </Link>
        ) : (
          <p className="min-w-0 flex-1 truncate text-[16px] font-semibold">Kullanıcı</p>
        )}
        {profileUser ? (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid h-11 w-11 shrink-0 place-items-center"
            aria-label="Bilgi"
          >
            <Info className="h-[22px] w-[22px]" strokeWidth={1.75} />
          </button>
        ) : null}
      </header>
      {profileUser ? (
        <UserActionsSheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          meId={user.id}
          target={profileUser}
          onChange={refresh}
        />
      ) : null}

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-2 py-2 touch-pan-y"
        {...swipe.bind}
      >
        <div className="flex min-h-full flex-col justify-end">
          {profileUser ? (
            <div className="flex flex-col items-center px-6 pt-6 pb-8">
              <Avatar src={profileUser.avatar} name={profileUser.name} size={88} />
              <p className="mt-3 text-[16px] font-semibold">{profileUser.name}</p>
              <p className="text-[13px] text-[#a8a8a8]">{profileUser.username} · Cadde 54</p>
              <Link
                to={`/u/${profileUser.username}`}
                className="mt-3 rounded-lg bg-white/10 px-4 py-1.5 text-[13px] font-semibold"
              >
                Profili gör
              </Link>
            </div>
          ) : null}

          {messages.map((m, i) => {
            if (m.system) {
              return (
                <p key={m.id} className="px-6 py-3 text-center text-[12px] font-medium text-[#a8a8a8]">
                  {m.text}
                </p>
              )
            }
            const prev = messages[i - 1]
            const next = messages[i + 1]
            const mine = m.senderId === user.id
            const gap =
              !prev ||
              m.createdAt - prev.createdAt > 60 * 60 * 1000 ||
              dayKey(prev.createdAt) !== dayKey(m.createdAt)
            const first = !prev || prev.senderId !== m.senderId || gap
            const last =
              !next ||
              next.senderId !== m.senderId ||
              next.createdAt - m.createdAt > 60 * 60 * 1000 ||
              dayKey(next.createdAt) !== dayKey(m.createdAt)
            const replyX = swipe.reply.id === m.id ? swipe.reply.x : 0
            return (
              <div key={m.id}>
                {gap ? (
                  <p className="px-2 py-3 text-center text-[12px] font-medium text-[#a8a8a8]">{stampLabel(m.createdAt)}</p>
                ) : null}
                <div className="relative" data-mid={m.id}>
                  {replyX > 10 ? (
                    <span
                      className="pointer-events-none absolute top-1/2 left-9 z-0 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/10"
                      style={{ opacity: Math.min(1, replyX / 48) }}
                    >
                      <CornerUpLeft className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                  <div
                    className="will-change-transform"
                    style={{ transform: `translateX(${replyX - swipe.reveal}px)` }}
                  >
                    <MessageBubble
                      mine={mine}
                      message={m}
                      first={first}
                      last={last}
                      avatar={mine ? undefined : other?.avatar}
                      name={other?.name ?? ''}
                      blocked={blocked}
                      ignoreTap={swipe.didSwipe}
                      onOpenMenu={() => {
                        if (swipe.didSwipe()) return
                        setActiveId(m.id)
                      }}
                      onHeart={
                        blocked
                          ? undefined
                          : () => {
                              messageService.react(conv.id, m.id, user.id, '❤️')
                              refresh()
                            }
                      }
                      meId={user.id}
                      onOpenPhoto={
                        m.image
                          ? () => {
                              if (m.viewOnce) {
                                if (!messageService.canOpenOnce(m, user.id)) return
                                if (m.senderId !== user.id) {
                                  messageService.openOnce(conv.id, m.id, user.id)
                                  refresh()
                                }
                                setOnceMsg(m)
                                return
                              }
                              setPhoto(m.image!)
                            }
                          : undefined
                      }
                    />
                  </div>
                  <span
                    className="pointer-events-none absolute top-1/2 right-1 text-[11px] tabular-nums text-[#a8a8a8]"
                    style={{
                      opacity: swipe.reveal / TIME_REVEAL_MAX,
                      transform: `translate(${TIME_REVEAL_MAX - swipe.reveal}px, -50%)`,
                    }}
                  >
                    {clock(m.createdAt)}
                  </span>
                </div>
                {showSeen && m.id === lastMineId && last ? (
                  <p
                    className="mt-0.5 pr-1 text-right text-[11px] text-[#a8a8a8]"
                    style={{ transform: `translateX(${-swipe.reveal}px)` }}
                  >
                    Görüldü
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="shrink-0 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {blocked ? (
          <p className="rounded-full bg-[#262626] px-4 py-3 text-center text-[13px] text-[#a8a8a8]">
            Bu kullanıcıyla mesajlaşamazsın
          </p>
        ) : (
          <>
            {replyTo ? (
              <div className="mb-1.5 flex items-center gap-2 rounded-2xl bg-[#262626] px-3 py-2">
                <span className="h-8 w-0.5 shrink-0 rounded-full bg-[#3797f0]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold">
                    {replyTo.senderId === meId ? 'Kendine yanıt' : userService.getById(replyTo.senderId)?.username ?? 'Yanıt'}
                  </p>
                  <p className="truncate text-[12px] text-[#a8a8a8]">{replyTo.text}</p>
                </div>
                <button type="button" onClick={() => setReplyTo(null)} className="grid h-8 w-8 place-items-center" aria-label="İptal">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            {emojiOpen ? (
              <div className="mb-1.5 flex items-center justify-around px-2">
                {EMOJIS.map((e) => (
                  <button key={e} type="button" onClick={() => setText((t) => t + e)} className="text-[26px] leading-none">
                    {e}
                  </button>
                ))}
              </div>
            ) : null}
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void send()
              }}
            >
              <button
                type="button"
                onClick={openCamera}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-hot text-ink"
                aria-label="Kamera"
              >
                <Camera className="h-[18px] w-[18px]" />
              </button>
              <div className="flex h-11 min-w-0 flex-1 items-center rounded-full border border-white/15 bg-transparent pl-4 pr-1">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Mesaj..."
                  className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#a8a8a8]"
                />
                {typing ? (
                  <button type="submit" className="px-3 text-[15px] font-semibold text-[#3797f0]">
                    Gönder
                  </button>
                ) : (
                  <div className="flex items-center pr-0.5">
                    <button type="button" onClick={() => fileRef.current?.click()} className="grid h-10 w-10 place-items-center" aria-label="Galeri">
                      <ImageIcon className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={() => setEmojiOpen((v) => !v)} className="grid h-10 w-10 place-items-center" aria-label="Emoji">
                      <Smile className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={() => void send('❤️')} className="grid h-10 w-10 place-items-center" aria-label="Kalp gönder">
                      <Heart className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </form>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                await onPick(file)
              }}
            />
            <input
              ref={camRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                const img = await uploadImageFile(file, 1200)
                await send('Fotoğraf', img, true)
              }}
            />
          </>
        )}
      </div>
      {camOpen ? (
        <ChatCamera
          onCapture={(file, opts) => {
            void (async () => {
              const img = await uploadImageFile(file, 1200)
              await send(opts.caption || 'Fotoğraf', img, opts.viewOnce)
            })()
          }}
          onClose={() => setCamOpen(false)}
          onFallback={() => camRef.current?.click()}
        />
      ) : null}
      {active ? (
        <MessageMenu
          mine={active.senderId === user.id}
          canCopy={Boolean(
            !active.viewOnce && (visibleText(active) || parseShare(active)?.reply || parseShare(active)?.note),
          )}
          canForward={!active.viewOnce}
          onClose={() => setActiveId(null)}
          canInteract={!blocked}
          onReact={(emoji) => {
            messageService.react(conv.id, active.id, user.id, emoji)
            setActiveId(null)
            refresh()
          }}
          onReply={() => {
            setReplyTo({ id: active.id, senderId: active.senderId, text: previewOf(active) })
            setActiveId(null)
          }}
          onForward={() => {
            setForward({
              text: previewOf(active),
              image: active.image,
              video: active.video,
              share: active.share,
            })
            setActiveId(null)
          }}
          onCopy={() => {
            void copyText(visibleText(active) || parseShare(active)?.reply || parseShare(active)?.note || previewOf(active))
            toast('Kopyalandı')
            setActiveId(null)
          }}
          onUnsend={() => {
            messageService.removeMessages(conv.id, [active.id])
            setActiveId(null)
            refresh()
          }}
        />
      ) : null}
      <ShareSheet open={Boolean(forward)} onClose={() => setForward(null)} payload={forward ?? { text: '' }} />
      {onceMsg?.image ? (
        <ViewOnceViewer
          src={onceMsg.image}
          caption={onceMsg.text && onceMsg.text !== 'Fotoğraf' ? onceMsg.text : undefined}
          onClose={() => setOnceMsg(null)}
        />
      ) : null}
      {photo
        ? createPortal(
            <button
              type="button"
              className="fixed inset-0 z-[100] bg-black"
              onClick={() => setPhoto(null)}
              aria-label="Kapat"
            >
              <img src={photo} alt="" className="h-full w-full object-contain" />
              <span className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] right-3 grid h-10 w-10 place-items-center rounded-full bg-black/50">
                <X className="h-6 w-6" />
              </span>
            </button>,
            document.body,
          )
        : null}
    </div>
  )
}
