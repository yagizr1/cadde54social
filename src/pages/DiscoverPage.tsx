import { Clapperboard, Search, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '../lib/nav'
import { FeedPost } from '../components/feed/FeedPost'
import { BackButton } from '../components/layout/BackButton'
import { Avatar } from '../components/ui/Avatar'
import { useApp } from '../hooks/useApp'
import { postService } from '../services/postService'
import { reelsService } from '../services/reelsService'
import { searchHistoryService } from '../services/searchHistoryService'
import { settingsService } from '../services/settingsService'
import { userService } from '../services/userService'
import { premiumService } from '../services/premiumService'
import { isBoosted } from '../services/boostService'
import type { Post, Reel } from '../types'

type Tile =
  | { key: string; kind: 'post'; post: Post; featured: boolean }
  | { key: string; kind: 'reel'; reel: Reel; featured: boolean }

function takePost(queue: Post[]): Tile | undefined {
  const post = queue.shift()
  return post ? { key: `p-${post.id}`, kind: 'post', post, featured: false } : undefined
}

function takeReel(queue: Reel[], featured = false): Tile | undefined {
  const reel = queue.shift()
  return reel ? { key: `r-${reel.id}-${featured ? 'f' : 's'}`, kind: 'reel', reel, featured } : undefined
}

function nextSquare(posts: Post[], reels: Reel[]): Tile | undefined {
  return takePost(posts) ?? takeReel(reels)
}

function rankContent(a: { userId: string; likes: string[]; createdAt: number; boostedUntil?: number | null }, b: typeof a) {
  const ar = (isBoosted(a) ? 2 : 0) + (premiumService.isActive(userService.getById(a.userId)) ? 1 : 0)
  const br = (isBoosted(b) ? 2 : 0) + (premiumService.isActive(userService.getById(b.userId)) ? 1 : 0)
  if (ar !== br) return br - ar
  return b.likes.length - a.likes.length || b.createdAt - a.createdAt
}

function takeFeatured(posts: Post[], reels: Reel[]): Tile | undefined {
  const pBoost = posts.findIndex((p) => isBoosted(p))
  const rBoost = reels.findIndex((r) => isBoosted(r))
  if (pBoost >= 0 && (rBoost < 0 || (posts[pBoost].boostedUntil ?? 0) >= (reels[rBoost].boostedUntil ?? 0))) {
    const [post] = posts.splice(pBoost, 1)
    return post ? { key: `p-${post.id}-f`, kind: 'post', post, featured: true } : undefined
  }
  if (rBoost >= 0) {
    const [reel] = reels.splice(rBoost, 1)
    return reel ? { key: `r-${reel.id}-f`, kind: 'reel', reel, featured: true } : undefined
  }
  return takeReel(reels, true)
}

function buildTiles(posts: Post[], reels: Reel[]): Tile[] {
  const postQ = [...posts].sort(rankContent)
  const reelQ = [...reels].sort(rankContent)
  const tiles: Tile[] = []

  while (postQ.some(isBoosted) || reelQ.some(isBoosted)) {
    const featured = takeFeatured(postQ, reelQ)
    if (!featured) break
    const extras = [nextSquare(postQ, reelQ), nextSquare(postQ, reelQ)].filter((t): t is Tile => Boolean(t))
    if (extras.length >= 2) tiles.push(extras[0], extras[1], featured)
    else if (extras.length) tiles.push(featured, ...extras)
    else tiles.push(featured)
  }

  let block = 0

  while (postQ.length || reelQ.length) {
    const side = block % 4 === 1 ? 'right' : block % 4 === 3 ? 'left' : null
    if (side && reelQ.length) {
      const featured = takeFeatured(postQ, reelQ)
      const extras = [nextSquare(postQ, reelQ), nextSquare(postQ, reelQ), nextSquare(postQ, reelQ), nextSquare(postQ, reelQ)].filter(
        (t): t is Tile => Boolean(t),
      )
      if (featured && extras.length >= 2 && side === 'right') {
        tiles.push(extras[0], extras[1], featured, ...extras.slice(2))
      } else if (featured && extras.length) {
        tiles.push(featured, ...extras)
      } else if (featured) {
        tiles.push({ ...featured, featured: false })
      }
    } else {
      for (let i = 0; i < 3; i += 1) {
        const tile = nextSquare(postQ, reelQ)
        if (tile) tiles.push(tile)
      }
    }
    block += 1
  }

  return tiles.filter(Boolean)
}

export function DiscoverPage() {
  const { user, refresh, tick } = useApp()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)
  const [openPost, setOpenPost] = useState<Post | null>(null)
  const [historyTick, setHistoryTick] = useState(0)
  const posts = postService.list().filter((p) => !user || (settingsService.visibleTo(user.id, p.userId) && postService.isVisible(p, user.id)))
  const reels = reelsService.list().filter((r) => !user || settingsService.visibleTo(user.id, r.userId))
  const users = userService.list().filter((u) => !user || settingsService.visibleTo(user.id, u.id))
  const searching = focused || q.trim().length > 0
  const query = q.trim().toLowerCase()

  const tiles = useMemo(() => buildTiles(posts, reels), [posts, reels])
  const feedPosts = useMemo(() => {
    const seen = new Set<string>()
    const ordered: Post[] = []
    for (const tile of tiles) {
      if (tile.kind !== 'post' || seen.has(tile.post.id)) continue
      seen.add(tile.post.id)
      ordered.push(tile.post)
    }
    return ordered
  }, [tiles])
  const viewerPosts = useMemo(() => {
    if (!openPost) return []
    const latest = postService.list()
    const live = feedPosts.map((p) => latest.find((x) => x.id === p.id) ?? p)
    const start = live.findIndex((p) => p.id === openPost.id)
    if (start < 0) return [openPost]
    return [...live.slice(start), ...live.slice(0, start)]
  }, [openPost, feedPosts, tick])
  const viewerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    viewerRef.current?.scrollTo({ top: 0 })
  }, [openPost?.id])

  const people = useMemo(() => {
    const list = users.filter((u) => u.id !== user?.id)
    return list.filter(
      (u) =>
        u.username.toLowerCase().includes(query) ||
        u.name.toLowerCase().includes(query),
    )
  }, [users, query, user?.id])

  const recents = useMemo(() => {
    if (!user) return []
    return searchHistoryService
      .list(user.id)
      .map((id) => userService.getById(id))
      .filter((u): u is NonNullable<typeof u> => u != null && u.id !== user.id)
  }, [user, historyTick])

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl anim-page">
      <div className="sticky top-0 z-20 flex items-center gap-2 bg-ink px-3 py-2 lg:top-0">
        {searching ? (
          <button
            type="button"
            onClick={() => {
              setQ('')
              setFocused(false)
            }}
            className="grid h-10 w-10 shrink-0 place-items-center text-xl text-white"
            aria-label="Geri"
          >
            ←
          </button>
        ) : (
          <span className="hidden lg:block">
            <BackButton />
          </span>
        )}
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-panel px-3">
          <Search className="h-4 w-4 shrink-0 text-mute" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Kullanıcı ara"
            className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-mute"
          />
        </label>
      </div>

      {searching ? (
        <div>
          {!query ? (
            recents.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-mute">Son arama yok.</p>
            ) : (
              recents.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Link
                    to={`/u/${u.username}`}
                    onClick={() => searchHistoryService.add(user.id, u.id)}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <Avatar src={u.avatar} name={u.name} size={52} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{u.username}</p>
                      <p className="truncate text-sm text-mute">{u.name}</p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      searchHistoryService.remove(user.id, u.id)
                      setHistoryTick((n) => n + 1)
                    }}
                    className="grid h-10 w-10 shrink-0 place-items-center text-mute"
                    aria-label="Kaldır"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))
            )
          ) : people.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-mute">Kullanıcı bulunamadı.</p>
          ) : (
            people.map((u) => (
              <Link
                key={u.id}
                to={`/u/${u.username}`}
                onClick={() => searchHistoryService.add(user.id, u.id)}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <Avatar src={u.avatar} name={u.name} size={52} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{u.username}</p>
                  <p className="truncate text-sm text-mute">{u.name}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[2px]">
          {tiles.map((tile) =>
            tile.kind === 'post' ? (
              <button
                key={tile.key}
                type="button"
                onClick={() => setOpenPost(tile.post)}
                className={
                  tile.featured
                    ? 'relative row-span-2 h-full min-h-0 overflow-hidden bg-panel-2'
                    : 'relative aspect-square overflow-hidden bg-panel-2'
                }
              >
                <img src={tile.post.image} alt="" className="h-full w-full object-cover" />
                {isBoosted(tile.post) ? (
                  <Sparkles className="absolute top-2 left-2 h-4 w-4 fill-white text-white drop-shadow" />
                ) : null}
              </button>
            ) : (
              <button
                key={tile.key}
                type="button"
                onClick={() => navigate(`/reels/${tile.reel.id}`)}
                className={
                  tile.featured
                    ? 'relative row-span-2 h-full min-h-0 overflow-hidden bg-panel-2'
                    : 'relative aspect-square overflow-hidden bg-panel-2'
                }
              >
                <video src={tile.reel.videoUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                {isBoosted(tile.reel) ? (
                  <Sparkles className="absolute top-2 left-2 h-4 w-4 fill-white text-white drop-shadow" />
                ) : null}
                <Clapperboard className="absolute top-2 right-2 h-4 w-4 fill-white text-white drop-shadow" />
              </button>
            ),
          )}
        </div>
      )}

      {openPost ? (
        <div ref={viewerRef} className="fixed inset-0 z-[70] overflow-y-auto bg-ink">
          <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-line bg-ink px-2">
            <button type="button" onClick={() => setOpenPost(null)} className="grid h-10 w-10 place-items-center" aria-label="Kapat">
              <X className="h-6 w-6" />
            </button>
            <p className="text-[16px] font-semibold">Gönderi</p>
          </div>
          <div className="mx-auto max-w-xl pb-8">
            {viewerPosts.map((post) => (
              <FeedPost key={post.id} post={post} meId={user.id} onChange={refresh} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
