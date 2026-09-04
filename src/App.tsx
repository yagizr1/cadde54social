import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { ToastHost } from './components/ui/ToastHost'
import { BusinessPage } from './pages/BusinessPage'
import { ChallengesPage } from './pages/ChallengesPage'
import { ConfessionsPage } from './pages/ConfessionsPage'
import { ConversationPage } from './pages/ConversationPage'
import { CreatePage } from './pages/CreatePage'
import { DiscoverPage } from './pages/DiscoverPage'
import { EditProfilePage } from './pages/EditProfilePage'
import { FriendsPage } from './pages/FriendsPage'
import { HerePage } from './pages/HerePage'
import { HomePage } from './pages/HomePage'
import { InsightsPage } from './pages/InsightsPage'
import { LandingPage } from './pages/LandingPage'
import { LegalPage } from './pages/LegalPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { MeetupDetailPage } from './pages/MeetupDetailPage'
import { MeetupEditorPage } from './pages/MeetupEditorPage'
import { MeetPage } from './pages/MeetPage'
import { MeetupsPage } from './pages/MeetupsPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { MessagesPage } from './pages/MessagesPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { PostPage } from './pages/PostPage'
import { PremiumPage } from './pages/PremiumPage'
import { ProfilePage } from './pages/ProfilePage'
import { ProfileViewsPage } from './pages/ProfileViewsPage'
import { ReelsPage } from './pages/ReelsPage'
import { RegisterPage } from './pages/RegisterPage'
import { RewardsPage } from './pages/RewardsPage'
import { SettingsPage } from './pages/SettingsPage'
import { UserProfilePage } from './pages/UserProfilePage'
import { XpHistoryPage } from './pages/XpHistoryPage'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminContent } from './pages/admin/AdminContent'
import { AdminReports } from './pages/admin/AdminReports'
import { APP_BASE, isLegacyAppPath } from './lib/appPath'
import { isAdminUser } from './lib/admin'
import { getToken } from './lib/api'
import { pullSnapshot } from './services/syncService'
import { useAuthStore } from './store/authStore'

function GuestRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)
  const [params] = useSearchParams()
  const adding = params.get('add') === '1'
  if (!hydrated) return null
  if (user && !adding) {
    if (isAdminUser(user)) return <Navigate to="/admin" replace />
    return <Navigate to={APP_BASE} replace />
  }
  return children
}

function AdminRoute() {
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)
  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-hot" />
      </div>
    )
  }
  if (!user) return <Navigate to={`${APP_BASE}/login`} replace />
  if (!isAdminUser(user)) return <Navigate to={APP_BASE} replace />
  return <Outlet />
}

function LegacyOrHome() {
  const { pathname, search } = useLocation()
  if (isLegacyAppPath(pathname)) {
    return <Navigate to={`${APP_BASE}${pathname}${search}`} replace />
  }
  return <Navigate to="/" replace />
}

export default function App() {
  const refresh = useAuthStore((s) => s.refresh)

  useEffect(() => {
    refresh()
    const onFocus = () => {
      if (!getToken()) return
      void pullSnapshot().then((snap) => {
        if (snap.me) useAuthStore.setState({ user: snap.me })
      })
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  return (
    <BrowserRouter>
      <ToastHost />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sartlar" element={<LegalPage kind="terms" />} />
        <Route path="/gizlilik" element={<LegalPage kind="privacy" />} />
        <Route path="/terms" element={<LegalPage kind="terms" />} />
        <Route path="/privacy" element={<LegalPage kind="privacy" />} />
        <Route path="/admin" element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>
        </Route>
        <Route path={APP_BASE}>
          <Route
            path="login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
          <Route
            path="forgot-password"
            element={
              <GuestRoute>
                <ForgotPasswordPage />
              </GuestRoute>
            }
          />
          <Route path="sartlar" element={<LegalPage kind="terms" />} />
          <Route path="gizlilik" element={<LegalPage kind="privacy" />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="discover" element={<DiscoverPage />} />
              <Route path="reels" element={<ReelsPage />} />
              <Route path="reels/:id" element={<ReelsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="p/:id" element={<PostPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="profile/edit" element={<EditProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/:section" element={<SettingsPage />} />
              <Route path="profile/views" element={<ProfileViewsPage />} />
              <Route path="profile/insights" element={<InsightsPage />} />
              <Route path="meet" element={<MeetPage />} />
              <Route path="meetups" element={<MeetupsPage />} />
              <Route path="meetups/new" element={<MeetupEditorPage />} />
              <Route path="meetups/:id/edit" element={<MeetupEditorPage />} />
              <Route path="meetups/:id" element={<MeetupDetailPage />} />
              <Route path="u/:username" element={<UserProfilePage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="messages/:id" element={<ConversationPage />} />
              <Route path="confessions" element={<ConfessionsPage />} />
              <Route path="here" element={<HerePage />} />
              <Route path="challenges" element={<ChallengesPage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="premium" element={<PremiumPage />} />
              <Route path="business" element={<BusinessPage />} />
              <Route path="rewards" element={<RewardsPage />} />
              <Route path="xp" element={<XpHistoryPage />} />
              <Route path="friends" element={<FriendsPage />} />
              <Route path="create" element={<CreatePage />} />
              <Route path="create/post" element={<CreatePage />} />
              <Route path="create/story" element={<CreatePage />} />
              <Route path="create/reel" element={<CreatePage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<LegacyOrHome />} />
      </Routes>
    </BrowserRouter>
  )
}
