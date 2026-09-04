import { Ban, BellOff, BellRing, Flag, Send } from 'lucide-react'
import { useState } from 'react'
import { settingsService } from '../../services/settingsService'
import { useUiStore } from '../../store/uiStore'
import { profileSharePayload } from '../../services/shareService'
import { ShareSheet } from '../ui/ShareSheet'
import { Sheet } from '../ui/Sheet'
import type { User } from '../../types'

const REASONS = ['Spam', 'Sahte hesap', 'Taciz', 'Uygunsuz içerik', 'Diğer']

export function UserActionsSheet({
  open,
  onClose,
  meId,
  target,
  onChange,
}: {
  open: boolean
  onClose: () => void
  meId: string
  target: User
  onChange: () => void
}) {
  const toast = useUiStore((s) => s.toast)
  const [reportOpen, setReportOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const muted = settingsService.isMuted(meId, target.id)
  const blocked = settingsService.get(meId).blockedIds.includes(target.id)

  function closeAll() {
    setReportOpen(false)
    setShareOpen(false)
    onClose()
  }

  return (
    <>
      <Sheet open={open && !reportOpen} onClose={closeAll} title={`@${target.username}`}>
        <div className="space-y-1">
          <ActionRow
            icon={Send}
            label="Profili gönder"
            onClick={() => setShareOpen(true)}
          />
          <ActionRow
            icon={muted ? BellRing : BellOff}
            label={muted ? 'Sesi aç' : 'Sessize al'}
            onClick={() => {
              if (muted) settingsService.unmute(meId, target.id)
              else settingsService.mute(meId, target.id)
              toast(muted ? 'Ses açıldı' : `@${target.username} sessize alındı`)
              onChange()
              closeAll()
            }}
          />
          <ActionRow
            icon={Ban}
            label={blocked ? 'Engeli kaldır' : 'Engelle'}
            danger={!blocked}
            onClick={() => {
              if (blocked) {
                settingsService.unblock(meId, target.id)
                toast('Engel kaldırıldı')
              } else {
                settingsService.block(meId, target.id)
                toast(`@${target.username} engellendi`)
              }
              onChange()
              closeAll()
            }}
          />
          <ActionRow icon={Flag} label="Bildir" danger onClick={() => setReportOpen(true)} />
          <button type="button" onClick={closeAll} className="mt-2 w-full rounded-2xl bg-panel py-3 text-sm font-semibold">
            İptal
          </button>
        </div>
      </Sheet>

      <Sheet open={open && reportOpen} onClose={() => setReportOpen(false)} title="Bildir">
        <p className="mb-3 text-sm text-mute">Neden bildiriyorsun?</p>
        <div className="space-y-1">
          {REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => {
                settingsService.report(meId, target.id, reason)
                toast('Şikayetin alındı')
                closeAll()
              }}
              className="w-full rounded-2xl px-3 py-3 text-left text-sm hover:bg-panel"
            >
              {reason}
            </button>
          ))}
        </div>
      </Sheet>
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        payload={profileSharePayload(target)}
      />
    </>
  )
}

function ActionRow({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Ban
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm hover:bg-panel ${
        danger ? 'text-red-500' : ''
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  )
}
