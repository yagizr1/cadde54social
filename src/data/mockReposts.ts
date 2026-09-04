import { ADMIN_ID } from '../lib/constants'
import type { Repost } from '../types'

const now = Date.now()

export const mockReposts: Repost[] = [
  {
    id: 'rp_1',
    userId: ADMIN_ID,
    kind: 'post',
    targetId: 'p_1',
    createdAt: now - 25 * 60_000,
  },
  {
    id: 'rp_2',
    userId: ADMIN_ID,
    kind: 'reel',
    targetId: 'r_1',
    createdAt: now - 40 * 60_000,
  },
  {
    id: 'rp_3',
    userId: 'u_efe',
    kind: 'post',
    targetId: 'p_3',
    createdAt: now - 90 * 60_000,
  },
]
