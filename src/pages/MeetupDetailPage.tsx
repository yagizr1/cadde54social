import { Ban, Flag, MapPin } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link, useNavigate } from '../lib/nav'
import { UserActionsSheet } from '../components/profile/UserActionsSheet'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useApp } from '../hooks/useApp'
import { cx, getLevelInfo } from '../lib/utils'
import { meetupService } from '../services/meetupService'
import { userService } from '../services/userService'
import { useUiStore } from '../store/uiStore'
import type { MeetupRequest, MeetupRequestStatus, User } from '../types'

type RequestFilter = 'pending' | 'accepted' | 'rejected' | 'all'

const FILTERS: { id: RequestFilter; label: string }[] = [
  { id: 'pending', label: 'Bekleyenler' },
  { id: 'accepted', label: 'Kabul Edilenler' },
  { id: 'rejected', label: 'Reddedilenler' },
  { id: 'all', label: 'Tümü' },
]

export function MeetupDetailPage() {
  const { id = '' } = useParams()
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const navigate = useNavigate()
  const [filter, setFilter] = useState<RequestFilter>('pending')
  const [busy, setBusy] = useState(false)
  const [sentNote, setSentNote] = useState(false)
  const [sheetUser, setSheetUser] = useState<User | null>(null)
  const meetup = meetupService.getMeetupById(id)

  if (!user) return null
  if (!meetup) {
    return <p className="px-4 py-10 text-center text-sm text-mute">Buluşma bulunamadı.</p>
  }

  const owner = userService.getById(meetup.creatorId)
  const isOwner = meetup.creatorId === user.id
  const cap = meetupService.capacity(meetup)
  const when = meetupService.formatWhen(meetup)
  const myRequest = meetupService.getUserRequest(meetup.id, user.id)
  const gate = meetupService.canApply(meetup, user)
  const cancelled = meetup.status === 'cancelled'
  const full = cap.isFull || meetup.status === 'full'
  const requestRows = isOwner ? meetupService.getMeetupRequests(meetup.id, filter) : []
  const pendingCount = meetupService.getMeetupRequests(meetup.id, 'pending').length

  function run(label: string, fn: () => void) {
    setBusy(true)
    try {
      fn()
      refresh()
      toast(label)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'İşlem yapılamadı', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl anim-page">
      <div className="px-4 pt-4 pb-3">
        <p className="text-[13px] text-hot">☕ Buluşma</p>
        <h1 className="mt-1 text-[24px] font-bold leading-tight">{meetup.title}</h1>
        {meetup.description ? <p className="mt-2 text-[14px] leading-snug text-white/80">{meetup.description}</p> : null}

        <ul className="mt-4 space-y-1.5 text-[14px] text-white/85">
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-hot" />
            {meetup.locationName}
          </li>
          <li>📅 {when.dateLabel}</li>
          <li>🕖 {when.timeLabel}</li>
          <li>👥 {cap.filled} / {cap.total} kişi</li>
        </ul>
        <p className="mt-3 text-[13px] text-mute">
          {meetup.currentParticipants} kişi birlikte geliyor
          {cap.remaining > 0 ? ` · ${cap.remaining} kişi daha aranıyor` : ''}
        </p>
        <p className="mt-1 text-[13px] text-white/80">
          {meetup.participantPreference === 'female'
            ? '👩 Sadece kız kullanıcılar'
            : meetup.participantPreference === 'male'
              ? '👨 Sadece erkek kullanıcılar'
              : '👥 Farketmez'}
        </p>
        {cancelled ? <p className="mt-3 font-semibold text-red-400">Bu buluşma iptal edildi.</p> : null}
        {full && !cancelled ? <p className="mt-3 font-semibold text-hot">🎉 Buluşma doldu!</p> : null}
      </div>

      {!isOwner && !cancelled ? (
        <div className="px-4 pb-4">
          {myRequest ? (
            <div className="rounded-2xl border border-line bg-panel px-4 py-3">
              <StatusBadge status={myRequest.status} />
              {myRequest.status === 'pending' ? (
                <button
                  type="button"
                  disabled={busy}
                  className="mt-3 text-[13px] text-mute"
                  onClick={() => run('Başvuru iptal edildi', () => meetupService.cancelMeetupRequest(meetup.id, user.id))}
                >
                  Başvuruyu geri çek
                </button>
              ) : null}
            </div>
          ) : gate.ok ? (
            <div>
              <Button
                className="w-full"
                disabled={busy}
                onClick={() => {
                  run('Katılma isteğin gönderildi.', () => meetupService.sendMeetupRequest(meetup.id, user.id))
                  setSentNote(true)
                }}
              >
                {busy ? 'Gönderiliyor...' : 'Katılma İsteği Gönder'}
              </Button>
              {sentNote ? (
                <p className="mt-3 text-[13px] leading-relaxed text-mute">
                  Katılma isteğin gönderildi. Etkinlik sahibi profilini inceleyip katılımını onaylayabilir.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-2xl border border-line bg-panel px-4 py-3 text-[13px] text-white/80">{gate.reason}</p>
          )}
        </div>
      ) : null}

      {isOwner ? (
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          <Link to={`/meetups/${meetup.id}/edit`} className="rounded-lg bg-[#262626] px-3 py-2 text-[13px] font-semibold">
            Düzenle
          </Link>
          <button
            type="button"
            disabled={busy || cancelled}
            className="rounded-lg bg-[#262626] px-3 py-2 text-[13px] font-semibold text-red-400 disabled:opacity-40"
            onClick={() => {
              if (!confirm('Buluşmayı iptal etmek istiyor musun?')) return
              run('Buluşma iptal edildi', () => meetupService.cancelMeetup(meetup.id, user.id))
            }}
          >
            İptal et
          </button>
        </div>
      ) : null}

      <section className="border-t border-white/10 px-4 py-4">
        <h2 className="text-[16px] font-semibold">Katılımcılar</h2>
        <div className="mt-3 space-y-2">
          {meetup.participants.map((pid) => {
            const p = userService.getById(pid)
            if (!p) return null
            return (
              <div key={pid} className="flex items-center gap-3">
                <Link to={`/u/${p.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar src={p.avatar} name={p.name} size={40} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">{p.name}</p>
                    <p className="truncate text-[12px] text-mute">
                      @{p.username}
                      {pid === meetup.creatorId ? ' · oluşturan' : ''}
                    </p>
                  </div>
                </Link>
                {isOwner && pid !== meetup.creatorId ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="text-[12px] text-red-400"
                    onClick={() => {
                      if (!confirm(`${p.name} çıkarılsın mı?`)) return
                      run('Katılımcı çıkarıldı', () => meetupService.removeMeetupParticipant(meetup.id, pid, user.id))
                    }}
                  >
                    Çıkar
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      {isOwner ? (
        <section className="border-t border-white/10 px-4 py-4">
          <h2 className="text-[16px] font-semibold">Katılma İstekleri ({pendingCount})</h2>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cx(
                  'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold',
                  filter === f.id ? 'bg-white text-ink' : 'bg-[#262626] text-mute',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {requestRows.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Henüz katılma isteği yok."
                text="Buluşmanı paylaş ve yeni insanlarla tanış!"
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {requestRows.map((row) => {
                const applicant = userService.getById(row.userId)
                if (!applicant) return null
                return (
                  <RequestCard
                    key={row.id}
                    row={row}
                    applicant={applicant}
                    ownerId={user.id}
                    busy={busy}
                    onProfile={() => navigate(`/u/${applicant.username}`)}
                    onAccept={() => run('İstek kabul edildi', () => meetupService.acceptMeetupRequest(row.id, user.id))}
                    onReject={() => run('İstek reddedildi', () => meetupService.rejectMeetupRequest(row.id, user.id))}
                    onMore={() => setSheetUser(applicant)}
                  />
                )
              })}
            </div>
          )}
        </section>
      ) : null}

      {owner && !isOwner ? (
        <p className="px-4 pb-6 text-[12px] text-mute">
          Oluşturan:{' '}
          <Link to={`/u/${owner.username}`} className="text-white">
            @{owner.username}
          </Link>
        </p>
      ) : (
        <div className="h-4" />
      )}

      {sheetUser ? (
        <UserActionsSheet
          open
          onClose={() => setSheetUser(null)}
          meId={user.id}
          target={sheetUser}
          onChange={refresh}
        />
      ) : null}
    </div>
  )
}

function StatusBadge({ status }: { status: MeetupRequestStatus }) {
  const map = {
    pending: { label: '🟡 Beklemede', className: 'bg-yellow-400/15 text-yellow-200' },
    accepted: { label: '🟢 Kabul edildi', className: 'bg-hot/15 text-hot' },
    rejected: { label: '🔴 Reddedildi', className: 'bg-red-500/15 text-red-300' },
  } as const
  const item = map[status]
  return <span className={cx('inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold', item.className)}>{item.label}</span>
}

function RequestCard({
  row,
  applicant,
  ownerId,
  busy,
  onProfile,
  onAccept,
  onReject,
  onMore,
}: {
  row: MeetupRequest
  applicant: User
  ownerId: string
  busy: boolean
  onProfile: () => void
  onAccept: () => void
  onReject: () => void
  onMore: () => void
}) {
  const level = getLevelInfo(applicant.xp)
  const mutual = meetupService.commonFollowers(ownerId, applicant.id)
  const pending = row.status === 'pending'

  return (
    <article className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-start gap-3">
        <Avatar src={applicant.avatar} name={applicant.name} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[15px] font-semibold">{applicant.name}</p>
            <StatusBadge status={row.status} />
          </div>
          <p className="text-[13px] text-mute">@{applicant.username}</p>
          {applicant.bio ? <p className="mt-1 line-clamp-2 text-[13px] text-white/80">“{applicant.bio}”</p> : null}
          <p className="mt-2 text-[12px] text-mute">
            ⭐ Level {level.level} · {applicant.xp.toLocaleString('tr-TR')} XP
          </p>
          <p className="text-[12px] text-mute">{mutual} ortak takipçi</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={onProfile}>
          Profili Gör
        </Button>
        <button type="button" onClick={onMore} className="rounded-lg bg-[#262626] text-[13px] font-semibold">
          Daha fazla
        </button>
      </div>
      {pending ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button disabled={busy} onClick={onAccept}>
            Kabul Et
          </Button>
          <Button variant="danger" disabled={busy} onClick={onReject}>
            Reddet
          </Button>
        </div>
      ) : null}
      <div className="mt-3 flex gap-4 text-[12px] text-mute">
        <button type="button" onClick={onMore} className="inline-flex items-center gap-1">
          <Flag className="h-3.5 w-3.5" /> Kullanıcıyı Bildir
        </button>
        <button type="button" onClick={onMore} className="inline-flex items-center gap-1">
          <Ban className="h-3.5 w-3.5" /> Kullanıcıyı Engelle
        </button>
      </div>
    </article>
  )
}
