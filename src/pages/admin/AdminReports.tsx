import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { adminService } from '../../services/adminService'
import { getItem } from '../../services/storage'
import { userService } from '../../services/userService'
import { useApp } from '../../hooks/useApp'
import { useUiStore } from '../../store/uiStore'
import { timeAgo } from '../../lib/utils'
import { AdminShell } from './AdminLayout'
import type { Confession, UserReport } from '../../types'
import type { FeedbackItem } from '../../services/feedbackService'

export function AdminReports() {
  const { refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const [busy, setBusy] = useState<string | null>(null)
  const reports = getItem<UserReport[]>('userReports', [])
  const confessions = getItem<Confession[]>('confessions', []).filter((c) => (c.reports?.length ?? 0) > 0)
  const feedback = getItem<FeedbackItem[]>('feedback', [])

  async function act(name: string, body: Record<string, unknown>, id: string, ok: string) {
    setBusy(id)
    try {
      await adminService.act(name, body)
      await refresh()
      toast(ok)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'İşlem yapılamadı', 'err')
    } finally {
      setBusy(null)
    }
  }

  return (
    <AdminShell title="Şikayetler ve yardım">
      <h2 className="text-sm font-semibold">Kullanıcı şikayetleri</h2>
      <div className="mt-2 space-y-2">
        {reports.length === 0 ? <p className="text-sm text-mute">Açık şikayet yok.</p> : null}
        {reports.map((r) => {
          const from = userService.getById(r.fromId)
          const target = userService.getById(r.targetId)
          const handle = target?.username
          return (
            <article key={r.id} className="rounded-lg border border-line bg-panel p-4">
              <p className="text-sm">
                @{from?.username ?? 'silinmiş'} → @{handle ?? 'silinmiş'}
              </p>
              <p className="mt-1 text-sm text-mute">{r.reason || 'Sebep yok'}</p>
              <p className="mt-1 text-xs text-mute">{timeAgo(r.createdAt)}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                <Button variant="ghost" disabled={busy === r.id} onClick={() => void act('admin.resolveReport', { id: r.id }, r.id, 'Kapatıldı')}>
                  Kapat
                </Button>
                {handle ? (
                  <>
                    <Button
                      variant="ghost"
                      disabled={busy === r.id}
                      onClick={() =>
                        void act('admin.suspend', { username: handle, days: 7, reason: r.reason }, r.id, '7 gün askı')
                      }
                    >
                      7 gün askı
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busy === r.id}
                      onClick={() => {
                        if (!window.confirm(`@${handle} banlansın mı?`)) return
                        void act('admin.ban', { username: handle, banned: true, reason: r.reason }, r.id, 'Banlandı')
                      }}
                    >
                      Banla
                    </Button>
                  </>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      <h2 className="mt-8 text-sm font-semibold">Şikayetli itiraflar</h2>
      <div className="mt-2 space-y-2">
        {confessions.length === 0 ? <p className="text-sm text-mute">Yok.</p> : null}
        {confessions.map((c) => (
          <article key={c.id} className="rounded-lg border border-line bg-panel p-4">
            <p className="text-sm text-mute">{c.content}</p>
            <p className="mt-1 text-xs text-mute">{c.reports.length} bildirim</p>
            <Button
              className="mt-3"
              variant="danger"
              disabled={busy === c.id}
              onClick={() => {
                if (!window.confirm('İtiraf silinsin mi?')) return
                void act('admin.deleteConfession', { id: c.id }, c.id, 'Silindi')
              }}
            >
              Sil
            </Button>
          </article>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold">Yardım / istek / hata</h2>
      <div className="mt-2 space-y-2">
        {feedback.length === 0 ? <p className="text-sm text-mute">Gelen yok.</p> : null}
        {feedback.map((f) => {
          const from = userService.getById(f.userId)
          return (
            <article key={f.id} className="rounded-lg border border-line bg-panel p-4">
              <p className="text-sm font-semibold">
                {f.type === 'bug' ? 'Hata' : 'İstek'} · @{from?.username ?? 'silinmiş'}
              </p>
              <p className="mt-1 text-sm">{f.title}</p>
              <p className="mt-1 text-sm text-mute">{f.message}</p>
              <p className="mt-1 text-xs text-mute">{timeAgo(f.createdAt)}</p>
              <Button
                className="mt-3"
                variant="ghost"
                disabled={busy === f.id}
                onClick={() => void act('admin.deleteFeedback', { id: f.id }, f.id, 'Kapatıldı')}
              >
                Kapat
              </Button>
            </article>
          )
        })}
      </div>
    </AdminShell>
  )
}
