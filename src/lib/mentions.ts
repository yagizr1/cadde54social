import { settingsService } from '../services/settingsService'
import { userService } from '../services/userService'
import type { User } from '../types'

const TOKEN = /@([a-zA-Z0-9._]+)/g

export function mentionedUsernames(text: string): string[] {
  const names = new Set<string>()
  for (const match of text.matchAll(TOKEN)) names.add(match[1].toLowerCase())
  return [...names]
}

export function mentionedUsers(text: string, meId?: string): User[] {
  return mentionedUsernames(text)
    .map((name) => userService.getByUsername(name))
    .filter((u): u is User => u != null && u.id !== meId)
}

export function mentionQueryAt(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret)
  const at = before.lastIndexOf('@')
  if (at < 0) return null
  if (at > 0 && !/\s/.test(before[at - 1])) return null
  const query = before.slice(at + 1)
  if (/\s/.test(query)) return null
  return { start: at, query }
}

export function insertMention(text: string, caret: number, username: string): { text: string; caret: number } {
  const token = `@${username} `
  const hit = mentionQueryAt(text, caret)
  if (!hit) {
    const next = `${text}${text && !/\s$/.test(text) ? ' ' : ''}${token}`
    return { text: next, caret: next.length }
  }
  const next = `${text.slice(0, hit.start)}${token}${text.slice(caret)}`
  return { text: next, caret: hit.start + token.length }
}

export function searchMentionUsers(meId: string, query: string): User[] {
  const me = userService.getById(meId)
  const q = query.toLowerCase()
  return userService
    .list()
    .filter((u) => {
      if (u.id === meId) return false
      if (settingsService.iBlocked(u.id, meId)) return false
      if (!q) return true
      return u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const af = me?.following.includes(a.id) ? 0 : 1
      const bf = me?.following.includes(b.id) ? 0 : 1
      if (af !== bf) return af - bf
      return a.username.localeCompare(b.username)
    })
    .slice(0, 6)
}
