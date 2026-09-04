import { ChevronUp, Eye, Heart, MoreHorizontal, Send, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '../../lib/nav'
import { timeAgo } from '../../lib/utils'
import { messageService } from '../../services/messageService'
import { notificationService } from '../../services/notificationService'
import { settingsService } from '../../services/settingsService'
import { storyService } from '../../services/storyService'
import { userService } from '../../services/userService'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { Avatar } from '../ui/Avatar'
import { LikeButton } from '../ui/LikeButton'
import { QuickShareButton } from '../ui/QuickShareButton'
import { MentionField } from '../ui/MentionField'
import { ShareSheet } from '../ui/ShareSheet'
import { mentionService } from '../../services/mentionService'
import { shareService } from '../../services/shareService'

const QUICK_EMOJIS = ['😂', '😮', '😍', '😢', '👏', '🔥']

export function StoryViewer({ onChange }: { onChange?: () => void }) {
  const viewer = useUiStore((s) => s.storyViewer)
  const close = useUiStore((s) => s.closeStories)
  const toast = useUiStore((s) => s.toast)
  const me = useAuthStore((s) => s.user)
  const [groupIndex, setGroupIndex] = useState(0)
  const [storyIndex, setStoryIndex] = useState(0)
  const [reply, setReply] = useState('')
  const [replyFocus, setReplyFocus] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pop, setPop] = useState(false)
  const [tick, setTick] = useState(0)
  const groups = useMemo(
    () => storyService.grouped().filter((g) => !me || settingsService.visibleTo(me.id, g.userId)),
    [viewer, tick, me],
  )
  const swipeY = useRef<number | null>(null)
  const blurTimer = useRef<number | null>(null)
  const navigate = useNavigate()
  const paused = replyFocus || sendOpen || insightsOpen || menuOpen || confirmOpen || reply.length > 0

  useEffect(() => {
    if (!viewer) return
    setGroupIndex(viewer.index)
    setStoryIndex(0)
    setReply('')
    setReplyFocus(false)
    setSendOpen(false)
    setInsightsOpen(false)
    setMenuOpen(false)
    setConfirmOpen(false)
    return () => {
      if (blurTimer.current) window.clearTimeout(blurTimer.current)
    }
  }, [viewer])

  const userIds = viewer?.userIds ?? []
  const currentUserId = userIds[groupIndex]
  const group = groups.find((g) => g.userId === currentUserId)
  const story = group?.stories[storyIndex]
  const liveStory = story ? (storyService.get(story.id) ?? story) : undefined
  const user = currentUserId ? userService.getById(currentUserId) : undefined
  void tick

  useEffect(() => {
    if (liveStory && me && liveStory.userId !== me.id) storyService.markViewed(liveStory.id, me.id)
  }, [liveStory, me])

  useEffect(() => {
    if (!viewer || !group || paused) return
    const t = window.setTimeout(() => next(), 4500)
    return () => window.clearTimeout(t)
  }, [viewer, groupIndex, storyIndex, group, paused])

  if (!viewer || !group || !liveStory || !user || !me) return null
  const currentStory = liveStory
  const owner = user
  const self = me

  const liked = currentStory.likes.includes(self.id)
  const mine = currentStory.userId === self.id

  function next() {
    if (!group) return
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((n) => n + 1)
      setReply('')
      return
    }
    if (groupIndex < userIds.length - 1) {
      setGroupIndex((n) => n + 1)
      setStoryIndex(0)
      setReply('')
      return
    }
    close()
  }

  function prev() {
    if (storyIndex > 0) {
      setStoryIndex((n) => n - 1)
      setReply('')
      return
    }
    if (groupIndex > 0) {
      const prevGroup = groups.find((g) => g.userId === userIds[groupIndex - 1])
      setGroupIndex((n) => n - 1)
      setStoryIndex(Math.max(0, (prevGroup?.stories.length ?? 1) - 1))
      setReply('')
      return
    }
    close()
  }

  function sendReply(text = reply.trim()) {
    const value = text.trim()
    if (!value || mine) return
    if (!settingsService.canReplyStory(currentStory.userId)) {
      toast('Bu kullanıcı story yanıtlarını kapattı')
      return
    }
    const gate = settingsService.canMessage(self.id, currentStory.userId)
    if (!gate.ok) {
      toast(gate.reason ?? 'Yanıt gönderilemez', 'err')
      return
    }
    const conv = messageService.withUser(self.id, currentStory.userId)
    messageService.send(conv.id, self.id, `Story yanıtı: ${value}`, currentStory.image, undefined, {
      kind: 'story_reply',
      username: owner.username,
    })
    notificationService.notify({
      type: 'comment',
      actorId: self.id,
      recipientId: currentStory.userId,
      text: `@${self.username} story’ne yanıt verdi`,
      href: `/messages/${conv.id}`,
      persist: true,
    })
    mentionService.notify(self.id, value, {
      label: 'bir hikaye yanıtında senden bahsetti',
      href: `/messages/${conv.id}`,
      image: currentStory.image,
    })
    setReply('')
    setReplyFocus(false)
    toast('Yanıt gönderildi')
  }

  function removeCurrent() {
    if (!mine || !liveStory || !group) return
    const remaining = group.stories.filter((s) => s.id !== liveStory.id)
    storyService.remove(liveStory.id)
    setMenuOpen(false)
    setConfirmOpen(false)
    toast('Hikaye silindi')
    setTick((n) => n + 1)
    onChange?.()
    if (remaining.length === 0) {
      close()
      return
    }
    setStoryIndex((n) => Math.min(n, remaining.length - 1))
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black">
      <img src={liveStory.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/55" />
      <div className="relative flex h-full flex-col">
        <div className="relative z-10 flex gap-1 px-3 pt-3">
          {group.stories.map((s, i) => (
            <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full bg-white transition-all"
                style={{ width: i < storyIndex ? '100%' : i === storyIndex ? '100%' : '0%' }}
              />
            </div>
          ))}
        </div>
        <div className="relative z-10 flex items-center justify-between px-3 py-2">
          <button
            type="button"
            className="flex min-w-0 items-center gap-2"
            onClick={() => {
              close()
              navigate(`/u/${user.username}`)
            }}
          >
            <Avatar src={user.avatar} name={user.name} size={32} />
            <div className="min-w-0 text-left">
              <p className="truncate text-[13px] font-semibold">
                {user.username}
                <span className="ml-1.5 font-normal text-white/70">{timeAgo(liveStory.createdAt)}</span>
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1">
            {mine ? (
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-full bg-black/40"
                aria-label="Daha fazla"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            ) : null}
            <button type="button" onClick={close} className="grid h-10 w-10 place-items-center rounded-full bg-black/40">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="absolute inset-0 z-0 flex">
          <button type="button" className="h-full flex-1" onClick={prev} aria-label="Önceki" />
          <button type="button" className="h-full flex-1" onClick={next} aria-label="Sonraki" />
        </div>
        <div className="flex-1" />

        <div
          className="relative z-10 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {(liveStory.mentionedIds ?? []).length ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {(liveStory.mentionedIds ?? []).map((id) => {
                const tagged = userService.getById(id)
                if (!tagged) return null
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      close()
                      navigate(`/u/${tagged.username}`)
                    }}
                    className="rounded-full bg-black/55 px-2.5 py-1 text-[13px] font-semibold"
                  >
                    @{tagged.username}
                  </button>
                )
              })}
            </div>
          ) : null}
          {mine ? (
            <div className="select-none">
              <div className="mb-2 flex justify-center">
                <ChevronUp className="h-5 w-5 text-white/80" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInsightsOpen(true)}
                  onPointerDown={(e) => {
                    swipeY.current = e.clientY
                  }}
                  onPointerUp={(e) => {
                    if (swipeY.current != null && swipeY.current - e.clientY > 48) setInsightsOpen(true)
                    swipeY.current = null
                  }}
                  onPointerCancel={() => {
                    swipeY.current = null
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-black/45 px-4 py-2.5"
                >
                  <Eye className="h-5 w-5" />
                  <span className="truncate text-sm font-semibold">
                    {liveStory.viewedBy.length} görüntüleme
                  </span>
                  {liveStory.likes.length ? (
                    <span className="flex items-center gap-1 text-sm text-white/80">
                      <Heart className="h-3.5 w-3.5 fill-[#ff3040] text-[#ff3040]" />
                      {liveStory.likes.length}
                    </span>
                  ) : null}
                </button>
                <QuickShareButton
                  meId={me.id}
                  onOpenSheet={() => setSendOpen(true)}
                  className="grid h-11 w-11 shrink-0 place-items-center"
                  iconClassName="h-6 w-6"
                  payload={{
                    text: `Sana bir story gönderdi (@${user.username})`,
                    image: liveStory.image,
                    share: { kind: 'story', username: user.username },
                  }}
                />
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="grid h-11 w-11 shrink-0 place-items-center"
                  aria-label="Hikayeyi sil"
                >
                  <Trash2 className="h-6 w-6" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {replyFocus && !reply && settingsService.canReplyStory(liveStory.userId) ? (
                <div className="mb-3 flex items-center justify-around px-1">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="grid h-11 w-11 place-items-center text-[28px] leading-none transition-transform active:scale-125"
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => sendReply(emoji)}
                      aria-label={`${emoji} gönder`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="flex items-center gap-1.5">
                {settingsService.canReplyStory(liveStory.userId) ? (
                  <form
                    className="min-w-0 flex-1"
                    onSubmit={(e) => {
                      e.preventDefault()
                      sendReply()
                    }}
                  >
                    <MentionField
                      value={reply}
                      onChange={setReply}
                      onFocus={() => {
                        if (blurTimer.current) window.clearTimeout(blurTimer.current)
                        setReplyFocus(true)
                      }}
                      onBlur={() => {
                        blurTimer.current = window.setTimeout(() => setReplyFocus(false), 180)
                      }}
                      placeholder={`@${user.username} kişisine yanıt yaz...`}
                      inputClassName="h-12 w-full rounded-full border border-white/30 bg-black/45 px-4 text-sm outline-none placeholder:text-white/50"
                    />
                  </form>
                ) : (
                  <p className="min-w-0 flex-1 rounded-full border border-white/20 bg-black/40 px-4 py-3 text-sm text-white/70">
                    Yanıtlar kapalı
                  </p>
                )}
                <LikeButton
                  liked={liked}
                  pop={pop}
                  onClick={() => {
                    const wasLiked = liked
                    storyService.toggleLike(liveStory.id, me.id)
                    if (!wasLiked) {
                      setPop(true)
                      window.setTimeout(() => setPop(false), 350)
                      notificationService.notify({
                        type: 'like',
                        actorId: me.id,
                        recipientId: liveStory.userId,
                        text: 'story’ni beğendi',
                        href: `/u/${me.username}`,
                      })
                    }
                    setTick((n) => n + 1)
                  }}
                />
                <QuickShareButton
                  meId={me.id}
                  onOpenSheet={() => setSendOpen(true)}
                  className="grid h-10 w-10 place-items-center"
                  iconClassName="h-6 w-6"
                  payload={{
                    text: `Sana bir story gönderdi (@${user.username})`,
                    image: liveStory.image,
                    share: { kind: 'story', username: user.username },
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <ShareSheet
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        payload={{
          text: `Sana bir story gönderdi (@${user.username})`,
          image: liveStory.image,
          share: { kind: 'story', username: user.username },
        }}
      />

      {menuOpen && mine ? (
        <div className="absolute inset-0 z-[20] flex flex-col justify-end bg-black/50">
          <button type="button" className="flex-1" onClick={() => setMenuOpen(false)} aria-label="Kapat" />
          <div className="rounded-t-3xl bg-ink-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-center pt-2">
              <span className="h-1 w-12 rounded-full bg-line" />
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setConfirmOpen(true)
              }}
              className="flex w-full items-center justify-between px-5 py-4 text-[15px] text-red-500"
            >
              Hikayeyi sil
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}

      {confirmOpen && mine ? (
        <div className="absolute inset-0 z-[25] flex items-center justify-center bg-black/60 px-8">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-ink-2">
            <div className="px-5 pt-5 pb-4 text-center">
              <p className="text-[16px] font-semibold">Hikayeyi sil?</p>
              <p className="mt-1 text-sm text-mute">Bu hikaye senin ve izleyenlerin için kalkar.</p>
            </div>
            <button
              type="button"
              onClick={removeCurrent}
              className="w-full border-t border-line py-3 text-[15px] font-semibold text-red-500"
            >
              Sil
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="w-full border-t border-line py-3 text-[15px]"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : null}

      {insightsOpen && mine ? (
        <div className="absolute inset-0 z-[20] flex flex-col justify-end bg-black/50">
          <button type="button" className="flex-1" onClick={() => setInsightsOpen(false)} aria-label="Kapat" />
          <div className="max-h-[70vh] rounded-t-3xl bg-ink-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex justify-center pt-2">
              <span className="h-1 w-12 rounded-full bg-line" />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-[16px] font-semibold">
                {liveStory.viewedBy.length} görüntüleme
              </p>
              <div className="flex items-center gap-3 text-sm text-mute">
                <span className="flex items-center gap-1">
                  <Heart className="h-4 w-4 fill-[#ff3040] text-[#ff3040]" />
                  {liveStory.likes.length}
                </span>
                <button type="button" onClick={() => setInsightsOpen(false)} aria-label="Kapat">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[52vh] overflow-y-auto">
              {liveStory.viewedBy.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-mute">Henüz görüntüleme yok.</p>
              ) : (
                liveStory.viewedBy.map((id) => {
                  const u = userService.getById(id)
                  if (!u) return null
                  const likedStory = liveStory.likes.includes(id)
                  return (
                    <div key={id} className="flex items-center gap-3 px-4 py-2.5">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => {
                          close()
                          navigate(`/u/${u.username}`)
                        }}
                      >
                        <Avatar src={u.avatar} name={u.name} size={48} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{u.username}</p>
                          <p className="truncate text-xs text-mute">{u.name}</p>
                        </div>
                      </button>
                      {likedStory ? <Heart className="h-5 w-5 shrink-0 fill-[#ff3040] text-[#ff3040]" /> : null}
                      <button
                        type="button"
                        className="grid h-10 w-10 shrink-0 place-items-center"
                        aria-label="Gönder"
                        onClick={() => {
                          const count = shareService.sendTo(me.id, [u.id], {
                            text: `Sana bir story gönderdi (@${user.username})`,
                            image: liveStory.image,
                            share: { kind: 'story', username: user.username },
                          })
                          toast(count ? `@${u.username} kişisine gönderildi` : 'Gönderilemedi', count ? 'ok' : 'err')
                        }}
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
