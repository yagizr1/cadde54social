import { Bookmark, Copy, Repeat2, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { copyText } from '../../lib/utils'
import { BoostSheet } from '../premium/BoostSheet'
import { UserActionsSheet } from '../profile/UserActionsSheet'
import { Sheet } from '../ui/Sheet'
import { boostService, isBoosted } from '../../services/boostService'
import { premiumService } from '../../services/premiumService'
import { reelsService } from '../../services/reelsService'
import { repostService } from '../../services/repostService'
import { userService } from '../../services/userService'
import { useUiStore } from '../../store/uiStore'
import type { Reel, User } from '../../types'

export function ReelMenuSheet({
  open,
  onClose,
  reel,
  meId,
  author,
  onChange,
}: {
  open: boolean
  onClose: () => void
  reel: Reel
  meId: string
  author?: User
  onChange: () => void
}) {
  const toast = useUiStore((s) => s.toast)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [boostOpen, setBoostOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const mine = reel.userId === meId
  const me = userService.getById(meId)
  const saved = reel.saves.includes(meId)
  const reposted = repostService.has(meId, 'reel', reel.id)
  const boosted = isBoosted(reel)
  const otherBoost = boostService.activeFor(meId)
  const replacing = Boolean(otherBoost && !(otherBoost.kind === 'reel' && otherBoost.id === reel.id))

  function closeAll() {
    setDeleteOpen(false)
    setBoostOpen(false)
    onClose()
  }

  async function run(fn: () => Promise<unknown> | unknown, ok: string) {
    if (busy) return
    setBusy(true)
    try {
      await fn()
      toast(ok)
      onChange()
      closeAll()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'İşlem yapılamadı', 'err')
    } finally {
      setBusy(false)
    }
  }

  function copyLink() {
    void copyText(`${window.location.origin}/app/reels/${reel.id}`).then(() => {
      toast('Bağlantı kopyalandı')
      closeAll()
    })
  }

  const sharedActions = (
    <>
      <Action
        icon={Bookmark}
        label={saved ? 'Kayıtlardan çıkar' : 'Kaydet'}
        onClick={() =>
          void run(() => reelsService.toggleSave(reel.id, meId), saved ? 'Kayıtlardan çıkarıldı' : 'Reels kaydedildi')
        }
      />
      <Action icon={Copy} label="Bağlantıyı kopyala" onClick={copyLink} />
    </>
  )

  if (!mine) {
    if (!author) return null
    return (
      <UserActionsSheet
        open={open}
        onClose={onClose}
        meId={meId}
        target={author}
        onChange={onChange}
        extra={
          <>
            <Action
              icon={Repeat2}
              label={reposted ? 'Tekrar paylaşımı kaldır' : 'Tekrar paylaş'}
              onClick={() =>
                void run(
                  () => repostService.toggle(meId, 'reel', reel.id, reel.userId),
                  reposted ? 'Tekrar paylaşım kaldırıldı' : 'Tekrar paylaşıldı',
                )
              }
            />
            {sharedActions}
          </>
        }
      />
    )
  }

  return (
    <>
      <Sheet open={open && !deleteOpen && !boostOpen} onClose={closeAll}>
        <div className="space-y-1">
          <Action
            icon={Sparkles}
            label={boosted ? 'Öne çıkarılıyor' : 'Öne çıkar'}
            onClick={() => setBoostOpen(true)}
          />
          {sharedActions}
          <Action icon={Trash2} label="Sil" danger onClick={() => setDeleteOpen(true)} />
          <button type="button" onClick={closeAll} className="mt-2 w-full rounded-2xl bg-panel py-3 text-sm font-semibold">
            İptal
          </button>
        </div>
      </Sheet>

      <BoostSheet
        open={open && boostOpen}
        onClose={() => setBoostOpen(false)}
        kindLabel="Reels"
        boosted={boosted}
        hoursLeft={boostService.hoursLeft(reel)}
        replacing={replacing}
        premium={premiumService.isActive(me)}
        busy={busy}
        onConfirm={() => void run(() => boostService.setReel(reel.id, meId, true), '24 saat öne çıkarıldı')}
        onStop={() => void run(() => boostService.setReel(reel.id, meId, false), 'Öne çıkarma durdu')}
      />

      <Sheet open={open && deleteOpen} onClose={() => setDeleteOpen(false)} title="Reels’i sil?">
        <p className="mb-4 text-sm text-mute">Bu Reels kalıcı olarak silinir. Geri alınamaz.</p>
        <button
          type="button"
          className="w-full rounded-2xl bg-red-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={busy}
          onClick={() =>
            void run(() => {
              if (!reelsService.remove(reel.id, meId)) throw new Error('Silinemedi')
            }, 'Reels silindi')
          }
        >
          Sil
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(false)}
          className="mt-2 w-full rounded-2xl bg-panel py-3 text-sm font-semibold"
        >
          Vazgeç
        </button>
      </Sheet>
    </>
  )
}

function Action({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Copy
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
