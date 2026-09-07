import {
  Bell,
  Clapperboard,
  Coffee,
  Compass,
  Eye,
  Flame,
  Home,
  MapPin,
  MessageCircle,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  Zap,
} from 'lucide-react'
import { NavLink } from '../../lib/nav'
import { cx } from '../../lib/utils'
import { messageService } from '../../services/messageService'
import { notificationService } from '../../services/notificationService'
import { useAuthStore } from '../../store/authStore'
import { useLiveStore } from '../../store/liveStore'
import { useUiStore } from '../../store/uiStore'
import { Avatar } from '../ui/Avatar'
import { CountBadge } from '../ui/CountBadge'
import { BrandMark } from './BrandMark'

const links = [
  { to: '/premium', label: 'Premium', icon: Sparkles },
  { to: '/meet', label: 'Tanış', icon: Flame },
  { to: '/meetups', label: 'Buluşmalar', icon: Coffee },
  { to: '/', label: 'Ana Sayfa', icon: Home, end: true },
  { to: '/discover', label: 'Keşfet', icon: Compass },
  { to: '/reels', label: 'Reels', icon: Clapperboard },
  { to: '/confessions', label: 'İtiraflar', icon: Shield },
  { to: '/here', label: 'Buradayım', icon: MapPin },
  { to: '/challenges', label: 'Görevler', icon: Zap },
  { to: '/leaderboard', label: 'Sıralama', icon: Trophy },
  { to: '/messages', label: 'Mesajlar', icon: MessageCircle },
  { to: '/friends', label: 'Arkadaşlar', icon: Users },
  { to: '/notifications', label: 'Bildirimler', icon: Bell },
  { to: '/profile/views', label: 'Profil görüntüleme', icon: Eye },
  { to: '/settings', label: 'Ayarlar', icon: Settings },
  { to: '/profile', label: 'Profil', icon: UserRound },
]

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const liveSeq = useLiveStore((s) => s.seq)
  const setCreateOpen = useUiStore((s) => s.setCreateOpen)
  const setAccountSwitcher = useUiStore((s) => s.setAccountSwitcher)
  if (!user) return null
  void liveSeq
  const unread = notificationService.unreadCount(user.id)
  const msgUnread = messageService.unreadCount(user.id)

  return (
    <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col border-r border-line bg-ink-2/80 px-4 py-5 lg:flex">
      <BrandMark className="text-left text-lg" />
      <nav className="mt-6 flex-1 space-y-1 overflow-y-auto no-scrollbar">
        {links.map((l) => {
          const Icon = l.icon
          return (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-mute transition hover:bg-panel hover:text-white',
                  isActive && 'bg-panel text-white',
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{l.label}</span>
              {l.to === '/notifications' && unread > 0 ? (
                <span className="ml-auto rounded-full bg-hot px-2 text-[11px] font-bold text-white">{unread}</span>
              ) : null}
              {l.to === '/messages' ? <CountBadge count={msgUnread} ring={false} className="ml-auto" /> : null}
            </NavLink>
          )
        })}
      </nav>
      <button
        onClick={() => setCreateOpen(true)}
        className="mb-3 flex items-center justify-center gap-2 rounded-2xl bg-hot py-3 text-sm font-semibold text-ink"
      >
        <Plus className="h-4 w-4" /> Paylaş
      </button>
      <button
        type="button"
        onClick={() => setAccountSwitcher(true)}
        className="flex items-center gap-3 rounded-2xl border border-line p-3 text-left"
      >
        <Avatar src={user.avatar} name={user.name} size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-mute">@{user.username}</p>
        </div>
      </button>
    </aside>
  )
}
