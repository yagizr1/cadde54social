import { MapPin, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from '../lib/nav'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { useApp } from '../hooks/useApp'
import { messageService } from '../services/messageService'
import { formatStay, hereTimeService } from '../services/hereTimeService'
import { presenceService } from '../services/presenceService'
import { settingsService } from '../services/settingsService'
import { useUiStore } from '../store/uiStore'

export function HerePage() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState<{ text: string; ok: boolean } | null>(null)

  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    const tick = window.setInterval(() => refresh(), 30_000)
    if (!navigator.geolocation) {
      return () => window.clearInterval(tick)
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = presenceService.syncLocation(userId, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
        if (next !== 'same') refresh()
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 },
    )
    return () => {
      window.clearInterval(tick)
      navigator.geolocation.clearWatch(watchId)
    }
  }, [userId, refresh])

  if (!user) return null

  const active = presenceService.isHere(user.hereUntil)
  const leftLabel = presenceService.leftLabel(user.hereLeftAt)
  const hidden = settingsService.get(user.id).hideHereStatus
  const people = presenceService.hereNow(user.id)

  async function run() {
    setLoading(true)
    try {
      const coords = await presenceService.readBrowserCoords()
      await presenceService.checkHere(user!.id, coords)
      setAlert({ text: 'Konumunuz doğrulandı', ok: true })
      refresh()
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Konum alınamadı'
      if (text.includes('dışındasın') || text.includes('çıktın')) {
        setAlert({ text: 'Cadde 54’de değilsiniz', ok: false })
      } else {
        toast(text, 'err')
      }
      refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl anim-page">
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-hot/15 text-hot">
            <MapPin className="h-4 w-4" />
          </span>
          <h1 className="text-[22px] font-bold">Buradayım</h1>
        </div>
        <p className="mt-2 text-[13px] leading-snug text-mute">
          Konumun yalnızca Cadde 54 alanında mı diye bakılır. Tam koordinatın kimseye görünmez.
        </p>

        {active ? (
          <p className="mt-3 text-[14px] font-semibold text-hot">
            Cadde 54’tesin
            {hidden ? <span className="ml-1 font-normal text-mute">· durumun gizli</span> : null}
          </p>
        ) : leftLabel ? (
          <p className="mt-3 text-[14px] font-semibold text-mute">{leftLabel}</p>
        ) : null}
        <p className="mt-2 text-[13px] text-mute">
          Bu ay Cadde’de {formatStay(hereTimeService.msFor(user.id, 'monthly'))} ·{' '}
          <Link to="/leaderboard" className="text-hot">
            Sıralama
          </Link>
        </p>
        <Button className="mt-4 w-full py-2.5" disabled={loading || active} onClick={() => void run()}>
          {loading ? 'Konum alınıyor...' : active ? 'Zaten buradasın' : 'Konumumu doğrula'}
        </Button>
      </div>

      <div className="border-t border-white/10">
        <div className="flex items-baseline justify-between px-4 pt-4 pb-1">
          <h2 className="text-[16px] font-semibold">Şu an Cadde 54’te</h2>
          <span className="text-[13px] text-mute">{people.length}</span>
        </div>

        {people.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-mute">
            Şu an kimse görünmüyor. Konumunu doğrulayınca burada yerin açılır.
          </p>
        ) : (
          people.map((u) => {
            const mine = u.id === user.id
            const here = presenceService.isHere(u.hereUntil)
            const left = presenceService.leftLabel(u.hereLeftAt)
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                <Link to={mine ? '/profile' : `/u/${u.username}`} className="relative shrink-0">
                  <Avatar src={u.avatar} name={u.name} size={48} />
                  <span
                    className={`absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-ink ${
                      here ? 'bg-hot' : 'bg-mute'
                    }`}
                  />
                </Link>
                <Link to={mine ? '/profile' : `/u/${u.username}`} className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">
                    {u.username}
                    {mine ? <span className="ml-1 font-normal text-mute">· sen</span> : null}
                  </p>
                  <p className="truncate text-[13px] text-mute">
                    {here ? u.name : `${u.name} · ${left}`}
                  </p>
                </Link>
                {!mine ? (
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-lg bg-[#262626]"
                    aria-label="Mesaj"
                    onClick={() => {
                      const gate = settingsService.canMessage(user.id, u.id)
                      if (!gate.ok) {
                        toast(gate.reason ?? 'Mesaj gönderilemez', 'err')
                        return
                      }
                      const conv = messageService.withUser(user.id, u.id)
                      navigate(`/messages/${conv.id}`)
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            )
          })
        )}
      </div>
      {alert ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-6">
          <div className="w-full max-w-sm rounded-[28px] border border-line bg-panel p-6 text-center">
            <p className={`text-[18px] font-bold ${alert.ok ? 'text-hot' : 'text-white'}`}>{alert.text}</p>
            <Button className="mt-5 w-full" onClick={() => setAlert(null)}>
              Tamam
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
