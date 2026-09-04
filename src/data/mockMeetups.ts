import { ADMIN_ID } from '../lib/constants'
import type { Meetup, MeetupRequest } from '../types'

export const DEMO_MEETUP_ID = 'mt_starbucks'

export const mockMeetups: Meetup[] = [
  {
    id: DEMO_MEETUP_ID,
    creatorId: ADMIN_ID,
    title: 'Starbucks’ta Kahve',
    description: '2 kişi olduk, 2 kişi daha arıyoruz. Sakin bir kahve sohbeti.',
    locationName: 'Starbucks - Cadde 54',
    date: '2026-09-12',
    time: '19:00',
    currentParticipants: 2,
    targetParticipants: 2,
    participantPreference: 'female',
    participants: [ADMIN_ID],
    status: 'open',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mt_walk',
    creatorId: 'u_efe',
    title: 'Cadde yürüyüşü',
    description: 'Akşam kısa bir tur. Tempo yavaş, sohbet bol.',
    locationName: 'Bağdat Caddesi – Cadde 54',
    date: '2026-09-14',
    time: '18:30',
    currentParticipants: 1,
    targetParticipants: 3,
    participantPreference: 'any',
    participants: ['u_efe'],
    status: 'open',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
]

export const mockMeetupRequests: MeetupRequest[] = [
  {
    id: 'mr_elif',
    meetupId: DEMO_MEETUP_ID,
    userId: 'u_elif',
    status: 'pending',
    createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
  },
  {
    id: 'mr_melis',
    meetupId: DEMO_MEETUP_ID,
    userId: 'u_melis',
    status: 'pending',
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
  {
    id: 'mr_zeynep',
    meetupId: DEMO_MEETUP_ID,
    userId: 'u_zeynep',
    status: 'pending',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'mr_ayse',
    meetupId: DEMO_MEETUP_ID,
    userId: 'u_ayse',
    status: 'pending',
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
]
