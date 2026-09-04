import { uid } from '../lib/utils'
import { getItem, setItem } from './storage'
import { sync } from './syncService'

export type FeedbackType = 'request' | 'bug'

export interface FeedbackItem {
  id: string
  userId: string
  type: FeedbackType
  title: string
  message: string
  createdAt: number
}

export const feedbackService = {
  list(userId: string): FeedbackItem[] {
    return getItem<FeedbackItem[]>('feedback', [])
      .filter((f) => f.userId === userId && (f.type === 'request' || f.type === 'bug'))
      .sort((a, b) => b.createdAt - a.createdAt)
  },

  add(userId: string, type: FeedbackType, title: string, message: string): FeedbackItem {
    const item: FeedbackItem = {
      id: uid('fb'),
      userId,
      type,
      title,
      message,
      createdAt: Date.now(),
    }
    setItem('feedback', [item, ...getItem<FeedbackItem[]>('feedback', [])])
    sync('feedback.add', { id: item.id, type, title, message })
    return item
  },
}
