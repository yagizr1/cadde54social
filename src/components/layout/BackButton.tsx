import { ChevronLeft } from 'lucide-react'
import { useNavigate } from '../../lib/nav'
import { cx } from '../../lib/utils'

export function goBack(navigate: ReturnType<typeof useNavigate>, fallback = '/'): void {
  const idx = (window.history.state as { idx?: number } | null)?.idx
  if (typeof idx === 'number' && idx > 0) navigate(-1)
  else navigate(fallback)
}

export function BackButton({
  fallback = '/',
  to,
  className,
}: {
  fallback?: string
  to?: string
  className?: string
}) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => (to ? navigate(to) : goBack(navigate, fallback))}
      className={cx('grid h-10 w-10 shrink-0 place-items-center', className)}
      aria-label="Geri"
    >
      <ChevronLeft className="h-6 w-6" />
    </button>
  )
}
