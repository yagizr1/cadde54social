import { api } from '../lib/api'
import { uid } from '../lib/utils'
import type { Comment, Reel } from '../types'
import { settingsService } from './settingsService'
import { getBlobUrl, getItem, saveBlob, setItem } from './storage'
import { sync } from './syncService'
import { xpService } from './xpService'

function all(): Reel[] {
  return getItem<Reel[]>('reels', [])
}

function save(reels: Reel[]): void {
  setItem('reels', reels)
}

export const reelsService = {
  list(): Reel[] {
    return all().sort((a, b) => b.createdAt - a.createdAt)
  },

  byUser(userId: string): Reel[] {
    return this.list().filter((r) => r.userId === userId)
  },

  savedBy(userId: string): Reel[] {
    return this.list().filter((r) => r.saves.includes(userId))
  },

  async create(userId: string, file: File, caption: string, music: string): Promise<Reel> {
    const id = uid('r')
    let videoUrl = ''
    try {
      const form = new FormData()
      form.append('file', file)
      const uploaded = await api<{ url: string }>('/api/upload', { method: 'POST', body: form })
      videoUrl = uploaded.url
    } catch {
      await saveBlob(id, file)
      videoUrl = URL.createObjectURL(file)
    }
    const reel: Reel = {
      id,
      userId,
      videoUrl,
      caption,
      music: music || 'Orijinal ses — Cadde 54',
      likes: [],
      comments: [],
      saves: [],
      createdAt: Date.now(),
    }
    save([reel, ...all()])
    sync('reels.create', { id, videoUrl, caption, music: reel.music })
    xpService.add(userId, 25, 'Reels')
    return reel
  },

  async resolveUrl(reel: Reel): Promise<string> {
    if (reel.videoUrl.startsWith('blob:') || reel.videoUrl.startsWith('http')) return reel.videoUrl
    return (await getBlobUrl(reel.id)) ?? reel.videoUrl
  },

  toggleLike(id: string, userId: string): Reel | undefined {
    const reels = all()
    const reel = reels.find((r) => r.id === id)
    if (!reel) return undefined
    const liked = reel.likes.includes(userId)
    reel.likes = liked ? reel.likes.filter((x) => x !== userId) : [...reel.likes, userId]
    save(reels)
    sync('reels.like', { reelId: id })
    return reel
  },

  toggleSave(id: string, userId: string): Reel | undefined {
    const reels = all()
    const reel = reels.find((r) => r.id === id)
    if (!reel) return undefined
    const saved = reel.saves.includes(userId)
    reel.saves = saved ? reel.saves.filter((x) => x !== userId) : [...reel.saves, userId]
    save(reels)
    sync('reels.save', { reelId: id })
    return reel
  },

  comment(id: string, userId: string, text: string): Reel | undefined {
    const reels = all()
    const reel = reels.find((r) => r.id === id)
    if (!reel) return undefined
    if (userId !== reel.userId && !settingsService.canComment(userId, reel.userId).ok) return reel
    const hidden = settingsService.hasHiddenWord(reel.userId, text)
    const comment: Comment = { id: uid('c'), userId, text, createdAt: Date.now(), hidden: hidden || undefined }
    reel.comments = [...reel.comments, comment]
    save(reels)
    sync('reels.comment', { reelId: id, text, commentId: comment.id, hidden })
    return reel
  },

  approveComment(reelId: string, commentId: string, actorId: string): Reel | undefined {
    const reels = all()
    const reel = reels.find((r) => r.id === reelId)
    if (!reel || reel.userId !== actorId) return undefined
    const row = reel.comments.find((c) => c.id === commentId)
    if (!row) return undefined
    row.hidden = false
    save(reels)
    sync('reels.approveComment', { reelId, commentId })
    return reel
  },
}
