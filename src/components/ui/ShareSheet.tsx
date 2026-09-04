import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { cx } from '../../lib/utils'
import { shareService, type SharePayload } from '../../services/shareService'
import { Avatar } from './Avatar'

export function ShareSheet({
  open,
  onClose,
  payload,
}: {
  open: boolean
  onClose: () => void
  payload: SharePayload
}) {
  const me = useAuthStore((s) => s.user)
  const toast = useUiStore((s) => s.toast)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [note, setNote] = useState('')
  const openedAt = useRef(0)

  useEffect(() => {
    if (!open) return
    openedAt.current = Date.now()
    setQuery('')
    setSelected([])
    setNote('')
  }, [open])

  const targets = useMemo(() => {
    if (!me) return []
    const q = query.trim().toLowerCase()
    const list = shareService.targets(me.id)
    if (!q) return list
    return list.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q),
    )
  }, [me, query, open])

  if (!open || !me) return null
  const meId = me.id

  function closeSafe() {
    if (Date.now() - openedAt.current < 400) return
    onClose()
  }

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  function send() {
    if (!selected.length) return
    const text = note.trim() ? `${payload.text}\n${note.trim()}` : payload.text
    const count = shareService.sendTo(meId, selected, {
      ...payload,
      text,
    })
    if (!count) {
      toast('Gönderilemedi', 'err')
      return
    }
    toast(count === 1 ? 'Gönderildi' : `${count} kişiye gönderildi`)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center">
      <button className="absolute inset-0 bg-black/60 anim-backdrop" onClick={closeSafe} aria-label="Kapat" />
      <div className="relative flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl border border-line bg-ink-2 anim-sheet md:rounded-3xl">
        <div className="mx-auto mt-3 h-1 w-12 shrink-0 rounded-full bg-line md:hidden" />
        <h3 className="shrink-0 px-5 pt-3 pb-2 text-center text-[16px] font-semibold">Gönder</h3>
        <div className="shrink-0 px-4 pb-3">
          <label className="flex items-center gap-2 rounded-xl bg-panel px-3 py-2.5">
            <Search className="h-4 w-4 text-mute" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ara"
              className="w-full bg-transparent text-sm outline-none placeholder:text-mute"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {targets.length === 0 ? (
            <p className="py-10 text-center text-sm text-mute">Kullanıcı bulunamadı.</p>
          ) : (
            targets.map((u) => {
              const on = selected.includes(u.id)
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-panel"
                >
                  <Avatar src={u.avatar} name={u.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{u.username}</p>
                    <p className="truncate text-xs text-mute">{u.name}</p>
                  </div>
                  <span
                    className={cx(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2',
                      on ? 'border-hot bg-hot' : 'border-mute',
                    )}
                  >
                    {on ? <span className="h-2 w-2 rounded-full bg-ink" /> : null}
                  </span>
                </button>
              )
            })
          )}
        </div>
        <div className="shrink-0 border-t border-line px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Mesaj yaz..."
            className="mb-3 w-full bg-transparent text-sm outline-none placeholder:text-mute"
          />
          <button
            type="button"
            disabled={!selected.length}
            onClick={send}
            className="w-full rounded-xl bg-hot py-3 text-sm font-semibold text-ink disabled:opacity-40"
          >
            Gönder{selected.length ? ` (${selected.length})` : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
