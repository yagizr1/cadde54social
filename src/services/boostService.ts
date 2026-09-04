import { BOOST_DURATION_MS } from '../lib/constants'
import { api } from '../lib/api'
import type { Post, Reel } from '../types'
import { premiumService } from './premiumService'
import { getItem, setItem } from './storage'
import { applySnapshot, type AppSnapshot } from './syncService'
import { userService } from './userService'

export function isBoosted(item?: { boostedUntil?: number | null } | null): boolean {
  return Boolean(item?.boostedUntil && item.boostedUntil > Date.now())
}

function posts(): Post[] {
  return getItem<Post[]>('posts', [])
}

function reels(): Reel[] {
  return getItem<Reel[]>('reels', [])
}

function remainingHours(until: number): number {
  return Math.max(1, Math.ceil((until - Date.now()) / 3_600_000))
}

function clearLocal(userId: string, keep?: { kind: 'post' | 'reel'; id: string }) {
  setItem(
    'posts',
    posts().map((p) => {
      if (p.userId !== userId) return p
      if (keep?.kind === 'post' && keep.id === p.id) return p
      return { ...p, boostedUntil: null }
    }),
  )
  setItem(
    'reels',
    reels().map((r) => {
      if (r.userId !== userId) return r
      if (keep?.kind === 'reel' && keep.id === r.id) return r
      return { ...r, boostedUntil: null }
    }),
  )
}

async function commit(name: string, body: Record<string, unknown>) {
  const data = await api<{ snapshot?: AppSnapshot }>(`/api/actions/${name}`, { method: 'POST', body })
  if (data.snapshot) applySnapshot(data.snapshot)
}

export const boostService = {
  isBoosted,

  hoursLeft(item?: { boostedUntil?: number | null } | null): number {
    if (!isBoosted(item) || !item?.boostedUntil) return 0
    return remainingHours(item.boostedUntil)
  },

  activeFor(userId: string): { kind: 'post' | 'reel'; id: string } | null {
    const post = posts().find((p) => p.userId === userId && isBoosted(p))
    if (post) return { kind: 'post', id: post.id }
    const reel = reels().find((r) => r.userId === userId && isBoosted(r))
    if (reel) return { kind: 'reel', id: reel.id }
    return null
  },

  async setPost(postId: string, userId: string, on: boolean): Promise<void> {
    const user = userService.getById(userId)
    if (on && !premiumService.isActive(user)) throw new Error('Öne çıkarmak için Premium gerekli')
    const post = posts().find((p) => p.id === postId)
    if (!post || post.userId !== userId) throw new Error('Gönderi bulunamadı')
    if (on && post.archived) throw new Error('Arşivdeki gönderi öne çıkarılamaz')
    if (on) {
      clearLocal(userId, { kind: 'post', id: postId })
      setItem(
        'posts',
        posts().map((p) => (p.id === postId ? { ...p, boostedUntil: Date.now() + BOOST_DURATION_MS } : p)),
      )
    } else {
      setItem(
        'posts',
        posts().map((p) => (p.id === postId ? { ...p, boostedUntil: null } : p)),
      )
    }
    await commit('posts.boost', { postId, off: !on })
  },

  async setReel(reelId: string, userId: string, on: boolean): Promise<void> {
    const user = userService.getById(userId)
    if (on && !premiumService.isActive(user)) throw new Error('Öne çıkarmak için Premium gerekli')
    const reel = reels().find((r) => r.id === reelId)
    if (!reel || reel.userId !== userId) throw new Error('Reels bulunamadı')
    if (on) {
      clearLocal(userId, { kind: 'reel', id: reelId })
      setItem(
        'reels',
        reels().map((r) => (r.id === reelId ? { ...r, boostedUntil: Date.now() + BOOST_DURATION_MS } : r)),
      )
    } else {
      setItem(
        'reels',
        reels().map((r) => (r.id === reelId ? { ...r, boostedUntil: null } : r)),
      )
    }
    await commit('reels.boost', { reelId, off: !on })
  },
}
