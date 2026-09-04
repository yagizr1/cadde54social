import { Camera, ChevronDown, ChevronLeft, ChevronRight, Copy, MapPin, Music2, Users, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useNavigate } from '../lib/nav'
import { useApp } from '../hooks/useApp'
import {
  clearCreateFiles,
  openCreatePicker,
  pickerAccept,
  startCreate,
  subscribeCreateFiles,
  type CreateTab,
} from '../lib/createPicker'
import { PLACES } from '../data/places'
import { uploadImageFile } from '../lib/uploadMedia'
import { cx, uid } from '../lib/utils'
import { mentionService } from '../services/mentionService'
import { boostService } from '../services/boostService'
import { postService } from '../services/postService'
import { premiumService } from '../services/premiumService'
import { reelsService } from '../services/reelsService'
import { settingsService } from '../services/settingsService'
import { storyService } from '../services/storyService'
import { userService } from '../services/userService'
import { useUiStore } from '../store/uiStore'
import { MentionField } from '../components/ui/MentionField'

type MediaItem = {
  id: string
  file: File
  url: string
  kind: 'image' | 'video'
}

const TABS: { id: CreateTab; label: string }[] = [
  { id: 'post', label: 'GÖNDERİ' },
  { id: 'story', label: 'STORY' },
  { id: 'reel', label: 'REELS' },
]

function tabFromPath(path: string): CreateTab {
  if (path.includes('/story')) return 'story'
  if (path.includes('/reel')) return 'reel'
  return 'post'
}

function filesToItems(files: File[]): MediaItem[] {
  return files.map((file) => ({
    id: uid('m'),
    file,
    url: URL.createObjectURL(file),
    kind: file.type.startsWith('video') ? 'video' : 'image',
  }))
}

function filterFiles(files: File[], tab: CreateTab): File[] {
  return files.filter((file) => {
    if (!file.type) return true
    return tab === 'reel' ? file.type.startsWith('video') : file.type.startsWith('image')
  })
}

function revokeAll(items: MediaItem[]): void {
  for (const item of items) URL.revokeObjectURL(item.url)
}

