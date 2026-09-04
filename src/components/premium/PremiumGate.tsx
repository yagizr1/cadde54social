import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from '../../lib/nav'
import { Button } from '../ui/Button'

export function PremiumGate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-3xl">
      <div aria-hidden className="pointer-events-none select-none blur-[28px] saturate-50 contrast-75">
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-center bg-ink/45">
        <div className="mx-6 rounded-3xl border border-line bg-panel p-6 text-center">
          <Lock className="mx-auto mb-3 h-6 w-6 text-gold" />
          <p className="font-semibold">{title}</p>
          <Link to="/premium">
            <Button className="mt-4 w-full">Premium’a geç</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
