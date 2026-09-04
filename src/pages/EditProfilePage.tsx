import { useState } from 'react'
import { useNavigate } from '../lib/nav'
import { AvatarCropSheet } from '../components/ui/AvatarCropSheet'
import { Button } from '../components/ui/Button'
import { useApp } from '../hooks/useApp'
import { MIN_AGE } from '../lib/constants'
import { uploadDataUrl } from '../lib/uploadMedia'
import { userService } from '../services/userService'
import { useUiStore } from '../store/uiStore'
import type { Gender } from '../types'

export function EditProfilePage() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [avatar, setAvatar] = useState(user?.avatar ?? '')
  const [gender, setGender] = useState<Gender>(user?.gender ?? 'unspecified')
  const [age, setAge] = useState(user?.age ? String(user.age) : '')
  const [cropFile, setCropFile] = useState<File | null>(null)
  if (!user) return null

  return (
    <div className="mx-auto max-w-xl px-4 py-4 anim-page">
      <h1 className="font-display text-2xl font-bold">Profili düzenle</h1>
      <label className="mt-6 block text-center">
        <img src={avatar} alt="" className="mx-auto h-24 w-24 rounded-full object-cover" />
        <input
          type="file"
          accept="image/*"
          className="mt-3 w-full text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) setCropFile(file)
          }}
        />
        <p className="mt-1 text-[12px] text-mute">Fotoğraf seçince kırpıp zoom’layabilirsin</p>
      </label>
      {cropFile ? (
        <AvatarCropSheet
          file={cropFile}
          onClose={() => setCropFile(null)}
          onDone={async (dataUrl) => {
            try {
              setAvatar(await uploadDataUrl(dataUrl))
              setCropFile(null)
            } catch (err) {
              toast(err instanceof Error ? err.message : 'Yüklenemedi', 'err')
            }
          }}
        />
      ) : null}
      <div className="mt-4 space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-line bg-panel px-4 py-3" placeholder="Ad" />
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-28 w-full rounded-2xl border border-line bg-panel px-4 py-3" placeholder="Bio" />
      </div>
      <label className="mt-4 block text-sm text-mute">
        Yaş
        <input
          type="number"
          min={MIN_AGE}
          max={99}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-line bg-panel px-4 py-3 text-white"
          placeholder={String(MIN_AGE)}
        />
      </label>
      <p className="mt-5 text-sm text-mute">Cinsiyet</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(
          [
            ['female', 'Kadın'],
            ['male', 'Erkek'],
            ['unspecified', 'Belirtmek istemiyorum'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setGender(id)}
            className={`rounded-full px-4 py-2 text-sm ${gender === id ? 'bg-white text-ink' : 'bg-panel'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <Button
        className="mt-6 w-full"
        onClick={() => {
          if (name.trim().length < 2) {
            toast('Ad çok kısa', 'err')
            return
          }
          const parsed = Number(age)
          if (age && (!Number.isFinite(parsed) || parsed < MIN_AGE || parsed > 99)) {
            toast(`Yaş ${MIN_AGE}–99 arasında olmalı`, 'err')
            return
          }
          userService.update(user.id, {
            name: name.trim(),
            bio: bio.trim(),
            avatar,
            gender,
            age: age ? parsed : undefined,
          })
          refresh()
          toast('Profil güncellendi')
          navigate('/profile')
        }}
      >
        Kaydet
      </Button>
    </div>
  )
}
