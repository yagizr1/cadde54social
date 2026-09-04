import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { adminService } from '../../services/adminService'
import { getItem } from '../../services/storage'
import { userService } from '../../services/userService'
import { useApp } from '../../hooks/useApp'
import { useUiStore } from '../../store/uiStore'
import { timeAgo } from '../../lib/utils'
import { AdminShell } from './AdminLayout'
import type { Confession, Conversation, Meetup, Post, Reel, Story } from '../../types'

type Tab = 'posts' | 'stories' | 'reels' | 'confessions' | 'meetups' | 'chats'

export function AdminContent() {
  const { refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const [tab, setTab] = useState<Tab>('posts')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const posts = getItem<Post[]>('posts', [])
  const stories = getItem<Story[]>('stories', [])
  const reels = getItem<Reel[]>('reels', [])
  const confessions = getItem<Confession[]>('confessions', [])
  const meetups = getItem<Meetup[]>('meetups', [])
  const chats = getItem<Conversation[]>('conversations', [])
  const needle = q.trim().toLowerCase()

  function handleOf(userId: string) {
    return userService.getById(userId)?.username ?? 'silinmiş'
  }

  async function remove(action: string, id: string) {
    if (!window.confirm('Silinsin mi?')) return
    setBusy(id)
    try {
      await adminService.act(action, { id })
      await refresh()
      toast('Silindi')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Silinemedi', 'err')
    } finally {
      setBusy(null)
    }
  }

  const tabs: [Tab, string, number][] = [
    ['posts', 'Gönderi', posts.length],
    ['stories', 'Hikâye', stories.length],
    ['reels', 'Reels', reels.length],
    ['confessions', 'İtiraf', confessions.length],
    ['meetups', 'Buluşma', meetups.length],
    ['chats', 'Sohbet', chats.length],
  ]

  return (
    <AdminShell title="İçerik">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ara"
        className="mb-3 w-full max-w-md rounded-lg border border-line bg-panel px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-1">
        {tabs.map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${tab === id ? 'bg-hot text-ink' : 'bg-panel text-mute'}`}
          >
            {label} ({n})
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {tab === 'posts'
          ? posts
              .filter(
                (p) =>
                  !needle ||
                  p.caption.toLowerCase().includes(needle) ||
                  handleOf(p.userId).includes(needle),
              )
              .map((p) => (
                <Row
                  key={p.id}
                  title={`@${handleOf(p.userId)}`}
                  text={p.caption || '—'}
                  meta={timeAgo(p.createdAt)}
                  image={p.image}
                  busy={busy === p.id}
                  onDelete={() => void remove('admin.deletePost', p.id)}
                />
              ))
          : null}
        {tab === 'stories'
          ? stories
              .filter((s) => !needle || handleOf(s.userId).includes(needle))
              .map((s) => (
                <Row
                  key={s.id}
                  title={`@${handleOf(s.userId)}`}
                  text={s.expiresAt > Date.now() ? 'Aktif' : 'Süresi dolmuş'}
                  meta={timeAgo(s.createdAt)}
                  image={s.image}
                  busy={busy === s.id}
                  onDelete={() => void remove('admin.deleteStory', s.id)}
                />
              ))
          : null}
        {tab === 'reels'
          ? reels
              .filter(
                (r) =>
                  !needle ||
                  r.caption.toLowerCase().includes(needle) ||
                  handleOf(r.userId).includes(needle),
              )
              .map((r) => (
                <Row
                  key={r.id}
                  title={`@${handleOf(r.userId)}`}
                  text={r.caption || r.music || '—'}
                  meta={timeAgo(r.createdAt)}
                  busy={busy === r.id}
                  onDelete={() => void remove('admin.deleteReel', r.id)}
                />
              ))
          : null}
        {tab === 'confessions'
          ? confessions
              .filter((c) => !needle || c.content.toLowerCase().includes(needle))
              .map((c) => (
                <Row
                  key={c.id}
                  title="İtiraf"
                  text={c.content}
                  meta={`${c.reports?.length ?? 0} şikayet`}
                  busy={busy === c.id}
                  onDelete={() => void remove('admin.deleteConfession', c.id)}
                />
              ))
          : null}
        {tab === 'meetups'
          ? meetups
              .filter(
                (m) =>
                  !needle ||
                  m.title.toLowerCase().includes(needle) ||
                  handleOf(m.creatorId).includes(needle),
              )
              .map((m) => (
                <Row
                  key={m.id}
                  title={m.title}
                  text={`@${handleOf(m.creatorId)} · ${m.locationName} · ${m.date} ${m.time}`}
                  meta={m.status}
                  busy={busy === m.id}
                  onDelete={() => void remove('admin.deleteMeetup', m.id)}
                />
              ))
          : null}
        {tab === 'chats'
          ? chats
              .filter((c) => {
                if (!needle) return true
                const names = c.participantIds.map((id) => handleOf(id)).join(' ')
                const last = c.messages.at(-1)?.text ?? ''
                return names.includes(needle) || last.toLowerCase().includes(needle)
              })
              .map((c) => {
                const last = c.messages.at(-1)
                return (
                  <Row
                    key={c.id}
                    title={c.participantIds.map((id) => `@${handleOf(id)}`).join(' · ')}
                    text={last?.text || (last?.image || last?.video ? 'Medya' : '—')}
                    meta={`${c.messages.length} mesaj`}
                    busy={busy === c.id}
                    onDelete={() => void remove('admin.deleteConversation', c.id)}
                  />
                )
              })
          : null}
      </div>
    </AdminShell>
  )
}

function Row({
  title,
  text,
  meta,
  image,
  busy,
  onDelete,
}: {
  title: string
  text: string
  meta: string
  image?: string
  busy: boolean
  onDelete: () => void
}) {
  return (
    <article className="flex items-start gap-3 rounded-lg border border-line bg-panel p-3">
      {image ? <img src={image} alt="" className="h-14 w-14 rounded-md object-cover" /> : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="line-clamp-2 text-sm text-mute">{text}</p>
        <p className="mt-1 text-xs text-mute">{meta}</p>
      </div>
      <Button variant="danger" disabled={busy} onClick={onDelete}>
        Sil
      </Button>
    </article>
  )
}
