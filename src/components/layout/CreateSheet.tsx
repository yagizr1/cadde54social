import { Clapperboard, Coffee, ImagePlus, MapPin, Shield, Sparkles } from 'lucide-react'
import { useNavigate } from '../../lib/nav'
import { startCreate, type CreateTab } from '../../lib/createPicker'
import { useUiStore } from '../../store/uiStore'
import { Sheet } from '../ui/Sheet'

const media: { tab: CreateTab; label: string; desc: string; icon: typeof ImagePlus }[] = [
  { tab: 'post', label: 'Gönderi', desc: 'Fotoğraf paylaş', icon: ImagePlus },
  { tab: 'story', label: 'Story', desc: '24 saatlik hikaye', icon: Sparkles },
  { tab: 'reel', label: 'Reels', desc: 'Dikey video yükle', icon: Clapperboard },
]

const extra = [
  { to: '/confessions', label: 'İtiraf', desc: 'Anonim yaz', icon: Shield },
  { to: '/here', label: 'Buradayım', desc: 'Cadde 54 check-in', icon: MapPin },
  { to: '/meetups/new', label: 'Buluşma', desc: 'Cadde’de etkinlik aç', icon: Coffee },
]

export function CreateSheet() {
  const open = useUiStore((s) => s.createOpen)
  const setCreateOpen = useUiStore((s) => s.setCreateOpen)
  const navigate = useNavigate()

  return (
    <Sheet open={open} onClose={() => setCreateOpen(false)} title="Ne paylaşmak istersin?">
      <div className="grid grid-cols-2 gap-3">
        {media.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.tab}
              onClick={() => {
                setCreateOpen(false)
                startCreate(navigate, a.tab)
              }}
              className="rounded-2xl border border-line bg-panel p-4 text-left transition hover:border-violet/50"
            >
              <Icon className="mb-3 h-5 w-5 text-hot" />
              <p className="font-semibold">{a.label}</p>
              <p className="mt-1 text-xs text-mute">{a.desc}</p>
            </button>
          )
        })}
        {extra.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.to}
              onClick={() => {
                setCreateOpen(false)
                navigate(a.to)
              }}
              className="rounded-2xl border border-line bg-panel p-4 text-left transition hover:border-violet/50"
            >
              <Icon className="mb-3 h-5 w-5 text-hot" />
              <p className="font-semibold">{a.label}</p>
              <p className="mt-1 text-xs text-mute">{a.desc}</p>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
