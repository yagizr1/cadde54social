import { uid } from '../lib/utils'
import type { Post, Reel, Repost } from '../types'
import { challengeService } from './challengeService'
import { notificationService } from './notificationService'
import { postService } from './postService'
import { reelsService } from './reelsService'
import { getItem, setItem } from './storage'
import { sync } from './syncService'
import { userService } from './userService'
import { premiumService } from './premiumService'
import { isBoosted } from './boostService'

function all(): Repost[] {
  return getItem<Repost[]>('reposts', [])
}

function save(items: Repost[]): void {
  setItem('reposts', items)
}

const SEEN_KEY = 'homeFeedSeen'

function seenKeys(viewerId: string): Set<string> {
  const allSeen = getItem<Record<string, string[]>>(SEEN_KEY, {})
  return new Set(allSeen[viewerId] ?? [])
}

function shuffle<T>(list: T[], seed: number): T[] {
  const next = [...list]
  let s = (seed * 1664525 + 1013904223) >>> 0
  for (let i = next.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export type FeedEntry = {
  key: string
  createdAt: number
  repostedById?: string
  suggested?: boolean
} & ({ kind: 'post'; post: Post } | { kind: 'reel'; reel: Reel })

function ownerId(item: FeedEntry): string {
  return item.kind === 'post' ? item.post.userId : item.reel.userId
}

function boostTarget(item: FeedEntry) {
  return item.kind === 'post' ? item.post : item.reel
}

function contentKey(item: FeedEntry): string {
  return item.kind === 'post' ? `p:${item.post.id}` : `r:${item.reel.id}`
}

export const repostService = {
  list(): Repost[] {
    return all().sort((a, b) => b.createdAt - a.createdAt)
  },

  byUser(userId: string): Repost[] {
    return this.list().filter((r) => r.userId === userId)
  },

  has(userId: string, kind: Repost['kind'], targetId: string): boolean {
    return all().some((r) => r.userId === userId && r.kind === kind && r.targetId === targetId)
  },

  toggle(userId: string, kind: Repost['kind'], targetId: string, authorId?: string): boolean {
    const items = all()
    const found = items.find((r) => r.userId === userId && r.kind === kind && r.targetId === targetId)
    if (found) {
      save(items.filter((r) => r.id !== found.id))
      sync('reposts.toggle', { kind, targetId, authorId })
      return false
    }
    const row = { id: uid('rp'), userId, kind, targetId, createdAt: Date.now() }
    save([row, ...items])
    sync('reposts.toggle', { id: row.id, kind, targetId, authorId })
    if (authorId && authorId !== userId) {
      challengeService.track(userId, 'interact_users', authorId)
      const me = userService.getById(userId)
      notificationService.notify({
        type: 'repost',
        actorId: userId,
        recipientId: authorId,
        text: kind === 'reel' ? 'reels’ini tekrar paylaştı' : 'gönderini tekrar paylaştı',
        href: me ? `/u/${me.username}` : '/',
        image: kind === 'post' ? postService.list().find((p) => p.id === targetId)?.image : undefined,
        groupKey: `repost:${kind}:${targetId}`,
      })
    }
    return true
  },

  feed(): FeedEntry[] {
    const posts = postService.list().filter((p) => !p.archived)
    const reels = reelsService.list()
    const byPost = new Map(posts.map((p) => [p.id, p]))
    const byReel = new Map(reels.map((r) => [r.id, r]))
    const entries: FeedEntry[] = [
      ...posts.map((post) => ({
        key: `post:${post.id}`,
        kind: 'post' as const,
        post,
        createdAt: post.createdAt,
      })),
      ...reels.map((reel) => ({
        key: `reel:${reel.id}`,
        kind: 'reel' as const,
        reel,
        createdAt: reel.createdAt,
      })),
    ]
    for (const r of this.list()) {
      if (r.kind === 'post') {
        const post = byPost.get(r.targetId)
        if (!post || post.userId === r.userId) continue
        entries.push({ key: r.id, kind: 'post', post, createdAt: r.createdAt, repostedById: r.userId })
        continue
      }
      const reel = byReel.get(r.targetId)
      if (!reel || reel.userId === r.userId) continue
      entries.push({ key: r.id, kind: 'reel', reel, createdAt: r.createdAt, repostedById: r.userId })
    }
    return entries.sort((a, b) => b.createdAt - a.createdAt)
  },

  homeFeed(viewerId: string, followingIds: string[], seed = 0): FeedEntry[] {
    const follow = new Set([viewerId, ...followingIds])
    const fromFollow = (item: FeedEntry) =>
      follow.has(ownerId(item)) || Boolean(item.repostedById && follow.has(item.repostedById))

    const items = this.feed()
    const following = items.filter(fromFollow)
    const seenContent = new Set(following.map(contentKey))
    const boostScore = (item: FeedEntry) =>
      isBoosted(boostTarget(item)) ? 2 : premiumService.isActive(userService.getById(ownerId(item))) ? 1 : 0
    const boostOnly = (item: FeedEntry) => (isBoosted(boostTarget(item)) ? 1 : 0)
    const byBoost = (a: FeedEntry, b: FeedEntry) => {
      const d = boostScore(b) - boostScore(a)
      return d !== 0 ? d : b.createdAt - a.createdAt
    }
    const byBoostedThenTime = (a: FeedEntry, b: FeedEntry) => {
      const d = boostOnly(b) - boostOnly(a)
      return d !== 0 ? d : b.createdAt - a.createdAt
    }
    const suggested = items
      .filter((item) => !fromFollow(item) && !seenContent.has(contentKey(item)))
      .map((item) => ({ ...item, suggested: true as const }))
      .sort(byBoost)

    const remembered = seenKeys(viewerId)
    if (remembered.size === 0) {
      return [...following.sort(byBoostedThenTime), ...suggested]
    }

    const isNew = (item: FeedEntry) => !remembered.has(item.key)
    const split = (list: FeedEntry[], salt: number, featured = false) => {
      const fresh = list.filter(isNew).sort(featured ? byBoost : byBoostedThenTime)
      const rest = shuffle(
        list.filter((item) => !isNew(item)),
        seed + salt,
      )
      if (featured) rest.sort((a, b) => boostScore(b) - boostScore(a))
      else rest.sort((a, b) => boostOnly(b) - boostOnly(a))
      return [...fresh, ...rest]
    }

    return [...split(following, 1), ...split(suggested, 17, true)]
  },

  rememberHomeFeed(viewerId: string, entries: FeedEntry[]): void {
    const prev = getItem<Record<string, string[]>>(SEEN_KEY, {})
    prev[viewerId] = [...new Set(entries.map((item) => item.key))]
    setItem(SEEN_KEY, prev)
  },
}
