import type { ReactNode } from 'react'

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-full rounded-3xl border border-dashed border-line px-4 py-12 text-center sm:px-6">
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-mute">{text}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
