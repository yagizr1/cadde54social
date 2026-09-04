import { ADMIN_ID } from '../lib/constants'
import type { Confession } from '../types'

const now = Date.now()

export const mockConfessions: Confession[] = [
  {
    id: 'cf_1',
    content:
      'Bugün Cadde 54’te saat 18:30 civarında siyah montlu bir kız gördüm. Eğer buradaysan ulaşabilir misin? 😂',
    likes: [ADMIN_ID, 'u_efe', 'u_emir', 'u_berk'],
    comments: [
      { id: 'cfc_1', userId: 'u_melis', text: 'Bu Cadde klasikleri 😭', createdAt: now - 30 * 60_000 },
    ],
    reports: [],
    createdAt: now - 70 * 60_000,
  },
  {
    id: 'cf_2',
    content: 'Dün gece DJ set’inde yanımda duran kişiye bir şey söyleyemedim. Hâlâ düşünüyorum.',
    likes: ['u_zeynep', ADMIN_ID],
    comments: [],
    reports: [],
    createdAt: now - 5 * 60 * 60_000,
  },
  {
    id: 'cf_3',
    content: 'İtiraf: challenge’ları bitirmeden uyuyamıyorum. XP hastalığı başladı.',
    likes: ['u_emir', 'u_efe', 'u_deniz'],
    comments: [{ id: 'cfc_2', userId: 'u_emir', text: 'Aynı gemideyiz.', createdAt: now - 8 * 60 * 60_000 }],
    reports: [],
    createdAt: now - 12 * 60 * 60_000,
  },
]
