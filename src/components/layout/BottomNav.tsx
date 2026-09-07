import { Clapperboard, Compass, Home, SquarePlus } from 'lucide-react'
import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { appRoute } from '../../lib/appPath'
import { NavLink, useNavigate } from '../../lib/nav'
import { useLongPress } from '../../hooks/useLongPress'
import { cx } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'

const items = [
  { to: '/', label: 'Ana Sayfa', icon: Home, end: true },
  { to: '/discover', label: 'Keşfet', icon: Compass },
  { to: '__create', label: 'Ekle', icon: SquarePlus },
  { to: '/reels', label: 'Reels', icon: Clapperboard },
  { to: '/profile', label: 'Profil', icon: Home },
]

function ProfileTab() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const switchToNext = useAuthStore((s) => s.switchToNext)
  const toast = useUiStore((s) => s.toast)
  const setAccountSwitcher = useUiStore((s) => s.setAccountSwitcher)
  const taps = useRef(0)
  const tapTimer = useRef<number | null>(null)
  const switching = useRef(false)
  const path = appRoute(location.pathname)
  const active = path === '/profile' || path.startsWith('/profile/')

  const press = useLongPress(() => {
    taps.current = 0
    if (tapTimer.current) {
      window.clearTimeout(tapTimer.current)
      tapTimer.current = null
    }
    setAccountSwitcher(true)
  }, 450)
  const { didLongPress, ...pressEvents } = press

  function onClick() {
    if (didLongPress()) return
    taps.current += 1
    if (taps.current === 1) {
      tapTimer.current = window.setTimeout(() => {
        taps.current = 0
        tapTimer.current = null
        navigate('/profile')
      }, 260)
      return
    }
    if (tapTimer.current) {
      window.clearTimeout(tapTimer.current)
      tapTimer.current = null
    }
    taps.current = 0
    if (switching.current) return
    switching.current = true
    void switchToNext()
      .then((ok) => {
        if (!ok) setAccountSwitcher(true)
        else toast('Hesap değiştirildi')
      })
      .catch((err) => {
        toast(err instanceof Error ? err.message : 'Hesaba geçilemedi', 'err')
      })
      .finally(() => {
        switching.current = false
      })
  }

  return (
    <button
      type="button"
      {...pressEvents}
      onClick={onClick}
      className="grid h-12 w-12 touch-manipulation place-items-center"
      aria-label="Profil"
    >
      <img
        src={user?.avatar}
        alt=""
        className={cx('h-6 w-6 rounded-full object-cover', active && 'outline outline-1 outline-offset-2 outline-white')}
      />
    </button>
  )
}

export function BottomNav() {
  const setCreateOpen = useUiStore((s) => s.setCreateOpen)
  const location = useLocation()
  const onReels = appRoute(location.pathname).startsWith('/reels')

  return (
    <nav
      className={cx(
        'fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] lg:hidden',
        onReels ? 'border-t border-white/10 bg-black/40 backdrop-blur-md' : 'border-t border-white/10 bg-ink',
      )}
    >
      <div className="mx-auto flex h-12 max-w-lg items-center justify-around">
        {items.map((item) => {
          if (item.to === '__create') {
            return (
              <button
                key={item.to}
                onClick={() => setCreateOpen(true)}
                className="grid h-12 w-12 place-items-center"
                aria-label="İçerik ekle"
              >
                <SquarePlus className="h-[26px] w-[26px]" />
              </button>
            )
          }
          if (item.to === '/profile') {
            return <ProfileTab key={item.to} />
          }
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="grid h-12 w-12 place-items-center"
              aria-label={item.label}
            >
              <Icon className="h-[26px] w-[26px]" />
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
