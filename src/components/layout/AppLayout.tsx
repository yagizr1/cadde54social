import { Heart, Send } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { appRoute } from '../../lib/appPath'
import { Link } from '../../lib/nav'
import { cx } from '../../lib/utils'
import { notificationService } from '../../services/notificationService'
import { messageService } from '../../services/messageService'
import { useApp } from '../../hooks/useApp'
import { CountBadge } from '../ui/CountBadge'
import { StoryViewer } from '../feed/StoryViewer'
import { PushPrompt } from '../pwa/PushPrompt'
import { AccountSwitcherSheet } from './AccountSwitcherSheet'
import { BackButton } from './BackButton'
import { BottomNav } from './BottomNav'
import { BrandMark } from './BrandMark'
import { CreateSheet } from './CreateSheet'
import { PullToRefresh } from './PullToRefresh'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const location = useLocation()
  const { user, tick, refresh } = useApp()
  const unread = user ? notificationService.unreadCount(user.id) : 0
  const msgUnread = user ? messageService.unreadCount(user.id) : 0
  void tick
  const path = appRoute(location.pathname)
  const atHome = path === '/'
  const inChat = /^\/messages\/[^/]+$/.test(path)
  const hideHeader =
    path.startsWith('/reels') ||
    path.startsWith('/create') ||
    path.startsWith('/discover') ||
    path.startsWith('/notifications') ||
    path === '/profile' ||
    path.startsWith('/p/') ||
    path.startsWith('/u/') ||
    path.startsWith('/messages') ||
    path.startsWith('/friends') ||
    path === '/settings/archive'
  const hideNav = path.startsWith('/reels') || path.startsWith('/create') || inChat
  const atSettings = path === '/settings' || path.startsWith('/settings/')

  return (
    <div className="min-h-dvh bg-ink">
      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar />
        <div className="min-w-0 flex-1">
          {!hideHeader ? (
            <header
              className={cx(
                'safe-head sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-ink px-3 pb-1.5',
                atHome && 'lg:hidden',
              )}
            >
              <div className="flex min-w-0 items-center">
                {!atHome ? <BackButton /> : null}
                <BrandMark />
              </div>
              <div className="flex items-center gap-2">
                <Link to="/notifications" className="relative grid h-10 w-10 place-items-center" aria-label="Bildirimler">
                  <Heart className="h-6 w-6" />
                  {unread > 0 ? <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#ff3040]" /> : null}
                </Link>
                <Link
                  to="/messages"
                  className="relative grid h-10 w-10 place-items-center"
                  aria-label={msgUnread ? `Mesajlar, ${msgUnread} yeni` : 'Mesajlar'}
                >
                  <Send className="h-6 w-6" />
                  <CountBadge count={msgUnread} className="absolute top-0 right-0" />
                </Link>
              </div>
            </header>
          ) : null}
          <PullToRefresh onRefresh={refresh} disabled={hideNav || atSettings}>
            <main className={hideNav ? '' : 'safe-b lg:pb-8'}>
              <Outlet />
            </main>
          </PullToRefresh>
        </div>
      </div>
      {!hideNav ? <BottomNav /> : null}
      <PushPrompt />
      <CreateSheet />
      <AccountSwitcherSheet />
      <StoryViewer onChange={refresh} />
    </div>
  )
}
