import { ProgressBar } from '../components/ui/ProgressBar'
import { useApp } from '../hooks/useApp'
import { getLevelInfo, timeAgo } from '../lib/utils'
import { getItem } from '../services/storage'
import type { XpEvent } from '../types'

export function XpHistoryPage() {
  const { user } = useApp()
  if (!user) return null
  const level = getLevelInfo(user.xp)
  const history = getItem<XpEvent[]>('xpHistory', [])

  return (
    <div className="mx-auto max-w-xl px-4 py-4 anim-page">
      <h1 className="font-display text-2xl font-bold">XP geçmişi</h1>
      <div className="mt-4 rounded-3xl border border-line bg-panel p-4">
        <p className="font-display font-bold">LEVEL {level.level}</p>
        <ProgressBar value={user.xp / level.next} className="mt-3" />
        <p className="mt-2 text-sm text-mute">
          {user.xp} / {level.next} XP
        </p>
      </div>
      <div className="mt-5 space-y-2">
        {history.length === 0 ? (
          <p className="text-sm text-mute">Henüz XP hareketin yok. Görevlere bak.</p>
        ) : (
          history.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-2xl border border-line bg-panel px-4 py-3">
              <div>
                <p className="font-semibold text-gold">+{e.amount} {e.reason}</p>
                <p className="text-xs text-mute">{timeAgo(e.createdAt)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
