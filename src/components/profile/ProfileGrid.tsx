import { Pin, Repeat2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { postService } from '../../services/postService'
import type { Post } from '../../types'
import { FeedPost } from '../feed/FeedPost'
import { EmptyProfileGrid, profileCellClass, profileGridClass } from './EmptyProfileGrid'

export function ProfileGrid({
  posts,
  empty,
  meId,
  onChange,
  repostBadge,
}: {
  posts: Post[]
  empty: string
  meId: string
  onChange: () => void
  repostBadge?: boolean
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

  const live = useMemo(
    () => posts.map((p) => postService.list().find((x) => x.id === p.id) ?? p),
    [posts],
  )

  useEffect(() => {
    if (!openId) return
    if (!live.some((p) => p.id === openId)) {
      setOpenId(null)
      return
    }
    const node = scrollerRef.current?.querySelector(`[data-post-id="${openId}"]`)
    node?.scrollIntoView({ block: 'start' })
  }, [openId, live])

  useEffect(() => {
    if (!openId) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [openId])

  if (posts.length === 0) return <EmptyProfileGrid text={empty} />

  return (
    <>
      <div className={profileGridClass}>
        {live.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => setOpenId(post.id)}
            className={profileCellClass}
          >
            <img src={post.image} alt="" className="h-full w-full object-cover" />
            {post.pinnedAt ? <Pin className="absolute top-1.5 left-1.5 h-3.5 w-3.5 fill-white text-white drop-shadow" /> : null}
            {repostBadge ? <Repeat2 className="absolute right-1.5 bottom-1.5 h-4 w-4 text-white drop-shadow" /> : null}
          </button>
        ))}
      </div>

      {openId
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex flex-col bg-ink">
              <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-2">
                <button
                  type="button"
                  onClick={() => setOpenId(null)}
                  className="grid h-10 w-10 place-items-center"
                  aria-label="Kapat"
                >
                  <X className="h-6 w-6" />
                </button>
                <p className="text-[16px] font-semibold">Gönderiler</p>
              </div>
              <div
                ref={scrollerRef}
                className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain no-scrollbar"
              >
                {live.map((post) => (
                  <div key={post.id} data-post-id={post.id} className="snap-start snap-always">
                    <FeedPost post={post} meId={meId} onChange={onChange} />
                  </div>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
