export function EmptyProfileGrid({ text }: { text: string }) {
  return (
    <div className="w-full min-w-0 overflow-hidden">
      <div className="grid w-full grid-cols-3 gap-px bg-ink">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="aspect-square min-w-0 bg-ink" />
        ))}
      </div>
      <p className="px-4 py-8 text-center text-sm text-mute">{text}</p>
    </div>
  )
}

export const profileGridClass = 'grid w-full min-w-0 grid-cols-3 gap-px overflow-hidden bg-ink'
export const profileCellClass = 'relative aspect-square min-w-0 overflow-hidden bg-ink'
