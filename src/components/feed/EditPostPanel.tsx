import { ChevronLeft, ChevronRight, MapPin, Users, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PLACES } from '../../data/places'
import { cx } from '../../lib/utils'
import { mentionService } from '../../services/mentionService'
import { postService } from '../../services/postService'
import { settingsService } from '../../services/settingsService'
import { userService } from '../../services/userService'
import { useUiStore } from '../../store/uiStore'
import type { Post } from '../../types'
import { MentionField } from '../ui/MentionField'

export function EditPostPanel({
  open,
  post,
  meId,
  onClose,
  onChange,
}: {
  open: boolean
  post: Post
  meId: string
  onClose: () => void
  onChange: () => void
}) {
  const toast = useUiStore((s) => s.toast)
  const [caption, setCaption] = useState(post.caption)
  const [location, setLocation] = useState(post.location ?? '')
  const [taggedIds, setTaggedIds] = useState<string[]>(post.taggedIds ?? [])
  const [altText, setAltText] = useState(post.altText ?? '')
  const [sheet, setSheet] = useState<'location' | 'tags' | 'alt' | null>(null)
  const [placeQuery, setPlaceQuery] = useState('')

  useEffect(() => {
    if (!open) return
    setCaption(post.caption)
    setLocation(post.location ?? '')
    setTaggedIds(post.taggedIds ?? [])
    setAltText(post.altText ?? '')
    setSheet(null)
    setPlaceQuery('')
  }, [open, post])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  async function save() {
    const next = caption.trim()
    await postService.update(post.id, meId, {
      caption: next,
      location: location.trim(),
      altText: altText.trim(),
      taggedIds,
    })
    mentionService.notify(meId, next, {
      label: 'bir gönderide senden bahsetti',
      href: `/p/${post.id}`,
      image: post.image,
      extraIds: taggedIds,
    })
    toast('Gönderi güncellendi')
    onChange()
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] bg-black">
      <div className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-black">
        <header className="grid h-12 shrink-0 grid-cols-[48px_1fr_64px] items-center border-b border-white/10">
          <button type="button" onClick={onClose} className="grid h-12 w-12 place-items-center" aria-label="Kapat">
            <X className="h-6 w-6" />
          </button>
          <h1 className="text-center text-[16px] font-semibold">Düzenle</h1>
          <button type="button" onClick={save} className="pr-3 text-right text-[16px] font-semibold text-hot">
            Bitti
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <div className="flex gap-3 px-3 py-3">
            <div className="h-[84px] w-[84px] shrink-0 overflow-hidden rounded-md bg-neutral-900">
              <img src={post.image} alt="" className="h-full w-full object-cover" />
            </div>
            <MentionField
              multiline
              value={caption}
              onChange={setCaption}
              placeholder="Açıklama yaz..."
              className="relative min-h-[84px] min-w-0 flex-1"
              inputClassName="min-h-[84px] w-full resize-none bg-transparent py-1 text-[15px] outline-none placeholder:text-neutral-500"
            />
          </div>

          <Row
            icon={<Users className="h-5 w-5" />}
            label="Kişileri etiketle"
            value={taggedIds.length ? `${taggedIds.length} kişi` : ''}
            onClick={() => setSheet('tags')}
          />
          <Row
            icon={<MapPin className="h-5 w-5" />}
            label="Konum ekle"
            value={location}
            onClick={() => setSheet('location')}
          />
          <Row
            icon={null}
            label="Alternatif metin"
            value={altText}
            onClick={() => setSheet('alt')}
          />
        </div>

        {sheet === 'location' ? (
          <SubSheet
            title="Konum ekle"
            onClose={() => {
              setSheet(null)
              setPlaceQuery('')
            }}
          >
            <input
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              placeholder="Konum ara"
              className="mb-3 w-full rounded-xl bg-panel px-3 py-2.5 text-sm outline-none"
            />
            {location ? (
              <button
                type="button"
                onClick={() => {
                  setLocation('')
                  setSheet(null)
                }}
                className="mb-2 w-full rounded-xl px-3 py-2 text-left text-sm text-hot"
              >
                Konumu kaldır
              </button>
            ) : null}
            {PLACES.filter((p) => p.toLowerCase().includes(placeQuery.trim().toLowerCase())).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setLocation(p)
                  setSheet(null)
                  setPlaceQuery('')
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-panel"
              >
                <MapPin className="h-4 w-4 text-hot" />
                <span className="text-sm">{p}</span>
                {location === p ? <span className="ml-auto text-xs text-hot">Seçili</span> : null}
              </button>
            ))}
          </SubSheet>
        ) : null}

        {sheet === 'tags' ? (
          <SubSheet title="Kişileri etiketle" onClose={() => setSheet(null)}>
            {userService
              .list()
              .filter((u) => u.id !== meId && settingsService.visibleTo(meId, u.id))
              .map((u) => {
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
          </SubSheet>
        ) : null}

        {sheet === 'alt' ? (
          <SubSheet title="Alternatif metin" onClose={() => setSheet(null)}>
            <textarea
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Fotoğrafı anlat"
              className="min-h-32 w-full rounded-xl bg-panel px-3 py-3 text-sm outline-none"
            />
          </SubSheet>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

function Row({
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

function SubSheet({
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
