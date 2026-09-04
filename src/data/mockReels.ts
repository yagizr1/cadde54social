import { ADMIN_ID, DEMO_SONG_VIDEOS } from '../lib/constants'
import type { Reel } from '../types'

const now = Date.now()

export const mockReels: Reel[] = [
  {
    id: 'r_1',
    userId: 'u_efe',
    videoUrl: DEMO_SONG_VIDEOS[0],
    caption: 'Cadde 54 intro. Ses aç.',
    music: 'Cadde Nights — DJ Efe',
    likes: [ADMIN_ID, 'u_melis', 'u_emir'],
    comments: [{ id: 'rc_1', userId: 'u_melis', text: 'Bu drop 🔥', createdAt: now - 10 * 60_000 }],
    saves: [ADMIN_ID],
    createdAt: now - 50 * 60_000,
  },
  {
    id: 'r_2',
    userId: 'u_melis',
    videoUrl: DEMO_SONG_VIDEOS[1],
    caption: 'Gece yürüyüşü, hızlı kesit.',
    music: 'Midnight Walk — Melis',
    likes: [ADMIN_ID, 'u_efe'],
    comments: [],
    saves: [],
    createdAt: now - 3 * 60 * 60_000,
  },
  {
    id: 'r_3',
    userId: 'u_emir',
    videoUrl: DEMO_SONG_VIDEOS[2],
    caption: 'Quiz molası. Beyin yandı.',
    music: 'Focus Mode — Emir',
    likes: ['u_berk', ADMIN_ID],
    comments: [{ id: 'rc_2', userId: ADMIN_ID, text: 'Revanche?', createdAt: now - 4 * 60 * 60_000 }],
    saves: [],
    createdAt: now - 8 * 60 * 60_000,
  },
  {
    id: 'r_4',
    userId: 'u_berk',
    videoUrl: DEMO_SONG_VIDEOS[3],
    caption: 'Kaykay line, tek take.',
    music: 'Asphalt — Berk',
    likes: ['u_deniz'],
    comments: [],
    saves: [],
    createdAt: now - 14 * 60 * 60_000,
  },
]
