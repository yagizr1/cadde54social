import { useRef, useState, type ReactNode } from 'react'
import { useLongPress } from '../../hooks/useLongPress'
import { parseShare } from '../../lib/chatShare'
import { cx } from '../../lib/utils'
import { messageService } from '../../services/messageService'
import { userService } from '../../services/userService'
import type { ChatMessage } from '../../types'
import { Avatar } from '../ui/Avatar'
import { SharedPostCard, SharedProfileCard, SharedStoryCard, StoryReplyBlock } from './ShareCards'

export function MessageBubble({
  mine,
  message,
  first,
  last,
  avatar,
  name,
  blocked,
  onOpenMenu,
  onHeart,
  onOpenPhoto,
  ignoreTap,
  meId,
}: {
  mine: boolean
  message: ChatMessage
  first: boolean
  last: boolean
  avatar?: string
  name: string
  blocked?: boolean
  onOpenMenu: () => void
  onHeart?: () => void
  onOpenPhoto?: () => void
  ignoreTap?: () => boolean
  meId?: string
}) {
  const press = useLongPress(onOpenMenu)
  const { didLongPress, ...pressEvents } = press
  const lastTap = useRef(0)
  const [burst, setBurst] = useState(false)
  const share = parseShare(message)
  const text = visibleText(message)
  const note = share ? (share.kind === 'story_reply' ? share.reply : share.note) : text
  const heartOnly = note === '❤️' && !message.image && !message.video && !share
  const mediaOnly = Boolean((message.image || message.video) && !note && !share)
  const quoted = message.replyTo ? userService.getById(message.replyTo.senderId) : undefined
  const reactions = message.reactions ?? []

  function heart() {
    if (blocked || !onHeart) return
    setBurst(true)
    window.setTimeout(() => setBurst(false), 650)
    onHeart()
  }

  function wrap(node: ReactNode) {
    return (
      <div className={cx('relative flex items-end gap-1.5', mine ? 'justify-end' : 'justify-start', first ? 'mt-2.5' : 'mt-[2px]')}>
        {mine ? null : last && avatar ? (
          <Avatar src={avatar} name={name} size={28} />
        ) : (
          <span className="w-7 shrink-0" />
        )}
        {node}
        {burst ? (
          <span className="pointer-events-none absolute inset-0 z-20 grid place-items-center text-[42px] leading-none anim-ig-heart">
            ❤️
          </span>
        ) : null}
      </div>
    )
  }

  const pressProps = {
    ...pressEvents,
    onClick: () => {
      if (didLongPress() || ignoreTap?.()) return
      const now = Date.now()
      if (now - lastTap.current < 280) heart()
      lastTap.current = now
    },
  }

  const extras = (
    <>
      {message.replyTo ? (
        <div className={cx('mb-0.5 max-w-[230px] rounded-[14px] px-2.5 py-1.5', mine ? 'bg-[#3797f0]/25' : 'bg-white/10')}>
          <p className="text-[11px] font-semibold text-white/80">{quoted?.username ?? 'yanıt'}</p>
          <p className="truncate text-[12px] text-white/45">{message.replyTo.text}</p>
        </div>
      ) : null}
      {reactions.length ? (
        <div
          className={cx(
            'absolute -bottom-2 z-10 flex rounded-full border border-black/40 bg-[#262626] px-1.5 py-0.5 text-[13px] leading-none shadow',
            mine ? 'right-1' : 'left-9',
          )}
        >
          {reactions.map((r) => (
            <span key={r.userId}>{r.emoji}</span>
          ))}
        </div>
      ) : null}
    </>
  )

  if (share?.kind === 'story_reply') {
    return wrap(
      <button type="button" {...pressProps} className="relative text-left">
        {extras}
        <StoryReplyBlock mine={mine} share={share} image={message.image}>
          <TextBubble mine={mine} first last={false} text={share.reply} />
        </StoryReplyBlock>
      </button>,
    )
  }

  if (share?.kind === 'story') {
    return wrap(
      <button type="button" {...pressProps} className="relative text-left">
        {extras}
        <SharedStoryCard image={message.image} username={share.username} />
        {share.note ? (
          <div className="mt-1">
            <TextBubble mine={mine} first last text={share.note} />
          </div>
        ) : null}
      </button>,
    )
  }

  if (share?.kind === 'profile') {
    return wrap(
      <button type="button" {...pressProps} className="relative text-left">
        {extras}
        <SharedProfileCard username={share.username} />
        {share.note ? (
          <div className="mt-1">
            <TextBubble mine={mine} first last text={share.note} />
          </div>
        ) : null}
      </button>,
    )
  }

  if (share?.kind === 'post' || share?.kind === 'reel') {
    return wrap(
      <button type="button" {...pressProps} className="relative text-left">
        {extras}
        <SharedPostCard share={share} image={message.image} video={message.video} />
        {share.note ? (
          <div className="mt-1">
            <TextBubble mine={mine} first last text={share.note} />
          </div>
        ) : null}
      </button>,
    )
  }

  if (heartOnly) {
    return wrap(
      <button type="button" {...pressProps} className="relative text-[44px] leading-none">
        {extras}
        ❤️
      </button>,
    )
  }

  if (message.viewOnce && message.image) {
    const opened = meId
      ? mine
        ? messageService.onceSeenByOther(message)
        : messageService.onceOpenedBy(message, meId)
      : false
    return wrap(
      <button
        type="button"
        {...pressEvents}
        onClick={(e) => {
          e.stopPropagation()
          if (didLongPress() || ignoreTap?.()) return
          if (opened) return
          onOpenPhoto?.()
        }}
        className="relative text-left"
      >
        {extras}
        <ViewOnceTile mine={mine} opened={opened} first={first} last={last} />
      </button>,
    )
  }

  return wrap(
    <button
      type="button"
      {...pressProps}
      className={cx('relative max-w-[78%] text-left', mediaOnly && 'overflow-hidden rounded-[18px]')}
    >
      {extras}
      {message.image || message.video ? (
        <div className={cx(note ? 'mb-1 overflow-hidden rounded-[18px]' : 'overflow-hidden rounded-[18px]')}>
          {message.image ? (
            <img
              src={message.image}
              alt=""
              className="max-h-72 object-cover"
              onClick={(e) => {
                if (!onOpenPhoto) return
                e.preventDefault()
                e.stopPropagation()
                onOpenPhoto()
              }}
            />
          ) : null}
          {message.video ? <video src={message.video} controls playsInline className="max-h-72 w-full object-cover" /> : null}
        </div>
      ) : null}
      {note ? <TextBubble mine={mine} first={first} last={last} text={note} /> : null}
    </button>,
  )
}

