import { useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { accountStatusLabel, isSuspendedUser } from '../../lib/accountStatus'
import { isAdminUser } from '../../lib/admin'
import { getLevelInfo, timeAgo } from '../../lib/utils'
import { adminService } from '../../services/adminService'
import { premiumService } from '../../services/premiumService'
import { userService } from '../../services/userService'
import { useApp } from '../../hooks/useApp'
import { useUiStore } from '../../store/uiStore'
import { AdminShell } from './AdminLayout'
import type { User } from '../../types'

type Filter = 'all' | 'premium' | 'free' | 'suspended' | 'banned'

export function AdminUsers() {
  const { refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const users = userService.list().filter((u) => !isAdminUser(u))
  const filtered = users.filter((u) => {
    if (filter === 'premium' && !premiumService.isActive(u)) return false
    if (filter === 'free' && premiumService.isActive(u)) return false
    if (filter === 'banned' && !u.banned) return false
    if (filter === 'suspended' && !isSuspendedUser(u)) return false
    const needle = q.trim().toLowerCase()
    if (!needle) return true
    return (
      u.username.toLowerCase().includes(needle) ||
      u.name.toLowerCase().includes(needle) ||
      u.email.toLowerCase().includes(needle)
    )
  })
  const selected = users.find((u) => u.id === selectedId) ?? filtered[0]

  async function run(name: string, body: Record<string, unknown>, ok: string) {
    setBusy(true)
    try {
      await adminService.act(name, body)
      await refresh()
      toast(ok)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'İşlem yapılamadı', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminShell title="Kullanıcılar">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ara: @ad, isim, e-posta"
          className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['all', 'Tümü'],
              ['premium', 'Premium'],
              ['free', 'Ücretsiz'],
              ['suspended', 'Askıda'],
              ['banned', 'Banlı'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${filter === id ? 'bg-hot text-ink' : 'bg-panel text-mute'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-panel text-xs text-mute">
              <tr>
                <th className="px-3 py-2">Kullanıcı</th>
                <th className="px-3 py-2">Durum</th>
                <th className="px-3 py-2">Premium</th>
                <th className="px-3 py-2">XP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedId(u.id)}
                  className={`cursor-pointer border-t border-line hover:bg-white/5 ${selected?.id === u.id ? 'bg-hot/10' : ''}`}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar src={u.avatar} name={u.name} size={32} />
                      <div>
                        <p className="font-semibold">{u.name}</p>
                        <p className="text-xs text-mute">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">{accountStatusLabel(u)}</td>
                  <td className="px-3 py-2">
                    {premiumService.isLifetime(u) ? 'Süresiz' : premiumService.isActive(u) ? 'Var' : '—'}
                  </td>
                  <td className="px-3 py-2">{u.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? <p className="px-3 py-6 text-sm text-mute">Kullanıcı yok.</p> : null}
        </div>
        <UserTools user={selected} busy={busy} run={run} />
      </div>
    </AdminShell>
  )
}

function UserTools({
  user,
  busy,
  run,
}: {
  user: User | undefined
  busy: boolean
  run: (name: string, body: Record<string, unknown>, ok: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [warn, setWarn] = useState('')
  const [password, setPassword] = useState('')
  const [xpDelta, setXpDelta] = useState('100')
  const [months, setMonths] = useState(1)

  if (!user) {
    return <div className="rounded-lg border border-line bg-panel p-4 text-sm text-mute">Soldan bir kullanıcı seç.</div>
  }

  const handle = user.username
  const amount = Number(xpDelta)
  const lifetime = premiumService.isLifetime(user)
  const suspended = isSuspendedUser(user)

  function go(name: string, body: Record<string, unknown>, ok: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return
    void run(name, { username: handle, ...body }, ok)
  }

  return (
    <div className="space-y-4 rounded-lg border border-line bg-panel p-4">
      <div className="flex items-center gap-3">
        <Avatar src={user.avatar} name={user.name} size={48} />
        <div className="min-w-0">
          <p className="font-semibold">{user.name}</p>
          <p className="text-xs text-mute">@{user.username}</p>
        </div>
      </div>
      <p className="break-all text-sm">{user.email}</p>
      <p className="text-xs text-mute">
        {accountStatusLabel(user)} · kayıt {timeAgo(user.createdAt)} · sv {getLevelInfo(user.xp).level} ·{' '}
        {user.followers.length} takipçi
      </p>
      {user.banReason ? <p className="text-xs text-red-400">Ban: {user.banReason}</p> : null}
      {suspended ? (
        <p className="text-xs text-hot">
          Askı {user.suspendedUntil ? `${new Date(user.suspendedUntil).toLocaleString('tr-TR')} tarihine` : 'süresiz'}
          {user.suspendReason ? ` · ${user.suspendReason}` : ''}
        </p>
      ) : null}

      <label className="block text-xs text-mute">
        Sebep (askı / ban)
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-white"
          placeholder="İsteğe bağlı"
        />
      </label>

      {suspended ? (
        <Button className="w-full" disabled={busy} onClick={() => go('admin.unsuspend', {}, 'Askı kaldırıldı')}>
          Askıyı kaldır
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {[
            [1, '1 gün'],
            [7, '7 gün'],
            [30, '30 gün'],
            [0, 'Süresiz'],
          ].map(([days, label]) => (
            <Button
              key={String(days)}
              variant="ghost"
              disabled={busy}
              onClick={() =>
                go('admin.suspend', { days, reason }, `${handle} askıya alındı`, `@${handle} askıya alınsın mı?`)
              }
            >
              Askı {label}
            </Button>
          ))}
        </div>
      )}

      {user.banned ? (
        <Button className="w-full" disabled={busy} onClick={() => go('admin.ban', { banned: false }, 'Ban kaldırıldı')}>
          Banı kaldır
        </Button>
      ) : (
        <Button
          variant="danger"
          className="w-full"
          disabled={busy}
          onClick={() =>
            go('admin.ban', { banned: true, reason }, 'Hesap kapatıldı', `@${handle} banlansın mı? Giriş yapamaz.`)
          }
        >
          Banla
        </Button>
      )}

      <hr className="border-line" />

      {lifetime ? (
        <p className="text-xs text-hot">Süresiz premium. Kaldırılamaz.</p>
      ) : (
        <>
          <div className="flex gap-1">
            {[1, 3, 12].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMonths(n)}
                className={`flex-1 rounded-lg py-2 text-xs ${months === n ? 'bg-hot text-ink' : 'bg-ink text-mute'}`}
              >
                {n} ay
              </button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={busy}
            onClick={() => go('premium.grant', { months }, `Premium ${months} ay`)}
          >
            Premium ver
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            disabled={busy}
            onClick={() => go('premium.revoke', {}, 'Premium kapatıldı')}
          >
            Premium kaldır
          </Button>
        </>
      )}

      <div className="flex gap-2">
        <input
          value={xpDelta}
          onChange={(e) => setXpDelta(e.target.value)}
          className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm"
        />
        <Button
          variant="ghost"
          disabled={busy || !Number.isFinite(amount) || amount === 0}
          onClick={() => go('admin.addXp', { amount }, 'XP güncellendi')}
        >
          XP
        </Button>
      </div>

      <input
        value={warn}
        onChange={(e) => setWarn(e.target.value)}
        placeholder="Uyarı metni"
        className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm"
      />
      <Button
        variant="ghost"
        className="w-full"
        disabled={busy}
        onClick={() => go('admin.warn', { text: warn }, 'Uyarı gitti')}
      >
        Uyarı gönder
      </Button>

      <input
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Yeni şifre"
        className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm"
      />
      <Button
        variant="ghost"
        className="w-full"
        disabled={busy || password.length < 6}
        onClick={() => {
          go('admin.setPassword', { password }, 'Şifre değişti, oturumlar kapatıldı')
          setPassword('')
        }}
      >
        Şifreyi değiştir
      </Button>

      <Button variant="ghost" className="w-full" disabled={busy} onClick={() => go('admin.kickHere', {}, 'Cadde’den çıkarıldı')}>
        Cadde’den çıkar
      </Button>
      <Button
        variant="ghost"
        className="w-full"
        disabled={busy}
        onClick={() => go('admin.clearContent', {}, 'İçerik silindi', `@${handle} tüm içerikleri silinsin mi?`)}
      >
        İçeriğini sil
      </Button>
      <Button
        variant="danger"
        className="w-full"
        disabled={busy || lifetime}
        onClick={() => go('admin.deleteUser', {}, 'Hesap silindi', `@${handle} kalıcı silinsin mi? Geri alınamaz.`)}
      >
        Hesabı sil
      </Button>
    </div>
  )
}