export function CreatePage() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const navigate = useNavigate()
  const route = useLocation()
  const tab = tabFromPath(route.pathname)
  const cameraRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'gallery' | 'compose'>('gallery')
  const [items, setItems] = useState<MediaItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [multi, setMulti] = useState(false)
  const [caption, setCaption] = useState('')
  const [music, setMusic] = useState('')
  const [location, setLocation] = useState('')
  const [taggedIds, setTaggedIds] = useState<string[]>([])
  const [audience, setAudience] = useState<'everyone' | 'followers'>('everyone')
  const [hideLikes, setHideLikes] = useState(false)
  const [commentsOff, setCommentsOff] = useState(false)
  const [boostOnShare, setBoostOnShare] = useState(false)
  const [altText, setAltText] = useState('')
  const [sheet, setSheet] = useState<'location' | 'tags' | 'audience' | null>(null)
  const [placeQuery, setPlaceQuery] = useState('')
  const [busy, setBusy] = useState(false)

  const active = items.find((i) => i.id === activeId) ?? items[0]
  const titles = { post: 'Yeni gönderi', story: 'Yeni story', reel: 'Yeni reel' }

  const applyFiles = (files: File[]) => {
    const filtered = filterFiles(files, tab)
    if (!filtered.length) {
      toast(tab === 'reel' ? 'Galeriden bir video seç' : 'Galeriden bir fotoğraf seç', 'err')
      return
    }
    const next = filesToItems(tab === 'post' ? filtered : filtered.slice(0, 1))
    setItems((prev) => {
      revokeAll(prev)
      return next
    })
    setActiveId(next[0]?.id ?? null)
    setSelectedIds(next.map((i) => i.id))
    setStep('gallery')
  }

  const prevTab = useRef(tab)
  useEffect(() => {
    if (prevTab.current === tab) return
    prevTab.current = tab
    setItems((prev) => {
      revokeAll(prev)
      return []
    })
    setActiveId(null)
    setSelectedIds([])
    setMulti(false)
    setCaption('')
    setLocation('')
    setTaggedIds([])
    setAudience('everyone')
    setHideLikes(false)
    setCommentsOff(false)
    setBoostOnShare(false)
    setAltText('')
    setSheet(null)
    setStep('gallery')
  }, [tab])

  useEffect(
    () =>
      subscribeCreateFiles((payload) => {
        if (payload.tab !== tab) return
        applyFiles(payload.files)
      }),
    [tab],
  )

  const selectedIndex = useMemo(() => {
    const map = new Map(selectedIds.map((id, i) => [id, i + 1]))
    return map
  }, [selectedIds])

  if (!user) return null

  const close = () => {
    clearCreateFiles()
    navigate('/')
  }

  const tapItem = (item: MediaItem) => {
    setActiveId(item.id)
    if (!multi || tab !== 'post') {
      setSelectedIds([item.id])
      return
    }
    setSelectedIds((ids) =>
      ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id],
    )
  }

  const goNext = () => {
    if (!active) {
      openCreatePicker(tab)
      return
    }
    setStep('compose')
  }

  const share = async () => {
    if (!active) {
      toast(tab === 'reel' ? 'Video seç' : 'Fotoğraf seç', 'err')
      return
    }
    setBusy(true)
    try {
      if (tab === 'post') {
        if (active.kind !== 'image') {
          toast('Gönderi için fotoğraf seç', 'err')
          return
        }
        const image = await uploadImageFile(active.file)
        const post = postService.create(user.id, image, caption.trim() || 'Cadde 54', {
          location: location.trim() || undefined,
          altText: altText.trim() || undefined,
          hideLikes,
          commentsOff,
          taggedIds,
          audience,
        })
        mentionService.notify(user.id, caption, {
          label: 'bir gönderide senden bahsetti',
          href: '/',
          image,
          extraIds: taggedIds,
        })
        if (boostOnShare) {
          try {
            await boostService.setPost(post.id, user.id, true)
            toast('Gönderi paylaşıldı ve öne çıkarıldı')
          } catch (err) {
            toast(err instanceof Error ? err.message : 'Gönderi paylaşıldı, öne çıkarılamadı', 'err')
          }
        } else {
          toast('Gönderi paylaşıldı')
        }
        clearCreateFiles()
        refresh()
        navigate('/')
        return
      }
      if (tab === 'story') {
        if (active.kind !== 'image') {
          toast('Story için fotoğraf seç', 'err')
          return
        }
        const image = await uploadImageFile(active.file, 1200)
        storyService.create(user.id, image, taggedIds)
        mentionService.notify(user.id, '', {
          label: 'bir hikayede senden bahsetti',
          href: '/',
          image,
          extraIds: taggedIds,
        })
        toast('Story yayınlandı')
        clearCreateFiles()
        refresh()
        navigate('/')
        return
      }
      if (active.kind !== 'video') {
        toast('Reels için video seç', 'err')
        return
      }
      const reel = await reelsService.create(user.id, active.file, caption.trim(), music.trim())
      mentionService.notify(user.id, caption, {
        label: 'bir Reels’te senden bahsetti',
        href: `/reels/${reel.id}`,
        extraIds: taggedIds,
      })
      if (boostOnShare) {
        try {
          await boostService.setReel(reel.id, user.id, true)
          toast('Reels paylaşıldı ve öne çıkarıldı')
        } catch (err) {
          toast(err instanceof Error ? err.message : 'Reels paylaşıldı, öne çıkarılamadı', 'err')
        }
      } else {
        toast('Reels paylaşıldı')
      }
      clearCreateFiles()
      refresh()
      navigate('/reels')
    } catch {
      toast('Paylaşılamadı', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-black">
        {step === 'gallery' ? (
          <>
            <header className="grid h-12 shrink-0 grid-cols-[48px_1fr_72px] items-center px-1">
              <button type="button" onClick={close} className="grid h-12 w-12 place-items-center" aria-label="Kapat">
                <X className="h-7 w-7" />
              </button>
              <h1 className="text-center text-[16px] font-semibold">{titles[tab]}</h1>
              <button
                type="button"
                onClick={goNext}
                className="pr-3 text-right text-[16px] font-semibold text-hot"
              >
                İleri
              </button>
            </header>

            <button
              type="button"
              onClick={() => {
                if (!active) openCreatePicker(tab)
              }}
              className="relative aspect-square w-full shrink-0 overflow-hidden bg-neutral-950"
            >
              {active ? (
                active.kind === 'video' ? (
                  <video src={active.url} className="h-full w-full object-cover" autoPlay muted loop playsInline />
                ) : (
                  <img src={active.url} alt="" className="h-full w-full object-cover" />
                )
              ) : (
                <span className="grid h-full place-items-center px-8 text-center text-sm text-neutral-400">
                  Galerinden seçmek için dokun
                </span>
              )}
            </button>

            <div className="flex h-12 shrink-0 items-center justify-between px-3">
              <button
                type="button"
                onClick={() => openCreatePicker(tab)}
                className="flex items-center gap-1 text-[15px] font-semibold"
              >
                Son öğeler
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                {tab === 'post' ? (
                  <button
                    type="button"
                    onClick={() => setMulti((v) => !v)}
                    className={cx(
                      'grid h-8 w-8 place-items-center rounded-full',
                      multi ? 'bg-hot text-ink' : 'bg-white/15',
                    )}
                    aria-label="Birden fazla seç"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/15"
                  aria-label="Kamera"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
              {items.length ? (
                <div className="grid grid-cols-4 gap-[2px] bg-black">
                  {items.map((item) => {
                    const on = selectedIds.includes(item.id)
                    const num = selectedIndex.get(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => tapItem(item)}
                        className="relative aspect-square overflow-hidden bg-neutral-900"
                      >
                        {item.kind === 'video' ? (
                          <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                        ) : (
                          <img src={item.url} alt="" className="h-full w-full object-cover" />
                        )}
                        <span
                          className={cx(
                            'absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full border text-[10px] font-bold',
                            on ? 'border-hot bg-hot text-ink' : 'border-white/80 bg-black/30',
                          )}
                        >
                          {multi && on ? num : ''}
                        </span>
                        {item.id === active?.id ? <span className="absolute inset-0 ring-2 ring-inset ring-white" /> : null}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openCreatePicker(tab)}
                  className="grid h-full min-h-[40vh] w-full place-items-center text-sm text-neutral-500"
                >
                  Galerini aç
                </button>
              )}
            </div>

            <nav className="shrink-0 border-t border-white/10 bg-black px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-around">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => startCreate(navigate, t.id)}
                    className={cx(
                      'min-w-[88px] rounded-full px-3 py-2 text-[13px] font-semibold tracking-wide',
                      tab === t.id ? 'bg-neutral-800 text-white' : 'text-neutral-500',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </nav>
          </>
        ) : (
          <>
            <header className="grid h-12 shrink-0 grid-cols-[48px_1fr_80px] items-center px-1">
              <button type="button" onClick={() => setStep('gallery')} className="grid h-12 w-12 place-items-center" aria-label="Geri">
                <ChevronLeft className="h-7 w-7" />
              </button>
              <h1 className="text-center text-[16px] font-semibold">{titles[tab]}</h1>
              <button
                type="button"
                disabled={busy}
                onClick={() => void share()}
                className="pr-3 text-right text-[16px] font-semibold text-hot disabled:opacity-50"
              >
                {busy ? '...' : 'Paylaş'}
              </button>
            </header>
            <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
              <div className="flex gap-3 px-3 py-3">
                <div className="h-[84px] w-[84px] shrink-0 overflow-hidden rounded-md bg-neutral-900">
                  {active?.kind === 'video' ? (
                    <video src={active.url} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    <img src={active?.url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                {tab !== 'story' ? (
                  <MentionField
                    multiline
                    value={caption}
                    onChange={setCaption}
                    placeholder="Açıklama yaz...  @ile bahset"
                    className="relative min-h-[84px] min-w-0 flex-1"
                    inputClassName="min-h-[84px] w-full resize-none bg-transparent py-1 text-[15px] outline-none placeholder:text-neutral-500"
                  />
                ) : (
                  <p className="flex-1 self-center text-sm text-neutral-400">24 saat sonra kaybolur. Kişilerden bahset.</p>
                )}
              </div>

              <ComposeRow
                icon={<Users className="h-5 w-5" />}
                label={tab === 'story' ? 'Kişilerden bahset' : 'Kişileri etiketle'}
                value={taggedIds.length ? `${taggedIds.length} kişi` : ''}
                onClick={() => setSheet('tags')}
              />
              {tab !== 'story' ? (
                <>
                  <ComposeRow
                    icon={<MapPin className="h-5 w-5" />}
                    label="Konum ekle"
                    value={location}
                    onClick={() => setSheet('location')}
                  />
                  {tab === 'reel' ? (
                    <div className="border-t border-white/10 px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Music2 className="h-5 w-5" />
                        <input
                          value={music}
                          onChange={(e) => setMusic(e.target.value)}
                          placeholder="Ses etiketi (isteğe bağlı)"
                          className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-white"
                        />
                      </div>
                      <p className="mt-1 pl-8 text-[12px] text-mute">Videoya müzik eklenmez, yalnızca etiket yazılır.</p>
                    </div>
                  ) : null}
                  <ComposeRow
                    icon={null}
                    label="Kitle"
                    value={audience === 'everyone' ? 'Herkes' : 'Takipçiler'}
                    onClick={() => setSheet('audience')}
                  />
                  <div className="mt-4 border-t border-white/10 px-4 py-4">
                    <p className="mb-3 text-[13px] font-semibold text-mute">Gelişmiş ayarlar</p>
                    <div className="flex items-center justify-between gap-3 py-2">
                      <div>
                        <p className="text-[15px]">Öne çıkar</p>
                        <p className="text-[12px] text-mute">
                          {premiumService.isActive(user)
                            ? 'Paylaşınca 24 saat Keşfet ve akışta önde durur.'
                            : 'Premium ile 24 saat öne çıkar.'}
                        </p>
                      </div>
                      <Toggle
                        on={boostOnShare}
                        onChange={(next) => {
                          if (next && !premiumService.isActive(user)) {
                            navigate('/premium')
                            return
                          }
                          setBoostOnShare(next)
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2">
                      <p className="text-[15px]">Beğeni sayısını gizle</p>
                      <Toggle on={hideLikes} onChange={setHideLikes} />
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2">
                      <p className="text-[15px]">Yorumları kapat</p>
                      <Toggle on={commentsOff} onChange={setCommentsOff} />
                    </div>
                    <input
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Alternatif metin ekle"
                      className="mt-2 w-full bg-transparent py-2 text-[15px] outline-none placeholder:text-mute"
                    />
                  </div>
                </>
              ) : null}
            </div>

            {sheet === 'location' ? (
              <PickerSheet title="Konum ekle" onClose={() => { setSheet(null); setPlaceQuery('') }}>
                <input
                  value={placeQuery}
                  onChange={(e) => setPlaceQuery(e.target.value)}
                  placeholder="Konum ara"
                  className="mb-3 w-full rounded-xl bg-panel px-3 py-2.5 text-sm outline-none"
                />
                {location ? (
                  <button
                    type="button"
                    onClick={() => { setLocation(''); setSheet(null) }}
                    className="mb-2 w-full rounded-xl px-3 py-2 text-left text-sm text-hot"
                  >
                    Konumu kaldır
                  </button>
                ) : null}
                {PLACES.filter((p) => p.toLowerCase().includes(placeQuery.trim().toLowerCase())).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setLocation(p); setSheet(null); setPlaceQuery('') }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-panel"
                  >
                    <MapPin className="h-4 w-4 text-hot" />
                    <span className="text-sm">{p}</span>
                    {location === p ? <span className="ml-auto text-xs text-hot">Seçili</span> : null}
                  </button>
                ))}
              </PickerSheet>
            ) : null}

            {sheet === 'tags' ? (
              <PickerSheet title={tab === 'story' ? 'Kişilerden bahset' : 'Kişileri etiketle'} onClose={() => setSheet(null)}>
                {userService.list().filter((u) => u.id !== user.id && settingsService.visibleTo(user.id, u.id)).map((u) => {
                  const on = taggedIds.includes(u.id)
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() =>
                        setTaggedIds((ids) => (on ? ids.filter((id) => id !== u.id) : [...ids, u.id]))
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-panel"
                    >
                      <img src={u.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{u.username}</p>
                        <p className="truncate text-xs text-mute">{u.name}</p>
                      </div>
                      <span className={cx('h-5 w-5 rounded-full border-2', on ? 'border-hot bg-hot' : 'border-mute')} />
                    </button>
                  )
                })}
              </PickerSheet>
            ) : null}

            {sheet === 'audience' ? (
              <PickerSheet title="Kitle" onClose={() => setSheet(null)}>
                {([
                  ['everyone', 'Herkes'],
                  ['followers', 'Takipçiler'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setAudience(id); setSheet(null) }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-panel"
                  >
                    <span className="text-sm">{label}</span>
                    {audience === id ? <span className="h-3 w-3 rounded-full bg-hot" /> : null}
                  </button>
                ))}
              </PickerSheet>
            ) : null}
          </>
        )}
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept={pickerAccept(tab)}
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          applyFiles(files)
        }}
      />
    </div>
  )
}

function ComposeRow({
  icon,
  label,
  value,
  onClick,
}: {
  icon: ReactNode
  label: string
  value?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-t border-white/10 px-4 py-3.5 text-left"
    >
      {icon}
      <span className="flex-1 text-[15px]">{label}</span>
      {value ? <span className="max-w-[40%] truncate text-sm text-mute">{value}</span> : null}
      <ChevronRight className="h-5 w-5 text-mute" />
    </button>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={cx('relative h-7 w-12 rounded-full transition', on ? 'bg-hot' : 'bg-line')}
    >
      <span className={cx('absolute top-1 h-5 w-5 rounded-full bg-white transition', on ? 'left-6' : 'left-1')} />
    </button>
  )
}

function PickerSheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-black">
      <header className="grid h-12 shrink-0 grid-cols-[48px_1fr_48px] items-center">
        <button type="button" onClick={onClose} className="grid h-12 w-12 place-items-center" aria-label="Geri">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="text-center text-[16px] font-semibold">{title}</h2>
        <span />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">{children}</div>
    </div>
  )
}