export function TextBubble({
  mine,
  first,
  last,
  text,
}: {
  mine: boolean
  first: boolean
  last: boolean
  text: string
}) {
  return (
    <p
      className={cx(
        'px-3 py-[7px] text-[15px] leading-[1.25] whitespace-pre-wrap break-words text-white',
        mine ? 'bg-[#3797f0]' : 'bg-[#262626]',
        'rounded-[18px]',
        mine && !first && 'rounded-tr-[4px]',
        mine && !last && 'rounded-br-[4px]',
        !mine && !first && 'rounded-tl-[4px]',
        !mine && !last && 'rounded-bl-[4px]',
      )}
    >
      {text}
    </p>
  )
}

function visibleText(m: ChatMessage): string {
  if (m.viewOnce) return ''
  if (m.image && (m.text === 'Fotoğraf' || !m.text.trim())) return ''
  if (m.video && (m.text === 'Video' || !m.text.trim())) return ''
  return m.text
}

function ViewOnceTile({
  mine,
  opened,
  first,
  last,
}: {
  mine: boolean
  opened: boolean
  first: boolean
  last: boolean
}) {
  return (
    <span
      className={cx(
        'flex min-w-[168px] items-center gap-3 rounded-[22px] px-3.5 py-3',
        mine ? 'bg-[#3797f0]' : 'bg-[#262626]',
        mine && !first && 'rounded-tr-[6px]',
        mine && !last && 'rounded-br-[6px]',
        !mine && !first && 'rounded-tl-[6px]',
        !mine && !last && 'rounded-bl-[6px]',
        opened && 'opacity-70',
      )}
    >
      <span
        className={cx(
          'grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-bold',
          opened
            ? 'border-2 border-white/70 bg-transparent text-white/80'
            : mine
              ? 'bg-white text-[#3797f0]'
              : 'bg-[conic-gradient(from_200deg,#f9ce34,#ee2a7b,#6228d7,#f9ce34)] p-[2px]',
        )}
      >
        {opened ? (
          <span className="text-[13px] font-semibold">✓</span>
        ) : mine ? (
          '1'
        ) : (
          <span className="grid h-full w-full place-items-center rounded-full bg-[#262626] text-white">1</span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold leading-tight">{opened ? 'Açıldı' : 'Fotoğraf'}</span>
        <span className="block text-[12px] leading-tight text-white/70">
          {opened ? 'Tek görüntüleme' : mine ? 'Gönderildi' : 'Görmek için dokun'}
        </span>
      </span>
    </span>
  )
}
