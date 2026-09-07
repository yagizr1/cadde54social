import { api, getToken } from '../lib/api'
import { messageService } from './messageService'
import { useLiveStore } from '../store/liveStore'
import type { ChatMessage, Conversation } from '../types'

export type LiveEvent =
  | {
      type: 'message'
      conversationId: string
      participantIds: string[]
      message: ChatMessage
    }
  | { type: 'typing'; conversationId: string; userId: string; typing: boolean }
  | { type: 'read'; conversationId: string; userId: string; at: number }
  | { type: 'react'; conversationId: string; messageId: string; reactions: ChatMessage['reactions'] }

function bumpIf(changed: boolean) {
  if (changed) useLiveStore.getState().bump()
}

export function handleLiveEvent(event: LiveEvent): void {
  if (event.type === 'message') {
    bumpIf(messageService.applyMessage(event.conversationId, event.participantIds, event.message))
    useLiveStore.getState().setTyping(event.conversationId, event.message.senderId, false)
    return
  }
  if (event.type === 'typing') {
    useLiveStore.getState().setTyping(event.conversationId, event.userId, event.typing)
    return
  }
  if (event.type === 'read') {
    bumpIf(messageService.applyRead(event.conversationId, event.userId, event.at))
    return
  }
  if (event.type === 'react') {
    bumpIf(messageService.applyReact(event.conversationId, event.messageId, event.reactions))
  }
}

export async function pullChatSync(): Promise<void> {
  const data = await api<{
    conversations?: Conversation[]
    typing?: Array<{ conversationId: string; userId: string; until: number }>
  }>(`/api/chat/sync?since=${messageService.maxUpdatedAt()}`)
  if (data.conversations?.length) bumpIf(messageService.ingestMany(data.conversations))
  if (data.typing) useLiveStore.getState().applyTyping(data.typing)
}

function parseSseBlock(block: string): LiveEvent | null {
  for (const line of block.split('\n')) {
    if (!line.startsWith('data: ')) continue
    try {
      return JSON.parse(line.slice(6)) as LiveEvent
    } catch {
      return null
    }
  }
  return null
}

export async function connectLive(signal: AbortSignal): Promise<void> {
  const token = getToken()
  if (!token) return
  const res = await fetch(`/api/live?token=${encodeURIComponent(token)}`, {
    headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
    signal,
  })
  if (!res.ok || !res.body) throw new Error('live')
  useLiveStore.getState().setConnected(true)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const parts = buf.split('\n\n')
      buf = parts.pop() ?? ''
      for (const block of parts) {
        const event = parseSseBlock(block)
        if (event) handleLiveEvent(event)
      }
    }
  } finally {
    useLiveStore.getState().setConnected(false)
  }
}
