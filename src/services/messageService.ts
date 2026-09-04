import { uid } from '../lib/utils'
import type { ChatMessage, ChatReplyTo, ChatShare, Conversation } from '../types'
import { challengeService } from './challengeService'
import { notificationService } from './notificationService'
import { settingsService } from './settingsService'
import { getItem, setItem } from './storage'
import { sync } from './syncService'
import { userService } from './userService'

function all(): Conversation[] {
  return getItem<Conversation[]>('conversations', [])
}

export const messageService = {
  list(userId: string): Conversation[] {
    return all()
      .filter((c) => c.participantIds.includes(userId))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  },

  unread(conv: Conversation, userId: string): boolean {
    const other = conv.participantIds.find((id) => id !== userId)
    if (!other || settingsService.isBlocked(userId, other)) return false
    const last = [...conv.messages].reverse().find((m) => !m.system)
    if (!last || last.senderId === userId) return false
    return (conv.lastRead?.[userId] ?? 0) < last.createdAt
  },

  unreadCount(userId: string): number {
    return this.list(userId).filter((c) => this.unread(c, userId)).length
  },

  get(id: string): Conversation | undefined {
    return all().find((c) => c.id === id)
  },

  withUser(meId: string, otherId: string): Conversation {
    if (settingsService.isBlocked(meId, otherId)) {
      throw new Error('Bu kullanıcıyla mesajlaşamazsın')
    }
    const found = all().find(
      (c) => c.participantIds.includes(meId) && c.participantIds.includes(otherId),
    )
    if (found) return found
    const created: Conversation = {
      id: uid('cv'),
      participantIds: [meId, otherId],
      messages: [],
      updatedAt: Date.now(),
    }
    setItem('conversations', [created, ...all()])
    sync('messages.ensure', { id: created.id, otherId })
    return created
  },

  send(
    conversationId: string,
    senderId: string,
    text: string,
    image?: string,
    video?: string,
    share?: ChatShare,
    replyTo?: ChatReplyTo,
    viewOnce?: boolean,
  ): Conversation | undefined {
    const list = all()
    const conv = list.find((c) => c.id === conversationId)
    if (!conv) return undefined
    const other = conv.participantIds.find((id) => id !== senderId)
    if (other && settingsService.isBlocked(senderId, other)) return undefined
    const msg: ChatMessage = {
      id: uid('m'),
      senderId,
      text,
      image,
      video,
      share,
      replyTo,
      reactions: [],
      createdAt: Date.now(),
      viewOnce: viewOnce || undefined,
      openedBy: [],
    }
    conv.messages = [...conv.messages, msg]
    conv.updatedAt = Date.now()
    delete conv.pendingRequestFor
    setItem('conversations', list)
    sync('messages.send', {
      id: msg.id,
      conversationId,
      text,
      image,
      video,
      share,
      replyTo,
      viewOnce: Boolean(viewOnce),
    })
    if (other) {
      challengeService.track(senderId, 'interact_users', other)
      const sender = userService.getById(senderId)
      notificationService.notify({
        type: 'message',
        actorId: senderId,
        recipientId: other,
        text: 'sana bir mesaj gönderdi',
        href: `/messages/${conversationId}`,
        image: sender?.avatar,
        groupKey: `message:${conversationId}`,
      })
    }
    return conv
  },

  addSystem(conversationId: string, text: string): Conversation | undefined {
    const list = all()
    const conv = list.find((c) => c.id === conversationId)
    if (!conv) return undefined
    if (conv.messages.some((m) => m.system && m.text === text)) return conv
    conv.messages = [
      ...conv.messages,
      {
        id: uid('m'),
        senderId: 'system',
        text,
        system: true,
        createdAt: Date.now(),
      },
    ]
    conv.updatedAt = Date.now()
    setItem('conversations', list)
    sync('messages.system', { conversationId, text })
    return conv
  },

  removeConversations(ids: string[]): void {
    const hide = new Set(ids)
    setItem(
      'conversations',
      all().filter((c) => !hide.has(c.id)),
    )
    sync('messages.removeConversations', { ids })
  },

  removeMessages(conversationId: string, messageIds: string[]): void {
    const hide = new Set(messageIds)
    const list = all()
    const conv = list.find((c) => c.id === conversationId)
    if (!conv) return
    conv.messages = conv.messages.filter((m) => !hide.has(m.id))
    conv.updatedAt = Date.now()
    setItem('conversations', list)
    sync('messages.removeMessages', { conversationId, messageIds })
  },

  react(conversationId: string, messageId: string, userId: string, emoji: string): void {
    const list = all()
    const conv = list.find((c) => c.id === conversationId)
    if (!conv) return
    const other = conv.participantIds.find((id) => id !== userId)
    if (other && settingsService.isBlocked(userId, other)) return
    const msg = conv.messages.find((m) => m.id === messageId)
    if (!msg) return
    const reactions = msg.reactions ?? []
    const mine = reactions.find((r) => r.userId === userId)
    msg.reactions =
      mine?.emoji === emoji
        ? reactions.filter((r) => r.userId !== userId)
        : [...reactions.filter((r) => r.userId !== userId), { userId, emoji }]
    setItem('conversations', list)
    sync('messages.react', { conversationId, messageId, emoji })
  },

  markRead(conversationId: string, userId: string): void {
    const list = all()
    const conv = list.find((c) => c.id === conversationId)
    if (!conv) return
    conv.lastRead = { ...(conv.lastRead ?? {}), [userId]: Date.now() }
    setItem('conversations', list)
    sync('messages.read', { conversationId })
  },

  seenByOther(conv: Conversation, meId: string, otherId: string): boolean {
    if (settingsService.isBlocked(meId, otherId)) return false
    const lastMine = [...conv.messages].reverse().find((m) => m.senderId === meId)
    if (!lastMine) return false
    return (conv.lastRead?.[otherId] ?? 0) >= lastMine.createdAt
  },

  onceOpenedBy(message: ChatMessage, userId: string): boolean {
    return (message.openedBy ?? []).includes(userId)
  },

  onceSeenByOther(message: ChatMessage): boolean {
    return (message.openedBy ?? []).some((id) => id !== message.senderId)
  },

  canOpenOnce(message: ChatMessage, userId: string): boolean {
    if (!message.viewOnce || !message.image) return false
    if (userId === message.senderId) return !this.onceSeenByOther(message)
    return !this.onceOpenedBy(message, userId)
  },

  openOnce(conversationId: string, messageId: string, userId: string): void {
    const list = all()
    const conv = list.find((c) => c.id === conversationId)
    if (!conv) return
    const msg = conv.messages.find((m) => m.id === messageId)
    if (!msg?.viewOnce) return
    const opened = msg.openedBy ?? []
    if (opened.includes(userId)) return
    msg.openedBy = [...opened, userId]
    setItem('conversations', list)
    sync('messages.openOnce', { conversationId, messageId })
  },
}
