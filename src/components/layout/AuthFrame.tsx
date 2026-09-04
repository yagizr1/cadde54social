import type { FormEvent, ReactNode } from 'react'

export function AuthFrame({
  children,
  onSubmit,
}: {
  children: ReactNode
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="box-border min-h-dvh w-full min-w-0 overflow-x-hidden overflow-y-auto">
      <div className="box-border flex min-h-dvh w-full min-w-0 items-center justify-center px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        <form className="w-full min-w-0 max-w-[22rem] anim-page" onSubmit={onSubmit}>
          {children}
        </form>
      </div>
    </div>
  )
}
