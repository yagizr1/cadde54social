import type { HereSession } from '../types'

const HOUR = 3_600_000
const DAY = 86_400_000

export function mockHereSessions(now = Date.now()): HereSession[] {
  return [
    { id: 'hs_efe_open', userId: 'u_efe', startedAt: now - 3 * HOUR, endedAt: null },
    { id: 'hs_efe_a', userId: 'u_efe', startedAt: now - 2 * DAY, endedAt: now - 2 * DAY + 6 * HOUR },
    { id: 'hs_efe_b', userId: 'u_efe', startedAt: now - 8 * DAY, endedAt: now - 8 * DAY + 4 * HOUR },
    { id: 'hs_melis_open', userId: 'u_melis', startedAt: now - 5 * HOUR, endedAt: null },
    { id: 'hs_melis_a', userId: 'u_melis', startedAt: now - 3 * DAY, endedAt: now - 3 * DAY + 4 * HOUR },
    { id: 'hs_melis_b', userId: 'u_melis', startedAt: now - 10 * DAY, endedAt: now - 10 * DAY + 7 * HOUR },
    { id: 'hs_deniz_open', userId: 'u_deniz', startedAt: now - 80 * 60_000, endedAt: null },
    { id: 'hs_deniz_a', userId: 'u_deniz', startedAt: now - 5 * DAY, endedAt: now - 5 * DAY + 2 * HOUR },
    { id: 'hs_admin_a', userId: 'u_admin', startedAt: now - DAY, endedAt: now - DAY + 3 * HOUR },
    { id: 'hs_admin_b', userId: 'u_admin', startedAt: now - 6 * DAY, endedAt: now - 6 * DAY + 2 * HOUR },
    { id: 'hs_elif_a', userId: 'u_elif', startedAt: now - 4 * DAY, endedAt: now - 4 * DAY + 5 * HOUR },
    { id: 'hs_elif_b', userId: 'u_elif', startedAt: now - 12 * DAY, endedAt: now - 12 * DAY + 3 * HOUR },
    { id: 'hs_berk_a', userId: 'u_berk', startedAt: now - 7 * DAY, endedAt: now - 7 * DAY + 90 * 60_000 },
    { id: 'hs_zeynep_a', userId: 'u_zeynep', startedAt: now - 9 * DAY, endedAt: now - 9 * DAY + 4 * HOUR },
    { id: 'hs_emir_a', userId: 'u_emir', startedAt: now - 11 * DAY, endedAt: now - 11 * DAY + 2 * HOUR },
    { id: 'hs_ayse_a', userId: 'u_ayse', startedAt: now - 14 * DAY, endedAt: now - 14 * DAY + 3 * HOUR },
  ]
}
