import { ADMIN_ID, STORY_TTL_MS } from '../lib/constants'
import type { Story } from '../types'

const now = Date.now()

export const mockStories: Story[] = [
  {
    id: 's_admin_1',
    userId: ADMIN_ID,
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
    createdAt: now - 25 * 60_000,
    expiresAt: now - 25 * 60_000 + STORY_TTL_MS,
    viewedBy: ['u_efe', 'u_melis', 'u_emir', 'u_zeynep'],
    likes: ['u_efe', 'u_melis'],
  },
  {
    id: 's_efe_1',
    userId: 'u_efe',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80',
    createdAt: now - 40 * 60_000,
    expiresAt: now - 40 * 60_000 + STORY_TTL_MS,
    viewedBy: [],
    likes: [],
  },
  {
    id: 's_melis_1',
    userId: 'u_melis',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
    createdAt: now - 90 * 60_000,
    expiresAt: now - 90 * 60_000 + STORY_TTL_MS,
    viewedBy: [ADMIN_ID],
    likes: [],
  },
  {
    id: 's_emir_1',
    userId: 'u_emir',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80',
    createdAt: now - 3 * 60 * 60_000,
    expiresAt: now - 3 * 60 * 60_000 + STORY_TTL_MS,
    viewedBy: [],
    likes: [],
  },
  {
    id: 's_zeynep_1',
    userId: 'u_zeynep',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
    createdAt: now - 5 * 60 * 60_000,
    expiresAt: now - 5 * 60 * 60_000 + STORY_TTL_MS,
    viewedBy: [],
    likes: [],
  },
]
