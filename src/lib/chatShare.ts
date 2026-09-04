import type { ChatMessage, ChatShare, ChatShareKind } from '../types'

export type ParsedShare = ChatShare & {
  note: string
  reply: string
}

const PATTERNS: { kind: ChatShareKind; re: RegExp }[] = [
  { kind: 'post', re: /^Sana bir gönderi gönderdi \(@([^)]+)\)(?:\n([\s\S]*))?$/ },
  { kind: 'story', re: /^Sana bir story gönderdi \(@([^)]+)\)(?:\n([\s\S]*))?$/ },
  { kind: 'reel', re: /^Sana bir Reels gönderdi \(@([^)]+)\)(?:\n([\s\S]*))?$/i },
  { kind: 'profile', re: /^Sana bir profil gönderdi \(@([^)]+)\)(?:\n([\s\S]*))?$/ },
  { kind: 'story_reply', re: /^Story yanıtı:\s*([\s\S]+)$/ },
]

export function parseShare(m: ChatMessage): ParsedShare | null {
  if (m.share) {
    const note = m.share.kind === 'story_reply' ? '' : extraNote(m.text)
    const reply = m.share.kind === 'story_reply' ? storyReplyText(m.text) : ''
    return { ...m.share, note, reply }
  }
  for (const { kind, re } of PATTERNS) {
    const match = m.text.match(re)
    if (!match) continue
    if (kind === 'story_reply') {
      return { kind, username: undefined, note: '', reply: match[1].trim() }
    }
    return { kind, username: match[1], note: (match[2] ?? '').trim(), reply: '' }
  }
  return null
}

function extraNote(text: string): string {
  const i = text.indexOf('\n')
  return i >= 0 ? text.slice(i + 1).trim() : ''
}

function storyReplyText(text: string): string {
  return text.replace(/^Story yanıtı:\s*/, '').trim()
}
