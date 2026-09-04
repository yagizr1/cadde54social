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

  comment(id: string, userId: string, text: string, parentId?: string): Confession | undefined {
    const list = all()
    const item = list.find((c) => c.id === id)
    if (!item) return undefined
    const replyTo = parentId ? item.comments.find((c) => c.id === parentId) : undefined
    const rootId = replyTo?.parentId ?? replyTo?.id
    const comment: Comment = {
      id: uid('c'),
      userId,
      text,
      createdAt: Date.now(),
      parentId: rootId,
      likes: [],
    }
    item.comments = [...item.comments, comment]
    setItem('confessions', list)
    sync('confessions.comment', { id, text, commentId: comment.id, parentId: rootId })
    challengeService.track(userId, 'confession_comment')
    return item
  },

  toggleCommentLike(id: string, commentId: string, userId: string): Confession | undefined {
    const list = all()
    const item = list.find((c) => c.id === id)
    if (!item) return undefined
    const row = item.comments.find((c) => c.id === commentId)
    if (!row) return undefined
    const likes = row.likes ?? []
    const liked = likes.includes(userId)
    row.likes = liked ? likes.filter((x) => x !== userId) : [...likes, userId]
    setItem('confessions', list)
    sync('confessions.commentLike', { id, commentId })
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
