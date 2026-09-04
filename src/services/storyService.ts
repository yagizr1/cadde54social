import { STORY_TTL_MS } from '../lib/constants'
import { uid } from '../lib/utils'
import type { Story } from '../types'
import { challengeService } from './challengeService'
import { notificationService } from './notificationService'
import { getItem, setItem } from './storage'
import { sync } from './syncService'
import { userService } from './userService'
import { xpService } from './xpService'

function normalize(story: Story): Story {
  return {
    ...story,
    likes: story.likes ?? [],
    viewedBy: story.viewedBy ?? [],
    mentionedIds: story.mentionedIds ?? [],
  }
}

function all(): Story[] {
  const now = Date.now()
  return getItem<Story[]>('stories', [])
    .map(normalize)
    .filter((s) => s.expiresAt > now)
}

function save(stories: Story[]): void {
  setItem('stories', stories)
}

export const storyService = {
  list(): Story[] {
    return all().sort((a, b) => b.createdAt - a.createdAt)
  },

  archivedBy(userId: string): Story[] {
    const now = Date.now()
    return getItem<Story[]>('stories', [])
      .map(normalize)
      .filter((s) => s.userId === userId && s.expiresAt <= now)
      .sort((a, b) => b.createdAt - a.createdAt)
  },

  get(id: string): Story | undefined {
    return all().find((s) => s.id === id)
  },

  grouped(): { userId: string; stories: Story[] }[] {
    const map = new Map<string, Story[]>()
    for (const story of this.list()) {
      const list = map.get(story.userId) ?? []
      list.push(story)
      map.set(story.userId, list)
    }
    return [...map.entries()].map(([userId, stories]) => ({
      userId,
      stories: stories.sort((a, b) => a.createdAt - b.createdAt),
    }))
  },

  create(userId: string, image: string, mentionedIds: string[] = []): Story {
    const createdAt = Date.now()
    const story: Story = {
      id: uid('s'),
      userId,
      image,
      createdAt,
      expiresAt: createdAt + STORY_TTL_MS,
      viewedBy: [],
      likes: [],
      mentionedIds,
    }
    save([story, ...getItem<Story[]>('stories', []).map(normalize)])
    sync('stories.create', { id: story.id, image, mentionedIds })
    challengeService.track(userId, 'story')
    challengeService.track(userId, 'weekly_story')
    xpService.add(userId, 15, 'Story')
    return story
  },

  markViewed(storyId: string, userId: string): void {
    const stories = getItem<Story[]>('stories', []).map(normalize)
    const story = stories.find((s) => s.id === storyId)
    if (!story || story.viewedBy.includes(userId)) return
    story.viewedBy = [...story.viewedBy, userId]
    save(stories)
    sync('stories.view', { storyId })
    const viewer = userService.getById(userId)
    notificationService.notify({
      type: 'view',
      actorId: userId,
      recipientId: story.userId,
      text: 'hikayeni görüntüledi',
      href: viewer ? `/u/${viewer.username}` : '/',
      image: story.image,
      groupKey: `view:story:${userId}`,
    })
  },

  toggleLike(storyId: string, userId: string): Story | undefined {
    const stories = getItem<Story[]>('stories', []).map(normalize)
    const story = stories.find((s) => s.id === storyId)
    if (!story) return undefined
    const liked = story.likes.includes(userId)
    story.likes = liked ? story.likes.filter((id) => id !== userId) : [...story.likes, userId]
    save(stories)
    sync('stories.like', { storyId })
    return story
  },

  remove(storyId: string): boolean {
    const stories = getItem<Story[]>('stories', []).map(normalize)
    const next = stories.filter((s) => s.id !== storyId)
    if (next.length === stories.length) return false
    save(next)
    sync('stories.remove', { storyId })
    return true
  },
}
