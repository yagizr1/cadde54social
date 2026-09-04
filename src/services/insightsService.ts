import { postService } from './postService'
import { profileViewService } from './profileViewService'
import { reelsService } from './reelsService'
import { storyService } from './storyService'
import { userService } from './userService'

const WEEK = 7 * 86_400_000

export type ProfileInsights = {
  views7d: number
  viewsAll: number
  postLikes: number
  reelLikes: number
  comments: number
  storyViews: number
  followers: number
  posts: number
}

export const insightsService = {
  forUser(userId: string): ProfileInsights {
    const posts = postService.byUser(userId)
    const reels = reelsService.byUser(userId)
    const stories = storyService.list().filter((s) => s.userId === userId)
    const views = profileViewService.listFor(userId)
    const since = Date.now() - WEEK
    const user = userService.getById(userId)

    return {
      views7d: views.filter((v) => v.createdAt >= since).length,
      viewsAll: views.length,
      postLikes: posts.reduce((n, p) => n + p.likes.length, 0),
      reelLikes: reels.reduce((n, r) => n + r.likes.length, 0),
      comments: posts.reduce((n, p) => n + p.comments.length, 0) + reels.reduce((n, r) => n + r.comments.length, 0),
      storyViews: stories.reduce((n, s) => n + s.viewedBy.length, 0),
      followers: user?.followers.length ?? 0,
      posts: posts.length,
    }
  },
}
