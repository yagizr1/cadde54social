import {
  Archive,
  ArchiveRestore,
  Copy,
  Eye,
  EyeOff,
  MessageCircle,
  MessageCircleOff,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { copyText } from '../../lib/utils'
import { postService } from '../../services/postService'
import { useUiStore } from '../../store/uiStore'
import type { Post } from '../../types'
import { Sheet } from '../ui/Sheet'

export function OwnPostSheet({
  open,
  onClose,
  post,
  meId,
  onChange,
  onEdit,
}: {
  open: boolean
  onClose: () => void
  post: Post
  meId: string
  onChange: () => void
  onEdit: () => void
}) {
  const toast = useUiStore((s) => s.toast)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  function closeAll() {
    setDeleteOpen(false)
    onClose()
  }

  async function run(fn: () => Promise<unknown>, ok: string, err?: string) {
    if (busy) return
    setBusy(true)
    try {
      const result = await fn()
      if (result === undefined && err) {
        toast(err, 'err')
        return
      }
      toast(ok)
      onChange()
      closeAll()
    } catch {
      toast('İşlem yapılamadı', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Sheet open={open && !deleteOpen} onClose={closeAll}>
        <div className="space-y-1">
          <Action
            icon={Pencil}
            label="Düzenle"
            onClick={() => {
              onClose()
              onEdit()
            }}
          />
          <Action
            icon={post.hideLikes ? Eye : EyeOff}
            label={post.hideLikes ? 'Beğeni sayısını göster' : 'Beğeni sayısını gizle'}
            onClick={() =>
              void run(
                () => postService.update(post.id, meId, { hideLikes: !post.hideLikes }),
                post.hideLikes ? 'Beğeni sayısı görünür' : 'Beğeni sayısı gizlendi',
              )
            }
          />
          <Action
            icon={post.commentsOff ? MessageCircle : MessageCircleOff}
            label={post.commentsOff ? 'Yorumları aç' : 'Yorumları kapat'}
            onClick={() =>
              void run(
                () => postService.update(post.id, meId, { commentsOff: !post.commentsOff }),
                post.commentsOff ? 'Yorumlar açıldı' : 'Yorumlar kapatıldı',
              )
            }
          />
          <Action
            icon={post.pinnedAt ? PinOff : Pin}
            label={post.pinnedAt ? 'Sabitlemeyi kaldır' : 'Profile sabitle'}
            onClick={() =>
              void run(
                () => postService.togglePin(post.id, meId),
                post.pinnedAt ? 'Sabitleme kaldırıldı' : 'Profile sabitlendi',
                'En fazla 3 gönderi sabitleyebilirsin',
              )
            }
          />
          <Action
            icon={Copy}
            label="Bağlantıyı kopyala"
            onClick={() => {
              void copyText(`${window.location.origin}/app/p/${post.id}`).then(() => {
                toast('Bağlantı kopyalandı')
                closeAll()
              })
            }}
          />
          <Action
            icon={post.archived ? ArchiveRestore : Archive}
            label={post.archived ? 'Arşivden çıkar' : 'Arşivle'}
            onClick={() =>
              void run(
                () => postService.toggleArchive(post.id, meId),
                post.archived ? 'Arşivden çıkarıldı' : 'Arşivlendi',
              )
            }
          />
          <Action icon={Trash2} label="Sil" danger onClick={() => setDeleteOpen(true)} />
          <button type="button" onClick={closeAll} className="mt-2 w-full rounded-2xl bg-panel py-3 text-sm font-semibold">
            İptal
          </button>
        </div>
      </Sheet>

      <Sheet open={open && deleteOpen} onClose={() => setDeleteOpen(false)} title="Gönderiyi sil?">
        <p className="mb-4 text-sm text-mute">Bu gönderi kalıcı olarak silinir. Geri alınamaz.</p>
        <button
          type="button"
          className="w-full rounded-2xl bg-red-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={busy}
          onClick={() =>
            void run(() => postService.remove(post.id, meId), 'Gönderi silindi')
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
  icon: typeof Pencil
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
