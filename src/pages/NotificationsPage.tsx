import { CheckCheck, Trash2, X } from 'lucide-react'
import { useLayoutEffect, useMemo, useState } from 'react'
import { Link } from '../lib/nav'
import { BackButton } from '../components/layout/BackButton'
import { Avatar } from '../components/ui/Avatar'
import { useApp } from '../hooks/useApp'
import { useLongPress } from '../hooks/useLongPress'
import { cx, dayKey, monthKey } from '../lib/utils'
import { notificationService } from '../services/notificationService'
import { postService } from '../services/postService'
import { userService } from '../services/userService'
import { useUiStore } from '../store/uiStore'
import type { AppNotification, User } from '../types'

const SECTIONS = ['Bugün', 'Bu hafta', 'Bu ay', 'Daha eski'] as const

function igTime(ts: number): string {
  const min = Math.floor((Date.now() - ts) / 60_000)
  if (min < 1) return 'şimdi'
  if (min < 60) return `${min}dk`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}g`
  if (day < 30) return `${Math.floor(day / 7)}h`
  return `${Math.floor(day / 30)}ay`
}

function sectionOf(ts: number): (typeof SECTIONS)[number] {
  const today = dayKey()
  const key = dayKey(ts)
  if (key === today) return 'Bugün'
  const a = new Date(`${today}T00:00:00`)
  const b = new Date(`${key}T00:00:00`)
  const days = Math.round((a.getTime() - b.getTime()) / 86_400_000)
  if (days > 0 && days < 7) return 'Bu hafta'
  if (monthKey(ts) === monthKey()) return 'Bu ay'
  return 'Daha eski'
}

function actionText(n: AppNotification, actor?: User): string {
  let text = n.text.trim()
  if (actor) {
    text = text.replace(new RegExp(`^@?${actor.username}\\s+`, 'i'), '')
  }
  return text
}

export function NotificationsPage() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const [selected, setSelected] = useState<string[]>([])
  const [picking, setPicking] = useState(false)
  const items = user ? notificationService.list(user.id) : []
  const selecting = picking || selected.length > 0

  useLayoutEffect(() => {
    if (!user) return
    if (!notificationService.unreadCount(user.id)) return
    notificationService.markAllRead(user.id)
    refresh()
  }, [refresh, user])

  const groups = useMemo(() => {
    const map = new Map<(typeof SECTIONS)[number], AppNotification[]>()
    for (const label of SECTIONS) map.set(label, [])
    for (const n of items) map.get(sectionOf(n.createdAt))?.push(n)
    return SECTIONS.map((label) => ({ label, items: map.get(label) ?? [] })).filter((g) => g.items.length)
  }, [items])

  if (!user) return null

  const ownThumb = postService.byUser(user.id)[0]?.image
  const allIds = items.map((n) => n.id)

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  function remove() {
    if (selected.length === 0) return
    notificationService.remove(selected)
    toast(selected.length === 1 ? 'Bildirim silindi' : `${selected.length} bildirim silindi`)
    setSelected([])
    setPicking(false)
    refresh()
  }

  function preview(n: AppNotification): string | undefined {
    if (n.image) return n.image
    if (n.type === 'like' || n.type === 'comment') return ownThumb
    if (n.type === 'meet_like' || n.type === 'match') return n.image
    return undefined
  }

  return (
    <div className="mx-auto max-w-xl anim-page">
      <header className="sticky top-0 z-30 flex items-center gap-1 border-b border-line/70 bg-ink/80 px-1 py-1.5 backdrop-blur-xl">
        {selecting ? null : <BackButton className="lg:hidden" />}
        {selecting ? (
          <h1 className="min-w-0 flex-1 truncate px-2 text-[20px] font-bold">
            {selected.length ? `${selected.length} seçili` : 'Seç'}
          </h1>
        ) : (
          <h1 className="min-w-0 flex-1 px-2 text-[22px] font-bold">Bildirimler</h1>
        )}
        {items.length === 0 ? null : selecting ? (
          <div className="flex items-center">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center"
              onClick={() => setSelected(allIds.length === selected.length ? [] : allIds)}
              aria-label={allIds.length === selected.length ? 'Seçimi bırak' : 'Tümünü seç'}
            >
              <CheckCheck className={`h-5 w-5 ${allIds.length === selected.length ? 'text-hot' : ''}`} />
            </button>
            <button type="button" className="grid h-10 w-10 place-items-center" onClick={() => { setSelected([]); setPicking(false) }} aria-label="İptal">
              <X className="h-5 w-5" />
            </button>
            <button type="button" className="grid h-10 w-10 place-items-center text-red-500 disabled:opacity-40" onClick={remove} disabled={selected.length === 0} aria-label="Sil">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="grid h-10 w-10 place-items-center"
            aria-label="Bildirim sil"
            onClick={() => setPicking(true)}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <p className="px-6 py-20 text-center text-sm text-mute">Beğeni, yorum ve takipler burada görünür.</p>
      ) : (
        <div className="pb-4">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="px-4 pt-4 pb-1 text-[16px] font-semibold">{group.label}</h2>
              {group.items.map((n) => {
                const actor = n.actorId ? userService.getById(n.actorId) : undefined
                return (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    actor={actor}
                    user={user}
                    selecting={selecting}
                    checked={selected.includes(n.id)}
                    thumb={preview(n)}
                    onToggle={() => toggle(n.id)}
                    onFollowChange={refresh}
                  />
                )
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationRow({
  n,
  actor,
  user,
  selecting,
  checked,
  thumb,
  onToggle,
  onFollowChange,
}: {
  n: AppNotification
  actor?: User
  user: User
  selecting: boolean
  checked: boolean
  thumb?: string
  onToggle: () => void
  onFollowChange: () => void
}) {
  const following = Boolean(actor && user.following.includes(actor.id))
  const profile = actor ? `/u/${actor.username}` : '/'
  const content = n.href && n.href !== '/' && n.href !== profile ? n.href : profile
  const press = useLongPress(() => {
    if (!selecting) onToggle()
  })
  const { didLongPress, ...pressEvents } = press

  return (
    <div
      className={cx('flex items-center gap-3 px-4 py-2.5', checked ? 'bg-white/[0.06]' : !n.read ? 'bg-white/[0.04]' : '')}
      {...pressEvents}
      onClick={() => {
        if (didLongPress()) return
        if (selecting) onToggle()
      }}
    >
      {selecting ? (
        <span
          className={cx(
            'grid h-6 w-6 shrink-0 place-items-center rounded-full border',
            checked ? 'border-hot bg-hot text-ink' : 'border-white/40',
          )}
        >
          {checked ? '✓' : ''}
        </span>
      ) : actor ? (
        <Link to={profile} className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <Avatar src={actor.avatar} name={actor.name} size={44} />
        </Link>
      ) : (
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-panel text-sm font-bold text-hot">54</div>
      )}
      <p className="min-w-0 flex-1 text-[14px] leading-snug">
        {actor ? (
          <Link
            to={profile}
            className="font-semibold"
            onClick={(e) => {
              if (selecting) e.preventDefault()
              e.stopPropagation()
            }}
          >
            {actor.username}{' '}
          </Link>
        ) : null}
        {selecting ? (
          <span>
            {actionText(n, actor)} <span className="text-mute">{igTime(n.createdAt)}</span>
          </span>
        ) : (
          <Link to={content} onClick={(e) => e.stopPropagation()}>
            {actionText(n, actor)} <span className="text-mute">{igTime(n.createdAt)}</span>
          </Link>
        )}
      </p>
      {selecting ? null : n.type === 'follow' && actor ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (following) userService.unfollow(user.id, actor.id)
            else userService.follow(user.id, actor.id)
            onFollowChange()
          }}
          className={cx(
            'shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold',
            following ? 'bg-panel' : 'bg-hot text-ink',
          )}
        >
          {following ? 'Takiptesin' : 'Takip et'}
        </button>
      ) : thumb ? (
        <Link to={content} className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <img src={thumb} alt="" className="h-11 w-11 rounded-md object-cover" />
        </Link>
      ) : null}
    </div>
  )
}
