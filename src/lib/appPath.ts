export const APP_BASE = '/app'

export function appPath(path = '/'): string {
  if (!path || path === '/') return APP_BASE
  if (
    path.startsWith('http') ||
    path.startsWith('mailto:') ||
    path.startsWith('tel:') ||
    path.startsWith('#') ||
    path === '/admin' ||
    path.startsWith('/admin/')
  ) {
    return path
  }
  if (path === APP_BASE || path.startsWith(`${APP_BASE}/`) || path.startsWith(`${APP_BASE}?`)) {
    return path
  }
  if (path.startsWith('?')) return `${APP_BASE}${path}`
  return `${APP_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

export function appRoute(pathname: string): string {
  if (pathname === APP_BASE || pathname === `${APP_BASE}/`) return '/'
  if (pathname.startsWith(`${APP_BASE}/`)) return pathname.slice(APP_BASE.length)
  return pathname
}

export const LEGACY_APP_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/sartlar',
  '/gizlilik',
  '/terms',
  '/privacy',
  '/discover',
  '/reels',
  '/notifications',
  '/p',
  '/profile',
  '/settings',
  '/meet',
  '/meetups',
  '/u',
  '/messages',
  '/confessions',
  '/here',
  '/challenges',
  '/leaderboard',
  '/premium',
  '/business',
  '/rewards',
  '/xp',
  '/friends',
  '/create',
] as const

export function isLegacyAppPath(pathname: string): boolean {
  return LEGACY_APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
