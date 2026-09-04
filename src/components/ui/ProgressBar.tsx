export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-panel-2 ${className}`}>
      <div
        className="h-full rounded-full bg-hot transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
