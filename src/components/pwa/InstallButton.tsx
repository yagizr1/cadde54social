import { Download } from 'lucide-react'
import { useState } from 'react'
import { IosInstallGuide } from './IosInstallGuide'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { cx } from '../../lib/utils'
import { useUiStore } from '../../store/uiStore'

export function InstallButton({
  className,
  label = 'İndir',
}: {
  className?: string
  label?: string
}) {
  const { installed, ios, iosInApp, prompt } = usePwaInstall()
  const toast = useUiStore((s) => s.toast)
  const [iosOpen, setIosOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  if (installed) return null

  async function onClick() {
    if (busy) return
    if (ios) {
      setIosOpen(true)
      return
    }
    setBusy(true)
    const result = await prompt()
    setBusy(false)
    if (result === 'accepted') toast('Uygulama indirildi')
    else if (result === 'unavailable') {
      toast('Yükleme bu tarayıcıda açılmıyor. Chrome veya Edge kullan.', 'err')
    }
  }

  return (
    <>
      <button type="button" onClick={() => void onClick()} className={className} disabled={busy}>
        <Download className="h-4 w-4" />
        {busy ? 'İndiriliyor...' : label}
      </button>
      {iosOpen ? <IosInstallGuide inApp={iosInApp} onClose={() => setIosOpen(false)} /> : null}
    </>
  )
}

export function installBtnClass(kind: 'header' | 'hero' | 'ghost' = 'hero'): string {
  return cx(
    'inline-flex items-center gap-2 font-semibold',
    kind === 'header' && 'rounded-full bg-hot px-3.5 py-1.5 text-[13px] text-ink',
    kind === 'hero' && 'rounded-full bg-hot px-5 py-2.5 text-sm text-ink',
    kind === 'ghost' && 'rounded-full border border-white/15 px-5 py-2.5 text-sm',
  )
}
