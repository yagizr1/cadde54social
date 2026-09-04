import type { ReactNode } from 'react'
import { Clapperboard } from 'lucide-react'
import { Link } from '../../lib/nav'
import { cx } from '../../lib/utils'
import type { ParsedShare } from '../../lib/chatShare'
import { userService } from '../../services/userService'
import { Avatar } from '../ui/Avatar'

export function SharedPostCard({
  share,
  image,
  video,
}: {
  share: ParsedShare
  image?: string
  video?: string
}) {
  const author = share.username ? userService.getByUsername(share.username) : undefined
  const reel = share.kind === 'reel'
  return (
    <div className="w-[228px] overflow-hidden rounded-2xl bg-[#262626]">
      <Link
        to={author ? `/u/${author.username}` : '#'}
        className="flex items-center gap-2 px-3 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Avatar src={author?.avatar ?? ''} name={author?.name ?? share.username ?? ''} size={24} />
        <p className="truncate text-[13px] font-semibold">{share.username ?? author?.username}</p>
      </Link>
      <div className={cx('relative overflow-hidden bg-black', reel ? 'aspect-[9/16] max-h-[280px]' : 'aspect-square')}>
        {video ? (
          <video src={video} muted playsInline className="h-full w-full object-cover" />
        ) : image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : null}
        {reel ? <Clapperboard className="absolute top-2 right-2 h-4 w-4 fill-white text-white drop-shadow" /> : null}
      </div>
      {share.caption ? (
        <p className="line-clamp-2 px-3 py-2 text-[13px] text-white/80">
          <span className="font-semibold text-white">{share.username} </span>
          {share.caption}
        </p>
      ) : null}
    </div>
  )
}

export function SharedProfileCard({ username }: { username?: string }) {
  const user = username ? userService.getByUsername(username) : undefined
  if (!user) return null
  return (
    <Link
      to={`/u/${user.username}`}
      onClick={(e) => e.stopPropagation()}
      className="block w-[228px] overflow-hidden rounded-2xl bg-[#262626] px-4 py-4 text-center"
    >
      <Avatar src={user.avatar} name={user.name} size={72} className="mx-auto" />
      <p className="mt-3 truncate text-[15px] font-semibold">{user.name}</p>
      <p className="truncate text-[13px] text-mute">{user.username}</p>
      <span className="mt-3 inline-flex h-8 items-center rounded-lg bg-white/10 px-4 text-[13px] font-semibold">
        Profili gör
      </span>
    </Link>
  )
}

export function SharedStoryCard({ image, username }: { image?: string; username?: string }) {
  const author = username ? userService.getByUsername(username) : undefined
  return (
    <div className="relative w-[148px] overflow-hidden rounded-2xl bg-[#262626]">
      <div className="aspect-[9/16] max-h-[240px]">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-2.5 pt-2.5 pb-6">
        <div className="flex items-center gap-1.5">
          <Avatar src={author?.avatar ?? ''} name={author?.name ?? username ?? ''} size={22} />
          <p className="truncate text-[12px] font-semibold">{username}</p>
        </div>
      </div>
    </div>
  )
}

export function StoryReplyBlock({
  mine,
  share,
  image,
  children,
}: {
  mine: boolean
  share: ParsedShare
  image?: string
  children: ReactNode
}) {
  return (
    <div className={cx('flex max-w-[78%] flex-col', mine ? 'items-end' : 'items-start')}>
      <p className="mb-1.5 text-[11px] text-mute">
        {mine ? 'Hikâyeyi yanıtladın' : 'Hikâyeni yanıtladı'}
      </p>
      <div className="mb-1.5 h-[132px] w-[76px] overflow-hidden rounded-xl ring-2 ring-white/25">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      {share.reply ? children : null}
    </div>
  )
}
