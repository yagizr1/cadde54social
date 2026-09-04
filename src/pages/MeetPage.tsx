import { Heart, MessageCircle, Plus, RotateCcw, Undo2, UserRound, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type PointerEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link, useNavigate } from '../lib/nav'
import { PremiumGate } from '../components/premium/PremiumGate'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useApp } from '../hooks/useApp'
import { cx } from '../lib/utils'
import { uploadImageFile } from '../lib/uploadMedia'
import { meetService } from '../services/meetService'
import { premiumService } from '../services/premiumService'
import { sync } from '../services/syncService'
import { userService } from '../services/userService'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import type { User } from '../types'

type MeetTab = 'cards' | 'likes' | 'matches' | 'photos'

const MAX_MEET_PHOTOS = 3

export function MeetPage() {
  const { user, refresh } = useApp()
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: MeetTab = raw === 'likes' || raw === 'matches' || raw === 'photos' ? raw : 'cards'
  if (!user) return null
  const premium = premiumService.isActive(user)
  const likeCount = meetService.incomingLikes(user.id).length
  const needsPhotos = premium && !meetService.hasPhotos(user)

  function setTab(next: MeetTab) {
    setParams(next === 'cards' ? {} : { tab: next }, { replace: true })
  }

  function persistMe(next: User) {
    useAuthStore.setState({ user: next })
  }

  return (
    <div className="mx-auto max-w-xl anim-page">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-[22px] font-bold">Tanış</h1>
        <p className="mt-1 text-[13px] text-mute">
          {needsPhotos
            ? 'Kartlarda görünmek için en az bir fotoğrafını yükle. En fazla 3 fotoğraf ekleyebilirsin.'
            : 'Sağa kaydır, beğen. İki taraf da beğenirse eşleşirsiniz.'}
        </p>
      </div>

      {needsPhotos ? (
        <PhotoSetup user={user} onSaved={persistMe} />
      ) : (
        <>
          <div className="grid grid-cols-4 border-b border-white/10">
            {(
              [
                ['cards', 'Kartlar'],
                ['likes', 'Beğenenler'],
                ['matches', 'Eşleşmeler'],
                ['photos', 'Fotoğraflar'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`relative py-2.5 text-[12px] font-semibold sm:text-[14px] ${tab === id ? 'text-white' : 'text-mute'}`}
              >
                {label}
                {id === 'likes' && likeCount > 0 ? (
                  <span className="ml-1 text-[11px] text-hot">{likeCount}</span>
                ) : null}
                {tab === id ? <span className="absolute inset-x-0 bottom-0 h-[1px] bg-white" /> : null}
              </button>
            ))}
          </div>

          {!premium ? (
            <div className="p-4">
              <PremiumGate title="Tanış yalnızca Premium ile açılır.">
                <div className="relative mx-auto h-[420px] max-w-sm overflow-hidden rounded-[28px] bg-[#2a2a2a]">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-6 left-5 right-5">
                    <p className="text-2xl font-bold">Melis, 24</p>
                    <p className="mt-1 text-sm text-white/80">Cadde playlist’i bende.</p>
                  </div>
                </div>
                <div className="mt-5 flex justify-center gap-6">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-[#262626]">
                    <X className="h-7 w-7" />
                  </span>
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-[#262626]">
                    <Undo2 className="h-6 w-6" />
                  </span>
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-hot/20">
                    <Heart className="h-7 w-7 text-hot" />
                  </span>
                </div>
              </PremiumGate>
            </div>
          ) : tab === 'cards' ? (
            <CardDeck meId={user.id} onChange={refresh} />
          ) : tab === 'likes' ? (
            <LikesList meId={user.id} onChange={refresh} />
          ) : tab === 'photos' ? (
            <PhotosTab user={user} onSaved={persistMe} />
          ) : (
            <MatchList meId={user.id} onChange={refresh} />
          )}
        </>
      )}
    </div>
  )
}

async function saveMeetPhotos(userId: string, photos: string[]) {
  const ready = photos.filter(Boolean).length > 0
  const next = userService.update(userId, { meetPhotos: photos, meetPhotosReady: ready })
  if (!next) return undefined
  await sync('users.update', { meetPhotos: photos, meetPhotosReady: ready })
  return next
}

function PhotoSetup({ user, onSaved }: { user: User; onSaved: (next: User) => void }) {
  const toast = useUiStore((s) => s.toast)
  const [photos, setPhotos] = useState<string[]>(() => (user.meetPhotos ?? []).slice(0, MAX_MEET_PHOTOS))
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!photos.length) {
      toast('En az bir fotoğraf yükle', 'err')
      return
    }
    setBusy(true)
    try {
      const next = await saveMeetPhotos(user.id, photos)
      if (!next) return
      toast('Fotoğrafların kaydedildi')
      onSaved(next)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-4 py-5">
      <p className="text-[15px] font-semibold">Tanış fotoğrafların</p>
      <p className="mt-1 text-[13px] text-mute">En az bir fotoğrafın olmalı. Sonra Fotoğraflar sekmesinden değiştirirsin.</p>
      <div className="mt-4">
        <PhotoSlots photos={photos} busy={busy} onBusy={setBusy} onChange={setPhotos} />
      </div>
      <Button className="mt-5 h-11 w-full" disabled={busy || !photos.length} onClick={() => void save()}>
        Kaydet ve devam et
      </Button>
    </div>
  )
}

function PhotosTab({ user, onSaved }: { user: User; onSaved: (next: User) => void }) {
  const toast = useUiStore((s) => s.toast)
  const [photos, setPhotos] = useState<string[]>(() => (user.meetPhotos ?? []).slice(0, MAX_MEET_PHOTOS))
  const [busy, setBusy] = useState(false)

  async function apply(nextPhotos: string[]) {
    setPhotos(nextPhotos)
    const next = await saveMeetPhotos(user.id, nextPhotos)
    if (!next) return
    onSaved(next)
    toast(nextPhotos.length ? 'Fotoğraflar güncellendi' : 'Fotoğrafsız Tanış kullanılamaz')
  }

  return (
    <div className="px-4 py-5">
      <p className="text-[15px] font-semibold">Tanış fotoğrafların</p>
      <p className="mt-1 text-[13px] text-mute">En fazla 3 fotoğraf. Başkaları kartında bunları kaydırarak görür.</p>
      <div className="mt-4">
        <PhotoSlots photos={photos} busy={busy} onBusy={setBusy} onChange={apply} />
      </div>
    </div>
  )
}

function PhotoSlots({
  photos,
  onChange,
  busy,
  onBusy,
}: {
  photos: string[]
  onChange: (next: string[]) => void | Promise<void>
  busy?: boolean
  onBusy: (busy: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const slotRef = useRef<number | null>(null)
  const toast = useUiStore((s) => s.toast)

  function open(slot: number | null) {
    if (busy) return
    slotRef.current = slot
    inputRef.current?.click()
  }

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    onBusy(true)
    try {
      const url = await uploadImageFile(file, 900, 0.72)
      const slot = slotRef.current
      const next = [...photos]
      if (slot != null && slot < next.length) next[slot] = url
      else if (next.length < MAX_MEET_PHOTOS) next.push(url)
      await onChange(next.slice(0, MAX_MEET_PHOTOS))
    } catch {
      toast('Fotoğraf yüklenemedi', 'err')
    } finally {
      onBusy(false)
      slotRef.current = null
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e)} />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: MAX_MEET_PHOTOS }, (_, i) => {
          const src = photos[i]
          return (
            <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#1a1a1a]">
              {src ? (
                <>
                  <button type="button" className="h-full w-full" onClick={() => open(i)} aria-label={`Fotoğraf ${i + 1} değiştir`}>
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                  <button
                    type="button"
                    className="absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/70"
                    onClick={() => {
                      if (busy) return
                      onBusy(true)
                      void Promise.resolve(onChange(photos.filter((_, j) => j !== i))).finally(() => onBusy(false))
                    }}
                    aria-label="Fotoğrafı sil"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="grid h-full w-full place-items-center border border-dashed border-white/20"
                  onClick={() => open(null)}
                  aria-label="Fotoğraf ekle"
                >
                  <Plus className="h-7 w-7 text-mute" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function CardDeck({ meId, onChange }: { meId: string; onChange: () => void }) {
  const [deck, setDeck] = useState(() => meetService.deck(meId))
  const [match, setMatch] = useState<User | null>(null)
  const toast = useUiStore((s) => s.toast)
  const current = deck[0]

  function apply(toId: string, liked: boolean) {
    const result = meetService.swipe(meId, toId, liked)
    setDeck((list) => list.filter((u) => u.id !== toId))
    if (result.match) {
      const other = userService.getById(toId)
      if (other) setMatch(other)
    }
    onChange()
  }

  function undo() {
    const last = meetService.lastSwipe(meId)
    if (!last) {
      toast('Geri alınacak kaydırma yok', 'info')
      return
    }
    if (!meetService.undoLast(meId)) return
    setDeck(meetService.deck(meId))
    onChange()
  }

  function resetPasses() {
    meetService.resetPasses(meId)
    setDeck(meetService.deck(meId))
    onChange()
  }

  if (!current) {
    return (
      <div className="px-4 py-10">
        <EmptyState title="Kart kalmadı" text="Geçtiklerini tekrar görebilirsin. Beğendiklerin durur." />
        <Button className="mt-4 w-full" variant="ghost" onClick={resetPasses}>
          <RotateCcw className="h-4 w-4" /> Geçtiklerini yenile
        </Button>
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      <SwipeCard key={current.id} meId={meId} user={current} onSwipe={(liked) => apply(current.id, liked)} />
      <div className="mt-5 flex items-end justify-center gap-6">
        <ActionFab label="Geç" onClick={() => apply(current.id, false)}>
          <X className="h-7 w-7 text-white" />
        </ActionFab>
        <ActionFab label="Geri" dim onClick={undo}>
          <Undo2 className="h-6 w-6 text-white" />
        </ActionFab>
        <ActionFab label="Beğen" hot onClick={() => apply(current.id, true)}>
          <Heart className="h-7 w-7 fill-ink" />
        </ActionFab>
      </div>
      {match ? <MatchModal meId={meId} other={match} onClose={() => setMatch(null)} /> : null}
    </div>
  )
}

function ActionFab({
  label,
  onClick,
  children,
  hot,
  dim,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  hot?: boolean
  dim?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        className={cx(
          'grid place-items-center rounded-full',
          hot ? 'h-16 w-16 bg-hot text-ink' : dim ? 'h-12 w-12 border border-white/15 bg-[#1f1f1f]' : 'h-14 w-14 border border-white/15 bg-[#262626]',
        )}
        aria-label={label}
      >
        {children}
      </button>
      <span className="text-[11px] text-mute">{label}</span>
    </div>
  )
}

function SwipeCard({
  meId,
  user,
  onSwipe,
}: {
  meId: string
  user: User
  onSwipe: (liked: boolean) => void
}) {
  const navigate = useNavigate()
  const photos = meetService.photos(user)
  const level = meetService.level(user)
  const common = meetService.commonFollowers(meId, user.id)
  const [photo, setPhoto] = useState(0)
  const [dx, setDx] = useState(0)
  const [held, setHeld] = useState(false)
  const startX = useRef<number | null>(null)
  const dxRef = useRef(0)
  const rotate = dx / 18
  const safePhoto = Math.min(photo, Math.max(0, photos.length - 1))

  function down(e: PointerEvent<HTMLDivElement>) {
    startX.current = e.clientX
    dxRef.current = 0
    setHeld(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (startX.current == null) return
    const next = e.clientX - startX.current
    dxRef.current = next
    setDx(next)
  }
  function up(e: PointerEvent<HTMLDivElement>) {
    if (startX.current == null) return
    const delta = dxRef.current
    const abs = Math.abs(delta)
    const rect = e.currentTarget.getBoundingClientRect()
    const tapX = e.clientX - rect.left
    const tapY = e.clientY - rect.top
    startX.current = null
    dxRef.current = 0
    setHeld(false)

    if (abs > 90) {
      onSwipe(delta > 0)
      return
    }
    if (photos.length > 1 && abs > 36) {
      if (delta < 0 && safePhoto < photos.length - 1) setPhoto(safePhoto + 1)
      else if (delta > 0 && safePhoto > 0) setPhoto(safePhoto - 1)
      setDx(0)
      return
    }
    if (abs < 12) {
      if (tapY > rect.height * 0.78) {
        navigate(`/u/${user.username}`)
      } else if (photos.length > 1) {
        if (tapX < rect.width * 0.4 && safePhoto > 0) setPhoto(safePhoto - 1)
        else if (tapX > rect.width * 0.6 && safePhoto < photos.length - 1) setPhoto(safePhoto + 1)
      } else {
        navigate(`/u/${user.username}`)
      }
    }
    setDx(0)
  }

  return (
    <div
      className="relative mx-auto h-[min(62vh,520px)] max-w-sm touch-none overflow-hidden rounded-[28px] bg-[#1a1a1a] select-none"
      style={{ transform: `translateX(${dx}px) rotate(${rotate}deg)`, transition: held ? 'none' : 'transform 180ms ease' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div className="absolute inset-0">
        <div
          className="flex h-full"
          style={{
            transform: `translateX(-${safePhoto * 100}%)`,
            transition: held ? 'none' : 'transform 220ms ease',
          }}
        >
          {photos.map((src, i) => (
            <img
              key={`${user.id}-${i}`}
              src={src}
              alt=""
              className="h-full w-full shrink-0 basis-full object-cover"
              draggable={false}
            />
          ))}
        </div>
      </div>
      {photos.length > 1 ? (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex gap-1">
          {photos.map((_, i) => (
            <span key={i} className={cx('h-0.5 flex-1 rounded-full', i === safePhoto ? 'bg-white' : 'bg-white/35')} />
          ))}
        </div>
      ) : null}
      <div
        className={cx(
          'absolute top-10 left-5 rounded-lg border-4 px-3 py-1 text-xl font-extrabold tracking-widest',
          dx > 30 ? 'border-hot text-hot opacity-100' : 'border-hot text-hot opacity-0',
        )}
      >
        BEĞEN
      </div>
      <div
        className={cx(
          'absolute top-10 right-5 rounded-lg border-4 px-3 py-1 text-xl font-extrabold tracking-widest',
          dx < -30 ? 'border-red-500 text-red-500 opacity-100' : 'border-red-500 text-red-500 opacity-0',
        )}
      >
        GEÇ
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-5 pb-5 pt-16">
        <p className="text-[26px] font-bold leading-tight">
          {user.name}
          {user.age ? `, ${user.age}` : ''}
        </p>
        <p className="text-[14px] text-white/70">@{user.username}</p>
        {user.bio ? <p className="mt-2 line-clamp-2 text-[14px] text-white/85">{user.bio}</p> : null}
        <p className="mt-2 text-[12px] text-white/70">
          Seviye {level.level} · {user.xp} XP
        </p>
        {common.length ? (
          <p className="mt-1 line-clamp-1 text-[12px] text-white/70">
            Ortak: {common.slice(0, 2).map((u) => u.name).join(', ')}
            {common.length > 2 ? ` +${common.length - 2}` : ''}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function face(user: User) {
  return meetService.photos(user)[0] ?? user.avatar
}

function LikesList({ meId, onChange }: { meId: string; onChange: () => void }) {
  const [match, setMatch] = useState<User | null>(null)
  const [tick, setTick] = useState(0)
  const people = meetService.incomingLikes(meId)
  void tick
  if (!people.length) {
    return (
      <div className="px-4 py-10">
        <EmptyState title="Henüz beğeni yok" text="Seni beğenenler burada durur. Kabul edersen eşleşirsiniz." />
      </div>
    )
  }
  return (
    <div className="space-y-3 px-4 py-4">
      <p className="text-[15px] font-semibold">Beni beğenenler</p>
      {people.map((u) => (
        <div key={u.id} className="rounded-3xl border border-line bg-panel p-4">
          <div className="flex items-center gap-3">
            <Link to={`/u/${u.username}`}>
              <Avatar src={face(u)} name={u.name} size={56} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {u.name}
                {u.age ? `, ${u.age}` : ''}
              </p>
              <p className="text-[13px] text-mute">Seni beğendi</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Link
              to={`/u/${u.username}`}
              className="flex h-9 items-center justify-center rounded-lg bg-[#262626] text-[12px] font-semibold"
            >
              Profili gör
            </Link>
            <button
              type="button"
              className="flex h-9 items-center justify-center rounded-lg bg-hot text-[12px] font-semibold text-ink"
              onClick={() => {
                const result = meetService.acceptLike(meId, u.id)
                if (result.match) setMatch(u)
                setTick((n) => n + 1)
                onChange()
              }}
            >
              Kabul et
            </button>
            <button
              type="button"
              className="flex h-9 items-center justify-center rounded-lg bg-[#262626] text-[12px] font-semibold"
              onClick={() => {
                meetService.rejectLike(meId, u.id)
                setTick((n) => n + 1)
                onChange()
              }}
            >
              Reddet
            </button>
          </div>
        </div>
      ))}
      {match ? <MatchModal meId={meId} other={match} onClose={() => setMatch(null)} /> : null}
    </div>
  )
}

function MatchModal({ meId, other, onClose }: { meId: string; other: User; onClose: () => void }) {
  const navigate = useNavigate()
  const me = userService.getById(meId)

  function message() {
    const conv = meetService.conversationWith(meId, other.id)
    navigate(`/messages/${conv.id}`)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-6">
      <div className="w-full max-w-sm rounded-[28px] border border-line bg-panel p-6 text-center">
        <p className="text-[22px] font-bold">Eşleştiniz</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <Avatar src={me ? face(me) : ''} name={me?.name ?? ''} size={72} />
          <Heart className="h-6 w-6 text-hot" />
          <Avatar src={face(other)} name={other.name} size={72} />
        </div>
        <p className="mt-4 text-sm text-mute">Sen ve {other.name} birbirinizi beğendiniz.</p>
        <Button className="mt-5 w-full" onClick={message}>
          <MessageCircle className="h-4 w-4" /> Mesaj gönder
        </Button>
        <Link
          to={`/u/${other.username}`}
          className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#262626] text-sm font-semibold"
        >
          <UserRound className="h-4 w-4" /> Profiline git
        </Link>
        <button type="button" onClick={onClose} className="mt-3 text-sm text-mute">
          Kaydırmaya devam
        </button>
      </div>
    </div>
  )
}

function MatchList({ meId, onChange }: { meId: string; onChange: () => void }) {
  const navigate = useNavigate()
  const rows = meetService.matchRows(meId)
  if (!rows.length) {
    return (
      <div className="px-4 py-10">
        <EmptyState title="Eşleşme yok" text="Sağa kaydır, karşılıklı beğeni gelince burada durur." />
      </div>
    )
  }
  return (
    <div className="divide-y divide-white/10">
      {rows.map(({ user: u, lastMessage, lastActive }) => (
        <div key={u.id} className="flex items-center gap-3 px-4 py-3">
          <Link to={`/u/${u.username}`}>
            <Avatar src={face(u)} name={u.name} size={52} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{u.name}</p>
            <p className="truncate text-[13px] text-mute">{lastMessage}</p>
            {lastActive ? <p className="text-[11px] text-mute">{lastActive}</p> : null}
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full bg-[#262626]"
            aria-label="Mesaj"
            onClick={() => navigate(`/messages/${meetService.conversationWith(meId, u.id).id}`)}
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="text-[11px] text-mute"
            onClick={() => {
              meetService.unmatch(meId, u.id)
              onChange()
            }}
          >
            Kaldır
          </button>
        </div>
      ))}
    </div>
  )
}
