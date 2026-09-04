import { uid } from '../lib/utils'
import type {
  Gender,
  Meetup,
  MeetupPreference,
  MeetupRequest,
  MeetupRequestStatus,
  User,
} from '../types'
import { notificationService } from './notificationService'
import { settingsService } from './settingsService'
import { getItem, setItem } from './storage'
import { sync } from './syncService'
import { userService } from './userService'

export type MeetupCreateInput = {
  creatorId: string
  title: string
  description: string
  locationName: string
  date: string
  time: string
  currentParticipants: number
  targetParticipants: number
  participantPreference: MeetupPreference
}

export type MeetupCapacity = {
  filled: number
  total: number
  remaining: number
  isFull: boolean
}

function meetups(): Meetup[] {
  return getItem<Meetup[]>('meetups', [])
}

function saveMeetups(list: Meetup[]): void {
  setItem('meetups', list)
}

function requests(): MeetupRequest[] {
  return getItem<MeetupRequest[]>('meetupRequests', [])
}

function saveRequests(list: MeetupRequest[]): void {
  setItem('meetupRequests', list)
}

function nowIso(): string {
  return new Date().toISOString()
}

function acceptedExtras(meetup: Meetup): number {
  return meetup.participants.filter((id) => id !== meetup.creatorId).length
}

function preferenceAllows(pref: MeetupPreference, gender: Gender | undefined): boolean {
  if (pref === 'any') return true
  if (!gender || gender === 'unspecified') return false
  return pref === gender
}

function eligibilityMessage(pref: MeetupPreference): string {
  if (pref === 'female') return 'Bu buluşma yalnızca kız kullanıcıların katılımına açıktır.'
  if (pref === 'male') return 'Bu buluşma yalnızca erkek kullanıcıların katılımına açıktır.'
  return 'Bu buluşmaya şu an başvuramazsın.'
}

function notify(
  text: string,
  href: string,
  opts: { recipientId: string; actorId?: string; image?: string },
): void {
  notificationService.notify({
    type: 'meetup',
    text,
    href,
    recipientId: opts.recipientId,
    actorId: opts.actorId,
    image: opts.image,
  })
}

function replaceMeetup(next: Meetup): Meetup {
  const list = meetups()
  const idx = list.findIndex((m) => m.id === next.id)
  if (idx >= 0) list[idx] = next
  else list.unshift(next)
  saveMeetups(list)
  return next
}

function liveStatus(meetup: Meetup): Meetup {
  if (meetup.status === 'cancelled' || meetup.status === 'completed') return meetup
  const cap = meetupService.capacity(meetup)
  const status = cap.isFull ? 'full' : 'open'
  return status === meetup.status ? meetup : { ...meetup, status }
}

function persistStatus(meetup: Meetup): Meetup {
  const next = liveStatus(meetup)
  if (next.status === meetup.status && next === meetup) return meetup
  return replaceMeetup(next)
}

