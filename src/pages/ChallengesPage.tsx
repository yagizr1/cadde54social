import { useApp } from '../hooks/useApp'
import { challengeService } from '../services/challengeService'
import { ProgressBar } from '../components/ui/ProgressBar'
import type { ChallengeDef } from '../types'

export function ChallengesPage() {
  useApp()
  const daily = challengeService.defs().filter((c) => c.type === 'daily')
  const weekly = challengeService.defs().filter((c) => c.type === 'weekly')

  return (
    <div className="mx-auto max-w-xl px-4 py-4 anim-page">
      <h1 className="font-display text-2xl font-bold">Görevler</h1>
      <p className="mt-1 text-sm text-mute">Tamamlanan görev tekrar XP vermez.</p>
      <Section title="Günlük" items={daily} />
      <Section title="Haftalık" items={weekly} />
    </div>
  )
}

function Section({ title, items }: { title: string; items: ChallengeDef[] }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      <div className="space-y-3">
        {items.map((def) => {
          const state = challengeService.getState(def)
          const ratio = Math.min(1, state.progress / def.target)
          return (
            <article key={def.id} className="rounded-3xl border border-line bg-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{def.title}</p>
                  <p className="text-xs text-mute">{def.description}</p>
                </div>
                <span className="rounded-full bg-gold/15 px-2 py-1 text-xs font-bold text-gold">+{def.xp} XP</span>
              </div>
              <ProgressBar value={ratio} className="mt-3" />
              <p className="mt-2 text-xs text-mute">
                {state.claimed ? 'Tamamlandı ✓' : `${state.progress} / ${def.target}`}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
