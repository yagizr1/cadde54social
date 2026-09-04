import { Camera, CheckCheck, Search, SquarePen, Trash2, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from '../lib/nav'
import { BackButton } from '../components/layout/BackButton'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { useApp } from '../hooks/useApp'
import { useLongPress } from '../hooks/useLongPress'
import { timeAgo } from '../lib/utils'
import { messageService } from '../services/messageService'
import { settingsService } from '../services/settingsService'
import { userService } from '../services/userService'
import { useUiStore } from '../store/uiStore'
import type { User } from '../types'

function matches(q: string, ...parts: Array<string | undefined>) {
  const n = q.trim().toLowerCase()
  if (!n) return true
  return parts.some((p) => p?.toLowerCase().includes(n))
}

export function MessagesPage() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const selecting = selected.length > 0
  const convos = user ? messageService.list(user.id) : []
  const q = query.trim().toLowerCase()

  const rows = useMemo(() => {
    if (!user) return []
    return convos
      .map((c) => {
        const otherId = c.participantIds.find((id) => id !== user.id)
        const other = otherId ? userService.getById(otherId) : undefined
        const last = c.messages[c.messages.length - 1]
        if (!otherId) return null
        const unread = Boolean(
          last && last.senderId !== user.id && (c.lastRead?.[user.id] ?? 0) < last.createdAt,
        )
        return { c, otherId, other, last, unread }
      })
      .filter((row): row is NonNullable<typeof row> => {
        if (!row) return false
        if (!q) return true
        return matches(q, row.other?.username, row.other?.name, row.last?.text)
      })
  }, [convos, q, user])

  const people = useMemo(() => {
    if (!user || !q) return []
    const inInbox = new Set(
      convos.map((c) => c.participantIds.find((id) => id !== user.id)).filter(Boolean) as string[],
    )
    return userService
      .list()
      .filter(
        (u) =>
          u.id !== user.id &&
          !inInbox.has(u.id) &&
          settingsService.visibleTo(user.id, u.id) &&
          !settingsService.isBlocked(user.id, u.id) &&
          matches(q, u.username, u.name),
      )
      .slice(0, 12)
  }, [convos, q, user])

  if (!user) return null
  const meId = user.id

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  function remove() {
    if (selected.length === 0) return
    messageService.removeConversations(selected)
    toast(`${selected.length} sohbet silindi`)
    setSelected([])
    refresh()
  }

  function openNew(target: User) {
    try {
      const conv = messageService.withUser(meId, target.id)
      refresh()
      navigate(`/messages/${conv.id}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Sohbet açılamadı', 'err')
    }
  }

  return (
    <div className="mx-auto max-w-xl anim-page">
      <header className="sticky top-0 z-20 bg-ink">
        <div className="flex h-12 items-center gap-1 px-1">
          <BackButton to="/" />
          {selecting ? (
            <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold">{selected.length} seçili</h1>
          ) : (
            <h1 className="min-w-0 flex-1 truncate text-[22px] font-bold">Mesajlar</h1>
          )}
          {selecting ? (
            <div className="flex items-center">
              <button
                className="grid h-10 w-10 place-items-center"
                onClick={() => setSelected(rows.length === selected.length ? [] : rows.map((r) => r.c.id))}
                aria-label={rows.length === selected.length ? 'Seçimi bırak' : 'Tümünü seç'}
              >
                <CheckCheck className={`h-5 w-5 ${rows.length === selected.length && rows.length ? 'text-hot' : ''}`} />
              </button>
              <button className="grid h-10 w-10 place-items-center" onClick={() => setSelected([])} aria-label="İptal">
                <X className="h-5 w-5" />
              </button>
              <button className="grid h-10 w-10 place-items-center text-red-500" onClick={remove} aria-label="Sil">
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="grid h-11 w-11 place-items-center"
              aria-label="Yeni mesaj"
              onClick={() => {
                setSearching(true)
                searchRef.current?.focus()
              }}
            >
              <SquarePen className="h-[22px] w-[22px]" />
            </button>
          )}
        </div>
        {selecting ? null : (
          <div className="flex items-center gap-2 px-4 pb-2">
            <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl bg-[#262626] px-3">
              <Search className="h-4 w-4 shrink-0 text-[#a8a8a8]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearching(true)}
                placeholder="Ara"
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#a8a8a8]"
              />
              {query ? (
                <button
                  type="button"
                  className="grid h-5 w-5 place-items-center rounded-full bg-[#8e8e8e] text-black"
                  onClick={() => {
                    setQuery('')
                    searchRef.current?.focus()
                  }}
                  aria-label="Temizle"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </label>
            {searching ? (
              <button
                type="button"
                className="shrink-0 text-[15px] font-semibold"
                onClick={() => {
                  setQuery('')
                  setSearching(false)
                  searchRef.current?.blur()
                }}
              >
                İptal
              </button>
            ) : null}
          </div>
        )}
      </header>

      {q && people.length > 0 ? (
        <div className="pb-2">
          <p className="px-4 py-2 text-[14px] font-semibold">Hesaplar</p>
          {people.map((u) => (
            <button
              key={u.id}
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2 text-left"
              onClick={() => openNew(u)}
            >
              <Avatar src={u.avatar} name={u.name} size={44} />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{u.username}</p>
                <p className="truncate text-[13px] text-[#a8a8a8]">{u.name}</p>
              </div>
            </button>
          ))}
          {rows.length ? <p className="px-4 pt-3 pb-1 text-[14px] font-semibold">Mesajlar</p> : null}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title={q ? 'Sonuç yok' : 'Henüz sohbet yok'}
            text={q ? 'Başka bir ad dene veya bir hesap ara.' : 'Bir profili açıp mesaj gönder.'}
          />
        </div>
      ) : (
        <div>
          {rows.map(({ c, other, last, unread }) => (
            <ConvoRow
              key={c.id}
              id={c.id}
              selecting={selecting}
              checked={selected.includes(c.id)}
              onToggle={() => toggle(c.id)}
              username={other?.username ?? 'Kullanıcı'}
              name={other?.name ?? 'Kullanıcı'}
              avatar={other?.avatar ?? ''}
              here={other ? settingsService.isHereVisible(other.id, other.hereUntil, user.id) : false}
              preview={
                last
                  ? `${last.senderId === user.id ? 'Sen: ' : ''}${last.text || (last.image ? 'Fotoğraf' : 'Mesaj')}`
                  : 'Yeni sohbet'
              }
              time={last ? timeAgo(last.createdAt) : ''}
              unread={unread}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ConvoRow({
  id,
  selecting,
  checked,
  onToggle,
  username,
  name,
  avatar,
  here,
  preview,
  time,
  unread,
}: {
  id: string
  selecting: boolean
  checked: boolean
  onToggle: () => void
  username: string
  name: string
  avatar: string
  here: boolean
  preview: string
  time: string
  unread: boolean
}) {
  const navigate = useNavigate()
  const press = useLongPress(() => {
    if (!selecting) onToggle()
  })
  const { didLongPress, ...pressEvents } = press

  return (
    <div className={`flex items-center ${checked ? 'bg-white/[0.06]' : ''}`}>
      <button
        type="button"
        {...pressEvents}
        onClick={() => {
          if (didLongPress()) return
          if (selecting) onToggle()
          else navigate(`/messages/${id}`)
        }}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left"
      >
        {selecting ? (
          <span
            className={`grid h-6 w-6 place-items-center rounded-full border ${checked ? 'border-hot bg-hot text-ink' : 'border-white/40'}`}
          >
            {checked ? '✓' : ''}
          </span>
        ) : (
          <Avatar src={avatar} name={name} size={56} />
        )}
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[15px] ${unread ? 'font-semibold' : 'font-normal'}`}>{username}</p>
          <p className={`truncate text-[14px] ${unread ? 'font-medium text-white' : 'text-[#a8a8a8]'}`}>
            {here ? 'Cadde 54’te · ' : ''}
            {preview}
            {time ? ` · ${time}` : ''}
          </p>
        </div>
        {unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#3797f0]" /> : null}
      </button>
      {selecting ? null : (
        <button
          type="button"
          className="grid h-12 w-12 shrink-0 place-items-center text-[#a8a8a8]"
          aria-label="Kamera"
          onClick={() => navigate(`/messages/${id}`)}
        >
          <Camera className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}
