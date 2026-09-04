import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useNavigate } from '../lib/nav'
import { Button } from '../components/ui/Button'
import { useApp } from '../hooks/useApp'
import { cx } from '../lib/utils'
import { meetupService } from '../services/meetupService'
import { useUiStore } from '../store/uiStore'
import type { MeetupPreference } from '../types'

const field = 'w-full rounded-2xl border border-line bg-panel px-4 py-3 text-sm outline-none focus:border-hot'

const prefs: { id: MeetupPreference; label: string }[] = [
  { id: 'female', label: '👩 Kız' },
  { id: 'male', label: '👨 Erkek' },
  { id: 'any', label: '👥 Farketmez' },
]

export function MeetupEditorPage() {
  const { id } = useParams()
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const navigate = useNavigate()
  const existing = id ? meetupService.getMeetupById(id) : undefined
  const editing = Boolean(id)

  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [locationName, setLocationName] = useState(existing?.locationName ?? '')
  const [date, setDate] = useState(existing?.date ?? '')
  const [time, setTime] = useState(existing?.time ?? '')
  const [currentParticipants, setCurrentParticipants] = useState(String(existing?.currentParticipants ?? 1))
  const [targetParticipants, setTargetParticipants] = useState(String(existing?.targetParticipants ?? 1))
  const [preference, setPreference] = useState<MeetupPreference | ''>(existing?.participantPreference ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!user) return null
  const meId = user.id
  if (editing && !existing) {
    return <p className="px-4 py-10 text-center text-sm text-mute">Buluşma bulunamadı.</p>
  }
  if (editing && existing && existing.creatorId !== user.id) {
    return <p className="px-4 py-10 text-center text-sm text-mute">Bu buluşmayı düzenleyemezsin.</p>
  }

  const currentN = Number(currentParticipants) || 0
  const targetN = Number(targetParticipants) || 0
  const previewTotal = currentN + targetN

  function submit() {
    setError('')
    if (!preference) {
      setError('Kimler katılabilir seçmelisin.')
      return
    }
    setBusy(true)
    try {
      const payload = {
        creatorId: meId,
        title,
        description,
        locationName,
        date,
        time,
        currentParticipants: currentN,
        targetParticipants: targetN,
        participantPreference: preference,
      }
      if (editing && existing) {
        meetupService.updateMeetup(existing.id, meId, payload)
        toast('Buluşma güncellendi')
        refresh()
        navigate(`/meetups/${existing.id}`)
      } else {
        const created = meetupService.createMeetup(payload)
        toast('Buluşma oluşturuldu')
        refresh()
        navigate(`/meetups/${created.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-4 anim-page">
      <h1 className="font-display text-2xl font-bold">{editing ? 'Buluşmayı düzenle' : 'Buluşma oluştur'}</h1>
      <p className="mt-1 text-sm text-mute">Mekan adı yeter. Tam konum veya GPS paylaşılmaz.</p>

      <div className="mt-5 space-y-3">
        <label className="block">
          <span className="mb-1 block text-[12px] text-mute">Etkinlik adı</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="Starbucks’ta Kahve" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-mute">Açıklama</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${field} min-h-24`}
            placeholder="2 kişi olduk, 2 kişi daha arıyoruz."
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-mute">Mekan</span>
          <input value={locationName} onChange={(e) => setLocationName(e.target.value)} className={field} placeholder="Starbucks - Cadde 54" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[12px] text-mute">Tarih</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-mute">Saat</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[12px] text-mute">Biz kaç kişiyiz?</span>
            <input
              type="number"
              min={1}
              value={currentParticipants}
              onChange={(e) => setCurrentParticipants(e.target.value)}
              className={field}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] text-mute">Kaç kişi arıyoruz?</span>
            <input
              type="number"
              min={1}
              value={targetParticipants}
              onChange={(e) => setTargetParticipants(e.target.value)}
              className={field}
            />
          </label>
        </div>
        {previewTotal > 0 ? (
          <p className="text-[13px] text-white/80">
            {currentN} / {previewTotal} kişi
          </p>
        ) : null}

        <div>
          <p className="mb-2 text-[12px] text-mute">Kimler katılabilir?</p>
          <div className="grid grid-cols-3 gap-2">
            {prefs.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreference(p.id)}
                className={cx(
                  'rounded-2xl border px-2 py-3 text-[13px] font-semibold',
                  preference === p.id ? 'border-hot bg-hot/15 text-white' : 'border-line bg-panel text-mute',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-hot">{error}</p> : null}
      <Button className="mt-5 w-full" disabled={busy} onClick={submit}>
        {busy ? 'Kaydediliyor...' : editing ? 'Değişiklikleri kaydet' : 'Buluşmayı yayınla'}
      </Button>
    </div>
  )
}
