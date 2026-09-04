import { useMemo, useState } from 'react'
import { premiumService } from '../../services/premiumService'
import { userService } from '../../services/userService'
import { isAdminUser } from '../../lib/admin'
import { isSuspendedUser } from '../../lib/accountStatus'
import { AdminShell } from './AdminLayout'
import { presenceService } from '../../services/presenceService'
import { adminService } from '../../services/adminService'
import { getItem } from '../../services/storage'
import { useApp } from '../../hooks/useApp'
import { useUiStore } from '../../store/uiStore'
import { Button } from '../../components/ui/Button'
import type { Confession, Post, Reel, UserReport } from '../../types'
import type { FeedbackItem } from '../../services/feedbackService'

function startOfDay(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function AdminDashboard() {
  const { refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const users = userService.list().filter((u) => !isAdminUser(u))
  const posts = getItem<Post[]>('posts', [])
  const reels = getItem<Reel[]>('reels', [])
  const confessions = getItem<Confession[]>('confessions', [])
  const reports = getItem<UserReport[]>('userReports', [])
  const feedback = getItem<FeedbackItem[]>('feedback', [])
  const today = startOfDay()

  const stats = useMemo(
    () => [
      { label: 'Kullanıcı', value: users.length },
      { label: 'Premium', value: users.filter((u) => premiumService.isActive(u)).length },
      { label: 'Askıda', value: users.filter((u) => isSuspendedUser(u)).length },
      { label: 'Banlı', value: users.filter((u) => u.banned).length },
      { label: 'Cadde’de', value: users.filter((u) => presenceService.isHere(u.hereUntil)).length },
      { label: 'Gönderi', value: posts.length },
      { label: 'Reels', value: reels.length },
      { label: 'Bugün gönderi', value: posts.filter((p) => p.createdAt >= today).length },
      { label: 'Şikayet', value: reports.length },
      { label: 'Yardım', value: feedback.length },
      { label: 'İtiraf', value: confessions.length },
    ],
    [users, posts, reels, reports, feedback, confessions, today],
  )

  async function announce() {
    const msg = text.trim()
    if (msg.length < 3) {
      toast('Duyuru çok kısa', 'err')
      return
    }
    setBusy(true)
    try {
      await adminService.act('admin.announce', { text: msg })
      await refresh()
      setText('')
      toast('Duyuru gönderildi')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Gönderilemedi', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminShell title="Özet">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-panel p-4">
            <p className="text-xs text-mute">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-line bg-panel p-4">
        <p className="text-sm font-semibold">Herkese duyuru</p>
        <p className="mt-1 text-xs text-mute">Açık hesapların bildirimine düşer.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm"
          placeholder="Kısa bir mesaj yaz"
        />
        <Button className="mt-2" disabled={busy} onClick={() => void announce()}>
          Gönder
        </Button>
      </div>
    </AdminShell>
  )
}
