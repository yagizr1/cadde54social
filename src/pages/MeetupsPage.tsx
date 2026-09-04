import { Coffee, MapPin, Plus } from 'lucide-react'
import { Link } from '../lib/nav'
import { EmptyState } from '../components/ui/EmptyState'
import { useApp } from '../hooks/useApp'
import { meetupService } from '../services/meetupService'
import { settingsService } from '../services/settingsService'
import type { Meetup } from '../types'

export function MeetupsPage() {
  const { user } = useApp()
  if (!user) return null

  const items = meetupService
    .getMeetups()
    .filter((m) => m.status !== 'cancelled' && !settingsService.iBlocked(m.creatorId, user.id))

  return (
    <div className="mx-auto max-w-xl anim-page">
      <div className="flex items-end justify-between gap-3 px-4 pt-5 pb-3">
        <div>
          <h1 className="text-[22px] font-bold">Buluşmalar</h1>
          <p className="mt-1 text-[13px] text-mute">Cadde 54’te kahve, yürüyüş, sohbet.</p>
        </div>
        <Link
          to="/meetups/new"
          className="grid h-10 w-10 place-items-center rounded-full bg-hot text-ink"
          aria-label="Buluşma oluştur"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-6">
          <EmptyState
            title="Açık buluşma yok"
            text="Bir etkinlik aç, Cadde’den insanlarla tanış."
            action={
              <Link to="/meetups/new" className="inline-flex h-10 items-center rounded-lg bg-hot px-4 text-sm font-semibold text-ink">
                Buluşma oluştur
              </Link>
            }
          />
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {items.map((m) => (
            <MeetupRow key={m.id} meetup={m} />
          ))}
        </div>
      )}
    </div>
  )
}

function MeetupRow({ meetup }: { meetup: Meetup }) {
  const cap = meetupService.capacity(meetup)
  const when = meetupService.formatWhen(meetup)
  const full = cap.isFull || meetup.status === 'full'

  return (
    <Link to={`/meetups/${meetup.id}`} className="flex gap-3 px-4 py-3">
      <span className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-xl bg-hot/15 text-hot">
        <Coffee className="h-7 w-7" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{meetup.title}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-mute">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {meetup.locationName}
        </p>
        <p className="mt-1 text-[12px] text-white/70">
          {when.dateLabel} · {when.timeLabel} · {cap.filled} / {cap.total} kişi
        </p>
        <p className="mt-1 text-[12px] text-mute">{meetupService.preferenceLabel(meetup.participantPreference)}</p>
        {full ? <p className="mt-1 text-[12px] font-semibold text-hot">🎉 Buluşma doldu!</p> : null}
      </div>
    </Link>
  )
}
