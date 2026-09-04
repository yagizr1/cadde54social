import { uid } from '../lib/utils'
import type { Comment, Confession } from '../types'
import { challengeService } from './challengeService'
import { getItem, setItem } from './storage'
import { sync } from './syncService'

function all(): Confession[] {
  return getItem<Confession[]>('confessions', [])
}

export const confessionService = {
  list(): Confession[] {
    return all().sort((a, b) => b.createdAt - a.createdAt)
  },

  create(content: string): Confession {
    const item: Confession = {
      id: uid('cf'),
      content,
      likes: [],
      comments: [],
      reports: [],
      createdAt: Date.now(),
    }
    setItem('confessions', [item, ...all()])
    sync('confessions.create', { id: item.id, content })
    return item
  },

  toggleLike(id: string, userId: string): Confession | undefined {
    const list = all()
    const item = list.find((c) => c.id === id)
    if (!item) return undefined
    const liked = item.likes.includes(userId)
    item.likes = liked ? item.likes.filter((x) => x !== userId) : [...item.likes, userId]
    setItem('confessions', list)
    sync('confessions.like', { id })
    return item
  },

  comment(id: string, userId: string, text: string): Confession | undefined {
    const list = all()
    const item = list.find((c) => c.id === id)
    if (!item) return undefined
    const comment: Comment = { id: uid('c'), userId, text, createdAt: Date.now() }
    item.comments = [...item.comments, comment]
    setItem('confessions', list)
    sync('confessions.comment', { id, text, commentId: comment.id })
    challengeService.track(userId, 'confession_comment')
    return item
  },

  report(id: string, userId: string): Confession | undefined {
    const list = all()
    const item = list.find((c) => c.id === id)
    if (!item) return undefined
    if (!item.reports.includes(userId)) item.reports = [...item.reports, userId]
    setItem('confessions', list)
    sync('confessions.report', { id })
    return item
  },
}
