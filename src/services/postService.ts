import { uid } from '../lib/utils'
import type { Comment, Post } from '../types'
import { settingsService } from './settingsService'
import { challengeService } from './challengeService'
import { notificationService } from './notificationService'
import { getItem, setItem } from './storage'
import { sync } from './syncService'
import { userService } from './userService'
import { xpService } from './xpService'

function all(): Post[] {
  return getItem<Post[]>('posts', [])
}

function save(posts: Post[]): void {
  setItem('posts', posts)
}

export const postService = {
  list(): Post[] {
    return all().sort((a, b) => b.createdAt - a.createdAt)
  },

  byUser(userId: string): Post[] {
    return this.list()
      .filter((p) => p.userId === userId && !p.archived)
      .sort((a, b) => {
        const ap = a.pinnedAt ?? 0
        const bp = b.pinnedAt ?? 0
        if (ap !== bp) return bp - ap
        return b.createdAt - a.createdAt
      })
  },

  archivedBy(userId: string): Post[] {
    return this.list().filter((p) => p.userId === userId && p.archived)
  },

  isVisible(post: Post, viewerId: string): boolean {
    if (post.archived) return false
    if (post.audience === 'followers' && viewerId !== post.userId) {
      const author = userService.getById(post.userId)
      if (!author?.followers.includes(viewerId)) return false
    }
    return true
  },

  savedBy(userId: string): Post[] {
    return this.list().filter((p) => p.saves.includes(userId))
  },

  create(
    userId: string,
    image: string,
    caption: string,
    extra?: Pick<Post, 'location' | 'altText' | 'hideLikes' | 'commentsOff' | 'taggedIds' | 'audience'>,
  ): Post {
    const post: Post = {
      id: uid('p'),
      userId,
      image,
      caption,
      likes: [],
      comments: [],
      saves: [],
      createdAt: Date.now(),
      ...extra,
    }
    save([post, ...all()])
    sync('posts.create', {
      id: post.id,
      image,
      caption,
      createdAt: post.createdAt,
      location: extra?.location,
      altText: extra?.altText,
      hideLikes: extra?.hideLikes,
      commentsOff: extra?.commentsOff,
      taggedIds: extra?.taggedIds,
      audience: extra?.audience,
    })
    return post
  },

  toggleLike(postId: string, userId: string, authorId?: string): Post | undefined {
    const posts = all()
    const post = posts.find((p) => p.id === postId)
    if (!post) return undefined
    const liked = post.likes.includes(userId)
    post.likes = liked ? post.likes.filter((id) => id !== userId) : [...post.likes, userId]
    save(posts)
    sync('posts.like', { postId })
    if (!liked) {
      challengeService.track(userId, 'like')
      if (authorId && authorId !== userId) challengeService.track(userId, 'interact_users', authorId)
      notificationService.notify({
        type: 'like',
        actorId: userId,
        recipientId: post.userId,
        text: 'gönderini beğendi',
        href: `/p/${post.id}`,
        image: post.image,
        groupKey: `like:post:${post.id}`,
      })
    }
    return post
  },

  toggleSave(postId: string, userId: string): Post | undefined {
    const posts = all()
    const post = posts.find((p) => p.id === postId)
    if (!post) return undefined
    const saved = post.saves.includes(userId)
    post.saves = saved ? post.saves.filter((id) => id !== userId) : [...post.saves, userId]
    save(posts)
    sync('posts.save', { postId })
    return post
  },

  comment(postId: string, userId: string, text: string, authorId?: string, parentId?: string): Post | undefined {
    const posts = all()
    const post = posts.find((p) => p.id === postId)
    if (!post) return undefined
    if (post.commentsOff && userId !== post.userId) return post
    if (userId !== post.userId && !settingsService.canComment(userId, post.userId).ok) return post
    const hidden = settingsService.hasHiddenWord(post.userId, text)
    const replyTo = parentId
      ? post.comments.find((c) => c.id === parentId)
      : undefined
    const rootId = replyTo?.parentId ?? replyTo?.id
    const comment: Comment = {
      id: uid('c'),
      userId,
      text,
      createdAt: Date.now(),
      hidden: hidden || undefined,
      parentId: rootId,
      likes: [],
    }
    post.comments = [...post.comments, comment]
    save(posts)
    sync('posts.comment', { postId, text, commentId: comment.id, hidden, parentId: rootId })
    challengeService.track(userId, 'comment')
    if (authorId && authorId !== userId) challengeService.track(userId, 'interact_users', authorId)
    const count = getItem('commentCount', 0) + 1
    setItem('commentCount', count)
    xpService.add(userId, 5, 'Yorum')
    notificationService.notify({
      type: 'comment',
      actorId: userId,
      recipientId: post.userId,
      text: `yorum yaptı: ${text.slice(0, 80)}`,
      href: `/p/${post.id}`,
      image: post.image,
      groupKey: `comment:post:${post.id}:${userId}`,
    })
    if (replyTo && replyTo.userId !== userId && replyTo.userId !== post.userId) {
      notificationService.notify({
        type: 'comment',
        actorId: userId,
        recipientId: replyTo.userId,
        text: `yorumuna yanıt verdi: ${text.slice(0, 80)}`,
        href: `/p/${post.id}`,
        image: post.image,
        groupKey: `comment:reply:${replyTo.id}:${userId}`,
      })
    }
    return post
  },

  toggleCommentLike(postId: string, commentId: string, userId: string): Post | undefined {
    const posts = all()
    const post = posts.find((p) => p.id === postId)
    if (!post) return undefined
    const row = post.comments.find((c) => c.id === commentId)
    if (!row) return undefined
    const likes = row.likes ?? []
    const liked = likes.includes(userId)
    row.likes = liked ? likes.filter((id) => id !== userId) : [...likes, userId]
    save(posts)
    sync('posts.commentLike', { postId, commentId })
    if (!liked) {
      notificationService.notify({
        type: 'like',
        actorId: userId,
        recipientId: row.userId,
        text: 'yorumunu beğendi',
        href: `/p/${post.id}`,
        image: post.image,
        groupKey: `like:comment:${commentId}`,
      })
    }
    return post
  },

  visibleComments(comments: Comment[], viewerId: string, ownerId: string): Comment[] {
    return comments.filter((c) => !c.hidden || c.userId === viewerId || ownerId === viewerId)
  },

  approveComment(postId: string, commentId: string, actorId: string): Post | undefined {
    const posts = all()
    const post = posts.find((p) => p.id === postId)
    if (!post || post.userId !== actorId) return undefined
    const row = post.comments.find((c) => c.id === commentId)
    if (!row) return undefined
    row.hidden = false
    save(posts)
    sync('posts.approveComment', { postId, commentId })
    return post
  },

  async update(
    postId: string,
    actorId: string,
    patch: Partial<Pick<Post, 'caption' | 'location' | 'altText' | 'hideLikes' | 'commentsOff' | 'taggedIds' | 'audience' | 'archived' | 'pinnedAt'>>,
  ): Promise<Post | undefined> {
    const posts = all()
    const post = posts.find((p) => p.id === postId)
    if (!post || post.userId !== actorId) return undefined
    Object.assign(post, patch)
    if (patch.location === '') delete post.location
    if (patch.altText === '') delete post.altText
    save(posts)
    await sync('posts.update', { postId, patch })
    return post
  },

  async remove(postId: string, actorId: string): Promise<boolean> {
    const posts = all()
    const post = posts.find((p) => p.id === postId)
    if (!post || post.userId !== actorId) return false
    save(posts.filter((p) => p.id !== postId))
    await sync('posts.remove', { postId })
    return true
  },

  async toggleArchive(postId: string, actorId: string): Promise<Post | undefined> {
    const post = all().find((p) => p.id === postId)
    if (!post || post.userId !== actorId) return undefined
    return this.update(postId, actorId, { archived: !post.archived, pinnedAt: post.archived ? post.pinnedAt : null })
  },

  async togglePin(postId: string, actorId: string): Promise<Post | undefined> {
    const post = all().find((p) => p.id === postId)
    if (!post || post.userId !== actorId) return undefined
    if (post.pinnedAt) return this.update(postId, actorId, { pinnedAt: null })
    const pinned = this.byUser(actorId).filter((p) => p.pinnedAt).length
    if (pinned >= 3) return undefined
    return this.update(postId, actorId, { pinnedAt: Date.now() })
  },
}
