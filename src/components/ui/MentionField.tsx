import { useRef, useState, type ChangeEvent, type RefObject, type SyntheticEvent } from 'react'
import { insertMention, mentionQueryAt, searchMentionUsers } from '../../lib/mentions'
import { useAuthStore } from '../../store/authStore'
import { Avatar } from './Avatar'

export function MentionField({
  value,
  onChange,
  placeholder,
  multiline,
  className,
  inputClassName,
  onFocus,
  onBlur,
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  multiline?: boolean
  className?: string
  inputClassName?: string
  onFocus?: () => void
  onBlur?: () => void
}) {
  const me = useAuthStore((s) => s.user)
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const [caret, setCaret] = useState(0)
  const hit = mentionQueryAt(value, caret)
  const suggestions = me && hit ? searchMentionUsers(me.id, hit.query) : []

  function pick(username: string) {
    const next = insertMention(value, caret, username)
    onChange(next.text)
    setCaret(next.caret)
    window.requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      el.setSelectionRange(next.caret, next.caret)
    })
  }

  const fieldProps = {
    value,
    placeholder,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value)
      setCaret(e.target.selectionStart ?? e.target.value.length)
    },
    onClick: (e: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setCaret(e.currentTarget.selectionStart ?? 0)
    },
    onKeyUp: (e: SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setCaret(e.currentTarget.selectionStart ?? 0)
    },
    onFocus,
    onBlur,
    className: inputClassName,
  }

  return (
    <div className={className ?? 'relative min-w-0 flex-1'}>
      {suggestions.length ? (
        <div className="absolute inset-x-0 bottom-full z-30 mb-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#262626] shadow-2xl">
          {suggestions.map((u) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(u.username)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5"
            >
              <Avatar src={u.avatar} name={u.name} size={36} />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{u.username}</p>
                <p className="truncate text-[12px] text-mute">{u.name}</p>
              </div>
            </button>
          ))}
        </div>
      ) : null}
      {multiline ? (
        <textarea ref={ref as RefObject<HTMLTextAreaElement>} {...fieldProps} />
      ) : (
        <input ref={ref as RefObject<HTMLInputElement>} {...fieldProps} />
      )}
    </div>
  )
}
