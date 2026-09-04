import { useState } from 'react'
import { Link } from '../lib/nav'
import { Avatar } from '../components/ui/Avatar'
import { useApp } from '../hooks/useApp'
import { getLevelInfo } from '../lib/utils'
import { formatStay, hereTimeService, type StayPeriod } from '../services/hereTimeService'

export function LeaderboardPage() {
  const { user } = useApp()
  const [period, setPeriod] = useState<StayPeriod>('monthly')
  if (!user) return null
  const rows = hereTimeService.rank(user.id, period)
  const mine = rows.find((r) => r.user.id === user.id)
  const label = period === 'weekly' ? 'Bu hafta' : period === 'monthly' ? 'Bu ay' : 'Toplam'

  return (
    <div className="mx-auto max-w-xl px-4 py-4 anim-page">
      <h1 className="font-display text-2xl font-bold">Cadde sıralaması</h1>
      <p className="mt-1 text-[13px] text-mute">
        Konumla Cadde 54’te geçirdiğin süreye göre. XP ve seviye hesabında duruyor.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-panel p-1">
        {(
          [
            ['weekly', 'Haftalık'],
            ['monthly', 'Aylık'],
            ['all', 'Genel'],
          ] as const
        ).map(([id, text]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPeriod(id)}
            className={`rounded-xl py-2 text-sm ${period === id ? 'bg-white text-ink' : 'text-mute'}`}
          >
            {text}
          </button>
        ))}
      </div>
      {mine ? (
        <div className="mt-4 rounded-2xl border border-hot/40 bg-hot/10 px-4 py-3">
          <p className="text-[12px] text-mute">{label} senin süren</p>
          <p className="text-[18px] font-bold">{formatStay(mine.ms)}</p>
        </div>
      ) : null}
      <div className="mt-6 grid grid-cols-3 gap-2">
        {rows.slice(0, 3).map((row, i) => {
          const level = getLevelInfo(row.user.xp)
          return (
            <Link
              key={row.user.id}
              to={row.user.id === user.id ? '/profile' : `/u/${row.user.username}`}
              className={`rounded-3xl border border-line bg-panel p-3 text-center ${i === 0 ? 'order-2 -mt-2 border-gold/50' : i === 1 ? 'order-1' : 'order-3'}`}
            >
              <p className="text-xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</p>
              <Avatar src={row.user.avatar} name={row.user.name} size={56} className="mx-auto mt-2" />
              <p className="mt-2 truncate text-sm font-semibold">@{row.user.username}</p>
              <p className="text-xs text-gold">{formatStay(row.ms)}</p>
              <p className="text-[11px] text-mute">Sv. {level.level}</p>
            </Link>
          )
        })}
      </div>
      <div className="mt-6 space-y-2">
        {rows.slice(3).map((row, i) => {
          const level = getLevelInfo(row.user.xp)
          return (
            <Link
              key={row.user.id}
              to={row.user.id === user.id ? '/profile' : `/u/${row.user.username}`}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${
                row.user.id === user.id ? 'border-hot/40 bg-hot/10' : 'border-line bg-panel'
              }`}
            >
              <span className="w-6 text-sm text-mute">{i + 4}</span>
              <Avatar src={row.user.avatar} name={row.user.name} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">@{row.user.username}</span>
                <span className="text-[11px] text-mute">Sv. {level.level}</span>
              </span>
              <span className="text-sm text-gold">{formatStay(row.ms)}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
