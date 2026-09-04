import { Check, Plus } from 'lucide-react'
import { useNavigate } from '../../lib/nav'
import { accountService } from '../../services/accountService'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { Avatar } from '../ui/Avatar'
import { Sheet } from '../ui/Sheet'

export function AccountSwitcherSheet() {
  const open = useUiStore((s) => s.accountSwitcherOpen)
  const setOpen = useUiStore((s) => s.setAccountSwitcher)
  const user = useAuthStore((s) => s.user)
  const switchTo = useAuthStore((s) => s.switchTo)
  const toast = useUiStore((s) => s.toast)
  const navigate = useNavigate()
  const saved = accountService.list()
  const accounts =
    user && !saved.some((a) => a.userId === user.id)
      ? [
          {
            userId: user.id,
            username: user.username,
            name: user.name,
            avatar: user.avatar,
            token: '',
            lastUsedAt: Date.now(),
          },
          ...saved,
        ]
      : saved

  function addAccount() {
    accountService.rememberCurrent()
    setOpen(false)
    navigate('/login?add=1')
  }

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="Hesap değiştir">
      <div className="max-h-[60vh] overflow-y-auto">
        {accounts.map((acc) => {
          const current = acc.userId === user?.id
          return (
            <button
              key={acc.userId}
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-white/5"
              onClick={() => {
                if (current) {
                  setOpen(false)
                  return
                }
                void (async () => {
                  try {
                    await switchTo(acc.userId)
                    setOpen(false)
                    toast(`${acc.username}`)
                  } catch (err) {
                    toast(err instanceof Error ? err.message : 'Hesaba geçilemedi', 'err')
                  }
                })()
              }}
            >
              <Avatar src={acc.avatar} name={acc.name} size={52} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{acc.username}</p>
                <p className="truncate text-[13px] text-mute">{acc.name}</p>
              </div>
              {current ? (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-hot text-ink">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              ) : (
                <span className="h-6 w-6 rounded-full border border-white/30" />
              )}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className="mt-1 flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-white/5"
        onClick={addAccount}
      >
        <span className="grid h-[52px] w-[52px] place-items-center rounded-full border border-white/20">
          <Plus className="h-6 w-6" />
        </span>
        <p className="font-semibold">Hesap ekle</p>
      </button>
    </Sheet>
  )
}