export const meetupService = {
  getMeetups(): Meetup[] {
    return meetups()
      .map(liveStatus)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  getMeetupById(id: string): Meetup | undefined {
    const found = meetups().find((m) => m.id === id)
    return found ? liveStatus(found) : undefined
  },

  capacity(meetup: Meetup): MeetupCapacity {
    const total = meetup.currentParticipants + meetup.targetParticipants
    const filled = meetup.currentParticipants + acceptedExtras(meetup)
    const remaining = Math.max(0, total - filled)
    return { filled, total, remaining, isFull: filled >= total }
  },

  canApply(meetup: Meetup, user: User): { ok: boolean; reason?: string } {
    if (meetup.creatorId === user.id) return { ok: false, reason: 'Kendi buluşmana başvuramazsın.' }
    if (meetup.status === 'cancelled') return { ok: false, reason: 'Bu buluşma iptal edildi.' }
    if (meetup.status === 'completed') return { ok: false, reason: 'Bu buluşma tamamlandı.' }
    if (this.capacity(meetup).isFull || meetup.status === 'full') {
      return { ok: false, reason: '🎉 Buluşma doldu!' }
    }
    if (settingsService.iBlocked(meetup.creatorId, user.id)) {
      return { ok: false, reason: 'Bu buluşmaya başvuramazsın.' }
    }
    if (meetup.participants.includes(user.id)) {
      return { ok: false, reason: 'Zaten katılımcısın.' }
    }
    const existing = this.getUserRequest(meetup.id, user.id)
    if (existing) return { ok: false, reason: 'Bu buluşmaya zaten başvurdun.' }
    if (!preferenceAllows(meetup.participantPreference, user.gender)) {
      return { ok: false, reason: eligibilityMessage(meetup.participantPreference) }
    }
    return { ok: true }
  },

  preferenceLabel(pref: MeetupPreference): string {
    if (pref === 'female') return 'Sadece kız kullanıcılar'
    if (pref === 'male') return 'Sadece erkek kullanıcılar'
    return 'Herkes başvurabilir'
  },

  formatWhen(meetup: Meetup): { dateLabel: string; timeLabel: string } {
    const [y, mo, d] = meetup.date.split('-').map(Number)
    const dateLabel = new Date(y, (mo ?? 1) - 1, d ?? 1).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return { dateLabel, timeLabel: meetup.time }
  },

  commonFollowers(aId: string, bId: string): number {
    const a = userService.getById(aId)
    const b = userService.getById(bId)
    if (!a || !b) return 0
    const set = new Set(a.followers)
    return b.followers.filter((id) => set.has(id)).length
  },

  createMeetup(input: MeetupCreateInput): Meetup {
    const title = input.title.trim()
    const locationName = input.locationName.trim()
    if (title.length < 3) throw new Error('Etkinlik adı en az 3 karakter olmalı')
    if (!locationName) throw new Error('Mekan yazmalısın')
    if (!input.date) throw new Error('Tarih seç')
    if (!input.time) throw new Error('Saat seç')
    if (!input.participantPreference) throw new Error('Kimler katılabilir seç')
    if (input.currentParticipants < 1) throw new Error('Mevcut kişi en az 1 olmalı')
    if (input.targetParticipants < 1) throw new Error('Aranan kişi en az 1 olmalı')

    const meetup: Meetup = {
      id: uid('mt'),
      creatorId: input.creatorId,
      title,
      description: input.description.trim(),
      locationName,
      date: input.date,
      time: input.time,
      currentParticipants: Math.floor(input.currentParticipants),
      targetParticipants: Math.floor(input.targetParticipants),
      participantPreference: input.participantPreference,
      participants: [input.creatorId],
      status: 'open',
      createdAt: nowIso(),
    }
    saveMeetups([meetup, ...meetups()])
    sync('meetups.create', { ...meetup })
    return meetup
  },

  updateMeetup(id: string, actorId: string, patch: Partial<MeetupCreateInput>): Meetup {
    const meetup = this.getMeetupById(id)
    if (!meetup) throw new Error('Buluşma bulunamadı')
    if (meetup.creatorId !== actorId) throw new Error('Sadece etkinlik sahibi düzenleyebilir')
    if (meetup.status === 'cancelled') throw new Error('İptal edilen buluşma düzenlenemez')

    const next: Meetup = {
      ...meetup,
      title: patch.title?.trim() || meetup.title,
      description: patch.description !== undefined ? patch.description.trim() : meetup.description,
      locationName: patch.locationName?.trim() || meetup.locationName,
      date: patch.date || meetup.date,
      time: patch.time || meetup.time,
      currentParticipants: patch.currentParticipants ?? meetup.currentParticipants,
      targetParticipants: patch.targetParticipants ?? meetup.targetParticipants,
      participantPreference: patch.participantPreference ?? meetup.participantPreference,
    }
    if (next.title.length < 3) throw new Error('Etkinlik adı en az 3 karakter olmalı')
    if (next.currentParticipants < 1 || next.targetParticipants < 1) {
      throw new Error('Kişi sayıları en az 1 olmalı')
    }
    const saved = persistStatus(replaceMeetup(next))
    sync('meetups.update', { ...saved })
    return saved
  },

  deleteMeetup(id: string, actorId: string): void {
    const meetup = this.getMeetupById(id)
    if (!meetup) throw new Error('Buluşma bulunamadı')
    if (meetup.creatorId !== actorId) throw new Error('Sadece etkinlik sahibi silebilir')
    saveMeetups(meetups().filter((m) => m.id !== id))
    saveRequests(requests().filter((r) => r.meetupId !== id))
    sync('meetups.delete', { id })
  },

  cancelMeetup(id: string, actorId: string): Meetup {
    const meetup = this.getMeetupById(id)
    if (!meetup) throw new Error('Buluşma bulunamadı')
    if (meetup.creatorId !== actorId) throw new Error('Sadece etkinlik sahibi iptal edebilir')
    const next = replaceMeetup({ ...meetup, status: 'cancelled' })
    for (const uidPart of next.participants) {
      if (uidPart === actorId) continue
      notify(`“${next.title}” buluşması iptal edildi.`, `/meetups/${next.id}`, {
        recipientId: uidPart,
        actorId,
      })
    }
    sync('meetups.cancel', { id })
    return next
  },

  sendMeetupRequest(meetupId: string, userId: string): MeetupRequest {
    const meetup = this.getMeetupById(meetupId)
    if (!meetup) throw new Error('Buluşma bulunamadı')
    const user = userService.getById(userId)
    if (!user) throw new Error('Kullanıcı bulunamadı')
    const gate = this.canApply(meetup, user)
    if (!gate.ok) throw new Error(gate.reason ?? 'Başvuru gönderilemedi')

    const row: MeetupRequest = {
      id: uid('mr'),
      meetupId,
      userId,
      status: 'pending',
      createdAt: nowIso(),
    }
    saveRequests([row, ...requests()])
    sync('meetups.request', { id: row.id, meetupId })
    notify(
      `👋 Yeni katılma isteği\n${user.name}, “${meetup.title}” buluşmana katılmak istiyor.`,
      `/meetups/${meetup.id}`,
      { recipientId: meetup.creatorId, actorId: user.id, image: user.avatar },
    )
    return row
  },

  cancelMeetupRequest(meetupId: string, userId: string): void {
    const row = this.getUserRequest(meetupId, userId)
    if (!row) throw new Error('Başvuru bulunamadı')
    if (row.status !== 'pending') throw new Error('Bu başvuru artık iptal edilemez')
    saveRequests(requests().filter((r) => r.id !== row.id))
    sync('meetups.cancelRequest', { meetupId })
  },

  getMeetupRequests(meetupId: string, status?: MeetupRequestStatus | 'all'): MeetupRequest[] {
    return requests()
      .filter((r) => r.meetupId === meetupId && (status === 'all' || !status || r.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  getUserRequest(meetupId: string, userId: string): MeetupRequest | undefined {
    return requests().find((r) => r.meetupId === meetupId && r.userId === userId)
  },

  acceptMeetupRequest(requestId: string, actorId: string): Meetup {
    const row = requests().find((r) => r.id === requestId)
    if (!row) throw new Error('İstek bulunamadı')
    const meetup = this.getMeetupById(row.meetupId)
    if (!meetup) throw new Error('Buluşma bulunamadı')
    if (meetup.creatorId !== actorId) throw new Error('Sadece etkinlik sahibi kabul edebilir')
    if (row.status !== 'pending') throw new Error('Bu istek artık bekleyen değil')
    if (this.capacity(meetup).isFull) throw new Error('🎉 Buluşma doldu!')

    const applicant = userService.getById(row.userId)
    const when = this.formatWhen(meetup)
    const nextParticipants = meetup.participants.includes(row.userId)
      ? meetup.participants
      : [...meetup.participants, row.userId]
    let next: Meetup = replaceMeetup({ ...meetup, participants: nextParticipants })
    next = persistStatus(next)

    const list = requests()
    const idx = list.findIndex((r) => r.id === requestId)
    const current = idx >= 0 ? list[idx] : undefined
    if (current) list[idx] = { ...current, status: 'accepted', updatedAt: nowIso() }
    saveRequests(list)

    notify(
      `🎉 Katılımın kabul edildi!\n“${meetup.title}” buluşmasına katılacaksın.\n📍 ${meetup.locationName}\n🕖 ${when.timeLabel}`,
      `/meetups/${meetup.id}`,
      { recipientId: row.userId, actorId, image: applicant?.avatar },
    )
    if (next.status === 'full') {
      notify(`🎉 Buluşman tamamen doldu!\n“${meetup.title}”`, `/meetups/${meetup.id}`, {
        recipientId: meetup.creatorId,
      })
    }
    sync('meetups.accept', { requestId })
    return next
  },

  rejectMeetupRequest(requestId: string, actorId: string): MeetupRequest {
    const row = requests().find((r) => r.id === requestId)
    if (!row) throw new Error('İstek bulunamadı')
    const meetup = this.getMeetupById(row.meetupId)
    if (!meetup) throw new Error('Buluşma bulunamadı')
    if (meetup.creatorId !== actorId) throw new Error('Sadece etkinlik sahibi reddedebilir')
    if (row.status !== 'pending') throw new Error('Bu istek artık bekleyen değil')

    const next: MeetupRequest = { ...row, status: 'rejected', updatedAt: nowIso() }
    saveRequests(requests().map((r) => (r.id === requestId ? next : r)))
    notify('Buluşma isteğin kabul edilmedi.', `/meetups/${meetup.id}`, {
      recipientId: row.userId,
      actorId,
    })
    sync('meetups.reject', { requestId })
    return next
  },

  removeMeetupParticipant(meetupId: string, userId: string, actorId: string): Meetup {
    const meetup = this.getMeetupById(meetupId)
    if (!meetup) throw new Error('Buluşma bulunamadı')
    if (meetup.creatorId !== actorId) throw new Error('Sadece etkinlik sahibi katılımcı çıkarabilir')
    if (userId === meetup.creatorId) throw new Error('Kendini çıkaramazsın')
    if (!meetup.participants.includes(userId)) throw new Error('Bu kullanıcı katılımcı değil')

    const next = replaceMeetup({
      ...meetup,
      participants: meetup.participants.filter((id) => id !== userId),
      status: meetup.status === 'cancelled' ? 'cancelled' : 'open',
    })
    saveRequests(
      requests().map((r) =>
        r.meetupId === meetupId && r.userId === userId ? { ...r, status: 'rejected', updatedAt: nowIso() } : r,
      ),
    )
    notify(`“${meetup.title}” buluşmasından çıkarıldın.`, `/meetups/${meetup.id}`, {
      recipientId: userId,
      actorId,
    })
    sync('meetups.removeParticipant', { meetupId, userId })
    return persistStatus(next)
  },
}
