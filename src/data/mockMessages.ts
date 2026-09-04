import { ADMIN_ID } from '../lib/constants'
import type { Conversation } from '../types'

const now = Date.now()

export const mockConversations: Conversation[] = [
  {
    id: 'cv_efe',
    participantIds: [ADMIN_ID, 'u_efe'],
    updatedAt: now - 8 * 60_000,
    messages: [
      { id: 'm1', senderId: 'u_efe', text: 'Bu gece Cadde’de misin?', createdAt: now - 40 * 60_000 },
      { id: 'm2', senderId: ADMIN_ID, text: 'Geliyorum, 20’de oradayım.', createdAt: now - 30 * 60_000 },
      {
        id: 'm2b',
        senderId: ADMIN_ID,
        text: 'Sana bir gönderi gönderdi (@efe)',
        image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
        share: { kind: 'post', username: 'efe', caption: 'Cadde 54 gecesi başka konuşuyor. Kimler burda?' },
        createdAt: now - 20 * 60_000,
      },
      {
        id: 'm2c',
        senderId: 'u_efe',
        text: 'Story yanıtı: 🔥',
        image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=400&q=80',
        share: { kind: 'story_reply', username: 'admin' },
        createdAt: now - 12 * 60_000,
      },
      { id: 'm3', senderId: 'u_efe', text: 'Spot: neon tabelanın önü.', createdAt: now - 8 * 60_000 },
    ],
  },
  {
    id: 'cv_melis',
    participantIds: [ADMIN_ID, 'u_melis'],
    updatedAt: now - 2 * 60 * 60_000,
    messages: [
      { id: 'm4', senderId: 'u_melis', text: 'Playlist’i dinledin mi?', createdAt: now - 3 * 60 * 60_000 },
      { id: 'm5', senderId: ADMIN_ID, text: '3. parça tam Cadde.', createdAt: now - 2 * 60 * 60_000 },
    ],
  },
  {
    id: 'cv_emir',
    participantIds: [ADMIN_ID, 'u_emir'],
    updatedAt: now - 26 * 60 * 60_000,
    messages: [
      { id: 'm6', senderId: 'u_emir', text: '1v1 quiz, kaçmıyorsun dimi?', createdAt: now - 26 * 60 * 60_000 },
    ],
  },
]
