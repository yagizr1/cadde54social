import { Outlet, useLocation } from 'react-router-dom'
import { Navigate } from '../../lib/nav'
import { isAdminUser } from '../../lib/admin'
import { useAuthStore } from '../../store/authStore'

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)
  const location = useLocation()

  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-hot" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (isAdminUser(user)) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}
