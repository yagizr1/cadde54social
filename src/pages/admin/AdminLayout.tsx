import { LayoutDashboard, Users, Clapperboard, Flag, LogOut, Menu, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { BrandLabel } from '../../components/layout/BrandMark'
import { cx } from '../../lib/utils'

const links = [
  { to: '/admin', label: 'Özet', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Kullanıcılar', icon: Users },
  { to: '/admin/content', label: 'İçerik', icon: Clapperboard },
  { to: '/admin/reports', label: 'Şikayet / yardım', icon: Flag },
]

export function AdminLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function leave() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-ink text-white">
      <div className="mx-auto flex min-h-dvh max-w-[1400px]">
        <aside
          className={cx(
            'fixed inset-y-0 left-0 z-40 w-64 border-r border-white/10 bg-ink p-4 transition lg:static lg:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
        >
          <div className="flex items-center justify-between">
            <p className="font-display text-[15px] font-bold">
              <BrandLabel />
            </p>
            <button type="button" className="lg:hidden" onClick={() => setOpen(false)} aria-label="Kapat">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-mute">Yönetim</p>
          <nav className="mt-6 space-y-1">
            {links.map((l) => {
              const Icon = l.icon
              return (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold',
                      isActive ? 'bg-hot/15 text-hot' : 'text-mute hover:bg-white/5 hover:text-white',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {l.label}
                </NavLink>
              )
            })}
          </nav>
          <div className="mt-8 border-t border-white/10 pt-4">
            <p className="truncate text-xs text-mute">{user?.email}</p>
            <button
              type="button"
              onClick={() => void leave()}
              className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-mute hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Çıkış
            </button>
          </div>
        </aside>
        {open ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Kapat"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <header className="safe-topbar-14 sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-ink/90 px-4 backdrop-blur lg:hidden">
            <button type="button" onClick={() => setOpen(true)} aria-label="Menü">
              <Menu className="h-5 w-5" />
            </button>
            <p className="font-semibold">Yönetim</p>
          </header>
          <main className="p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <div className="mt-5">{children}</div>
    </div>
  )
}
