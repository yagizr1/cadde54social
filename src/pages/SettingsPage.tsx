import {
  Archive,
  AtSign,
  Ban,
  Bell,
  Bookmark,
  ChevronRight,
  Info,
  Lock,
  MessageSquarePlus,
  Shield,
  Sparkles,
  UserRound,
  Users,
  VolumeX,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import { Link, useNavigate } from '../lib/nav'
import { BackButton } from '../components/layout/BackButton'
import { ProfileGrid } from '../components/profile/ProfileGrid'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useApp } from '../hooks/useApp'
import { MIN_AGE } from '../lib/constants'
import { timeAgo } from '../lib/utils'
import { authService } from '../services/authService'
import { feedbackService, type FeedbackType } from '../services/feedbackService'
import { premiumService } from '../services/premiumService'
import { postService } from '../services/postService'
import { settingsService } from '../services/settingsService'
import { storyService } from '../services/storyService'
import { userService } from '../services/userService'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { api } from '../lib/api'
import { APP_NAME } from '../lib/constants'
import type { AudiencePrivacy, MeetShowGender, MessagePrivacy, UserSettings } from '../types'

function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 rounded-full transition ${on ? 'bg-hot' : 'bg-line'}`}
      aria-pressed={on}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${on ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

function Row({
  title,
  text,
  on,
  onChange,
}: {
  title: string
  text: string
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="font-semibold">{title}</p>
        {text ? <p className="text-xs text-mute">{text}</p> : null}
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  )
}

function Choice({
  value,
  onChange,
}: {
  value: AudiencePrivacy | MessagePrivacy
  onChange: (v: AudiencePrivacy) => void
}) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {(
        [
          ['everyone', 'Herkes'],
          ['following', 'Takip'],
          ['none', 'Kapalı'],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`rounded-2xl px-2 py-2 text-xs ${value === id ? 'bg-hot text-ink' : 'bg-ink text-mute'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-4 anim-page">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <div className="mt-5">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const { section } = useParams()
  if (section === 'account') return <AccountSection />
  if (section === 'security') return <SecuritySection />
  if (section === 'privacy') return <PrivacySection />
  if (section === 'meet') return <MeetSection />
  if (section === 'interactions') return <InteractionsSection />
  if (section === 'notifications') return <NotificationsSection />
  if (section === 'muted') return <MutedSection />
  if (section === 'blocked') return <BlockedSection />
  if (section === 'saved') return <SavedSection />
  if (section === 'archive') return <ArchiveSection />
  if (section === 'about') return <AboutSection />
  if (section === 'feedback') return <FeedbackSection />
  return <SettingsHome />
}

function SettingsHome() {
  const { user } = useApp()
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  if (!user) return null

  const groups = [
    {
      title: 'Hesabın',
      items: [
        { to: '/premium', label: 'Premium', desc: 'Üyelik al, mavi tik aç', icon: Sparkles },
        { to: '/settings/account', label: 'Hesap', desc: 'Kullanıcı adı, e-posta, profil', icon: UserRound },
        { to: '/settings/security', label: 'Güvenlik', desc: 'Şifre, giriş uyarısı', icon: Shield },
      ],
    },
    {
      title: 'Nasıl kullandığın',
      items: [
        { to: '/settings/notifications', label: 'Bildirimler', desc: 'Ne için bildirim alacağını seç', icon: Bell },
        { to: '/settings/saved', label: 'Kaydedilenler', desc: 'Kaydettiğin gönderiler', icon: Bookmark },
        { to: '/settings/archive', label: 'Arşivler', desc: 'Gönderiler ve hikâyeler', icon: Archive },
      ],
    },
    {
      title: 'Kimler görebilir',
      items: [
        { to: '/settings/privacy', label: 'Gizlilik', desc: 'Hesap, konum ve mesajlar', icon: Lock },
        { to: '/settings/meet', label: 'Tanış', desc: 'Keşfette görünürlük, cinsiyet ve yaş', icon: Users },
        { to: '/settings/interactions', label: 'Yorumlar ve etiketler', desc: 'Kim yorumlar, bahseder, etiketler', icon: AtSign },
        { to: '/settings/muted', label: 'Sessize alınanlar', desc: 'Akışta gizlediğin hesaplar', icon: VolumeX },
        { to: '/settings/blocked', label: 'Engellenenler', desc: 'Engellediğin kullanıcılar', icon: Ban },
      ],
    },
    {
      title: 'Destek',
      items: [
        { to: '/settings/feedback', label: 'Yardım', desc: 'İstek veya hata bildir', icon: MessageSquarePlus },
        { to: '/settings/about', label: 'Hakkında', desc: `${APP_NAME} ve kurallar`, icon: Info },
      ],
    },
  ]

  return (
    <div className="mx-auto max-w-xl px-4 py-4 anim-page">
      <h1 className="font-display text-2xl font-bold">Ayarlar</h1>
      <div className="mt-5 space-y-6">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-mute">{g.title}</p>
            <div className="space-y-2">
              {g.items.map((f) => {
                const Icon = f.icon
                return (
                  <Link
                    key={f.to}
                    to={f.to}
                    className="flex items-center gap-3 rounded-3xl border border-line bg-panel px-4 py-4"
                  >
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-ink">
                      <Icon className="h-5 w-5 text-hot" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{f.label}</p>
                      <p className="text-xs text-mute">{f.desc}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-mute" />
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <Button
        variant="danger"
        className="mt-8 w-full bg-red-600 py-3 text-white"
        onClick={() => {
          void logout().then((next) => {
            if (!next) navigate('/login')
          })
        }}
      >
        Çıkış yap
      </Button>
    </div>
  )
}

function AccountSection() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    setUsername(user.username)
    setEmail(user.email)
  }, [user?.id])

  if (!user) return null

  return (
    <Shell title="Hesap">
      <form
        className="space-y-3 rounded-3xl border border-line bg-panel p-4"
        onSubmit={(e) => {
          e.preventDefault()
          setError('')
          const handle = username.trim()
          const mail = email.trim().toLowerCase()
          if (!/^[a-zA-Z0-9._]{3,16}$/.test(handle)) {
            setError('Kullanıcı adı 3-16 karakter, harf/rakam olmalı')
            return
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
            setError('Geçerli bir e-posta gir')
            return
          }
          setBusy(true)
          void (async () => {
            try {
              await api('/api/actions/users.update', {
                method: 'POST',
                body: { username: handle, email: mail },
              })
              await refresh()
              toast('Hesap güncellendi')
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Kaydedilemedi')
            } finally {
              setBusy(false)
            }
          })()
        }}
      >
        <label className="block text-sm">
          <span className="text-mute">Kullanıcı adı</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-line bg-ink px-4 py-3 text-sm"
            autoComplete="username"
          />
        </label>
        <label className="block text-sm">
          <span className="text-mute">E-posta</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-line bg-ink px-4 py-3 text-sm"
            autoComplete="email"
          />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button className="w-full" disabled={busy}>
          {busy ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
        <Link to="/profile/edit" className="inline-block text-sm text-hot">
          Profili düzenle
        </Link>
      </form>
    </Shell>
  )
}

function SecuritySection() {
  const { user } = useApp()
  const toast = useUiStore((s) => s.toast)
  const { refresh } = useApp()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  if (!user) return null
  const settings = settingsService.get(user.id)

  function set<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    settingsService.update(user!.id, { [key]: value })
    refresh()
    toast('Ayar kaydedildi')
  }

  return (
    <Shell title="Güvenlik">
      <div className="rounded-3xl border border-line bg-panel p-4">
        <p className="font-semibold">Şifre değiştir</p>
        <div className="mt-3 space-y-2">
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Mevcut şifre" className="w-full rounded-2xl border border-line bg-ink px-4 py-3 text-sm" />
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Yeni şifre (en az 6 karakter)" className="w-full rounded-2xl border border-line bg-ink px-4 py-3 text-sm" />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Yeni şifre tekrar" className="w-full rounded-2xl border border-line bg-ink px-4 py-3 text-sm" />
        </div>
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        <Button
          className="mt-3 w-full"
          onClick={() => {
            setError('')
            if (next.length < 6) {
              setError('Yeni şifre en az 6 karakter olmalı')
              return
            }
            if (next !== confirm) {
              setError('Şifreler eşleşmiyor')
              return
            }
            void (async () => {
              try {
                await authService.changePassword(user.username, current, next)
                setCurrent('')
                setNext('')
                setConfirm('')
                toast('Şifre güncellendi')
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Şifre değiştirilemedi')
              }
            })()
          }}
        >
          Şifreyi kaydet
        </Button>
      </div>
      <div className="mt-3 space-y-4 rounded-3xl border border-line bg-panel p-4">
        <Row
          title="Giriş uyarıları"
          text="Yeni oturum açılınca bildirim al."
          on={settings.loginAlerts}
          onChange={(v) => set('loginAlerts', v)}
        />
      </div>
    </Shell>
  )
}

function PrivacySection() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const navigate = useNavigate()
  if (!user) return null
  const settings = settingsService.get(user.id)
  const premium = premiumService.isActive(user)

  function set<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    settingsService.update(user!.id, { [key]: value })
    refresh()
    toast('Ayar kaydedildi')
  }

  return (
    <Shell title="Gizlilik">
      <div className="space-y-4 rounded-3xl border border-line bg-panel p-4">
        <Row title="Gizli hesap" text="Takip etmeyenler içeriğini sınırlı görür." on={settings.privateAccount} onChange={(v) => set('privateAccount', v)} />
        <Row title="Buradayım’ı gizle" text="Cadde 54’te yazısı başkalarına görünmez." on={settings.hideHereStatus} onChange={(v) => set('hideHereStatus', v)} />
        <Row title="Beğeni sayısını gizle" text="Gönderilerindeki beğeni sayısı gizlenir." on={settings.hideLikes} onChange={(v) => set('hideLikes', v)} />
        <Row
          title="Hayalet modu"
          text="Premium. Sen görürsün, onlar seni görmez."
          on={premium && settings.ghostMode}
          onChange={(v) => {
            if (!premium) {
              toast('Hayalet modu Premium ile açılır', 'info')
              navigate('/premium')
              return
            }
            set('ghostMode', v)
          }}
        />
        <Row title="Story yanıtları" text="Story’lerine yanıt yazılabilsin." on={settings.allowStoryReplies} onChange={(v) => set('allowStoryReplies', v)} />
        <div>
          <p className="font-semibold">Kimler mesaj atabilir</p>
          <Choice value={settings.allowMessages} onChange={(v) => set('allowMessages', v as MessagePrivacy)} />
        </div>
      </div>
    </Shell>
  )
}

function MeetSection() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  if (!user) return null
  const meId = user.id
  const settings = settingsService.get(meId)
  const [min, setMin] = useState(settings.meetAgeMin)
  const [max, setMax] = useState(settings.meetAgeMax)

  function set<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    settingsService.update(meId, { [key]: value })
    refresh()
    toast('Ayar kaydedildi')
  }

  function saveAge() {
    const meetAgeMin = Math.min(min, max)
    const meetAgeMax = Math.max(min, max)
    setMin(meetAgeMin)
    setMax(meetAgeMax)
    settingsService.update(meId, { meetAgeMin, meetAgeMax })
    refresh()
    toast('Ayar kaydedildi')
  }

  return (
    <Shell title="Tanış">
      <div className="space-y-4 rounded-3xl border border-line bg-panel p-4">
        <Row
          title="Keşfette göster"
          text="Kapalıyken yeni kullanıcılara görünmezsin. Mevcut eşleşme, takip ve sohbetlerin kalır."
          on={settings.showInMeet}
          onChange={(v) => set('showInMeet', v)}
        />
        <div>
          <p className="font-semibold">Bana kimleri göster?</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(
              [
                ['everyone', 'Herkes'],
                ['female', 'Kadın'],
                ['male', 'Erkek'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => set('meetShowGender', id as MeetShowGender)}
                className={`rounded-2xl px-2 py-2 text-xs ${settings.meetShowGender === id ? 'bg-hot text-ink' : 'bg-ink text-mute'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="font-semibold">Yaş aralığı</p>
          <p className="text-xs text-mute">
            {Math.min(min, max)} — {Math.max(min, max)}
          </p>
          <div className="mt-3 space-y-3">
            <label className="block text-xs text-mute">
              En az
              <input
                type="range"
                min={MIN_AGE}
                max={80}
                value={min}
                onChange={(e) => setMin(Number(e.target.value))}
                onMouseUp={saveAge}
                onTouchEnd={saveAge}
                className="mt-1 w-full accent-hot"
              />
            </label>
            <label className="block text-xs text-mute">
              En çok
              <input
                type="range"
                min={MIN_AGE}
                max={80}
                value={max}
                onChange={(e) => setMax(Number(e.target.value))}
                onMouseUp={saveAge}
                onTouchEnd={saveAge}
                className="mt-1 w-full accent-hot"
              />
            </label>
          </div>
        </div>
        <Row
          title="Eşleşme kalkınca takibi de kaldır"
          text="Kapalıyken eşleşmeyi silsen de takip kalır."
          on={settings.unmatchRemovesFollow}
          onChange={(v) => set('unmatchRemovesFollow', v)}
        />
      </div>
    </Shell>
  )
}

function BlockedSection() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  if (!user) return null
  const blocked = settingsService
    .get(user.id)
    .blockedIds.map((id) => userService.getById(id))
    .filter((u) => Boolean(u))

  return (
    <Shell title="Engellenenler">
      {blocked.length === 0 ? (
        <EmptyState title="Liste boş" text="Bir profilde Engelle dersen burada görünür." />
      ) : (
        <div className="space-y-2">
          {blocked.map((u) =>
            u ? (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3">
                <Avatar src={u.avatar} name={u.name} size={40} />
                <p className="flex-1 font-semibold">@{u.username}</p>
                <button
                  className="text-sm text-hot"
                  onClick={() => {
                    settingsService.unblock(user.id, u.id)
                    refresh()
                    toast('Engel kaldırıldı')
                  }}
                >
                  Kaldır
                </button>
              </div>
            ) : null,
          )}
        </div>
      )}
    </Shell>
  )
}

function NotificationsSection() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  if (!user) return null
  const settings = settingsService.get(user.id)

  function set<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    settingsService.update(user!.id, { [key]: value })
    refresh()
    toast('Ayar kaydedildi')
  }

  return (
    <Shell title="Bildirimler">
      <div className="space-y-4 rounded-3xl border border-line bg-panel p-4">
        <Row title="Tümünü duraklat" text="Açıkken beğeni, yorum ve takip bildirimleri gelmez." on={settings.notifyPaused} onChange={(v) => set('notifyPaused', v)} />
        <Row title="Beğeniler" text="Gönderin beğenilince haber ver." on={settings.notifyLikes} onChange={(v) => set('notifyLikes', v)} />
        <Row title="Yorumlar ve bahsetmeler" text="Yorum veya @gelince haber ver." on={settings.notifyComments} onChange={(v) => set('notifyComments', v)} />
        <Row title="Yeni takipçiler" text="Biri seni takip edince haber ver." on={settings.notifyFollows} onChange={(v) => set('notifyFollows', v)} />
        <Row title="Mesajlar" text="Yeni sohbet mesajı için." on={settings.notifyMessages} onChange={(v) => set('notifyMessages', v)} />
        <Row title="Hikâye ve görüntülenme" text="Story ve profil görüntülenmeleri." on={settings.notifyStory} onChange={(v) => set('notifyStory', v)} />
      </div>
    </Shell>
  )
}

function InteractionsSection() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const [word, setWord] = useState('')
  if (!user) return null
  const settings = settingsService.get(user.id)

  function set<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    settingsService.update(user!.id, { [key]: value })
    refresh()
    toast('Ayar kaydedildi')
  }

  return (
    <Shell title="Yorumlar ve etiketler">
      <div className="space-y-4 rounded-3xl border border-line bg-panel p-4">
        <div>
          <p className="font-semibold">Kimler yorum yapabilir</p>
          <p className="text-xs text-mute">Gönderilerindeki yorumlar.</p>
          <Choice value={settings.allowComments} onChange={(v) => set('allowComments', v)} />
        </div>
        <div>
          <p className="font-semibold">Kimler senden bahsedebilir</p>
          <p className="text-xs text-mute">@kullanıcı adı ile anılma.</p>
          <Choice value={settings.allowMentions} onChange={(v) => set('allowMentions', v)} />
        </div>
        <div>
          <p className="font-semibold">Kimler seni etiketleyebilir</p>
          <p className="text-xs text-mute">Fotoğrafta etiket.</p>
          <Choice value={settings.allowTags} onChange={(v) => set('allowTags', v)} />
        </div>
      </div>
      <div className="mt-3 rounded-3xl border border-line bg-panel p-4">
        <p className="font-semibold">Gizli kelimeler</p>
        <p className="mt-1 text-xs text-mute">Bu kelimeleri içeren yorumlar önce sadece sana görünür.</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const next = word.trim().toLowerCase()
            if (next.length < 2) return
            if (settings.hiddenWords.includes(next)) {
              setWord('')
              return
            }
            set('hiddenWords', [...settings.hiddenWords, next])
            setWord('')
          }}
        >
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Kelime ekle"
            className="min-w-0 flex-1 rounded-2xl border border-line bg-ink px-4 py-3 text-sm"
          />
          <Button type="submit">Ekle</Button>
        </form>
        {settings.hiddenWords.length === 0 ? (
          <p className="mt-3 text-sm text-mute">Henüz kelime yok.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {settings.hiddenWords.map((w) => (
              <button
                key={w}
                type="button"
                className="rounded-full bg-ink px-3 py-1 text-sm"
                onClick={() => set('hiddenWords', settings.hiddenWords.filter((x) => x !== w))}
              >
                {w} ×
              </button>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}

function MutedSection() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  if (!user) return null
  const muted = settingsService
    .get(user.id)
    .mutedIds.map((id) => userService.getById(id))
    .filter((u) => Boolean(u))

  return (
    <Shell title="Sessize alınanlar">
      {muted.length === 0 ? (
        <EmptyState title="Liste boş" text="Bir profilde Sessize al dersen burada görünür." />
      ) : (
        <div className="space-y-2">
          {muted.map((u) =>
            u ? (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3">
                <Avatar src={u.avatar} name={u.name} size={40} />
                <p className="flex-1 font-semibold">@{u.username}</p>
                <button
                  className="text-sm text-hot"
                  onClick={() => {
                    settingsService.unmute(user.id, u.id)
                    refresh()
                    toast('Ses açıldı')
                  }}
                >
                  Aç
                </button>
              </div>
            ) : null,
          )}
        </div>
      )}
    </Shell>
  )
}

function SavedSection() {
  const { user, refresh } = useApp()
  if (!user) return null
  const items = postService.savedBy(user.id)
  return (
    <Shell title="Kaydedilenler">
      {items.length === 0 ? (
        <EmptyState title="Kayıt yok" text="Bir gönderide yer imine basınca burada durur." />
      ) : (
        <div className="-mx-4">
          <ProfileGrid posts={items} empty="Kayıt yok." meId={user.id} onChange={refresh} />
        </div>
      )}
    </Shell>
  )
}

function AboutSection() {
  return (
    <Shell title="Hakkında">
      <div className="space-y-3 rounded-3xl border border-line bg-panel p-4 text-sm">
        <p className="font-semibold">{APP_NAME}</p>
        <p className="text-mute">
          Bağdat Caddesi civarı için yerel sosyal ağ. Buradayım, konumunun Cadde 54 alanında olup
          olmadığına bakar; sürekli takip etmez.
        </p>
        <p className="text-mute">Kurallar: taciz, spam, ifşa ve hedef gösterme yok. İhlalleri bildir.</p>
        <div className="flex flex-col gap-2 pt-1">
          <Link to="/sartlar" className="text-hot">
            Kullanım şartları
          </Link>
          <Link to="/gizlilik" className="text-hot">
            Gizlilik politikası (KVKK)
          </Link>
        </div>
      </div>
    </Shell>
  )
}

function ArchiveSection() {
  const { user, refresh } = useApp()
  const [tab, setTab] = useState<'posts' | 'stories'>('posts')
  const [story, setStory] = useState<string | null>(null)
  if (!user) return null
  const posts = postService.archivedBy(user.id)
  const stories = storyService.archivedBy(user.id)
  const openStory = stories.find((s) => s.id === story)

  return (
    <div className="mx-auto max-w-xl anim-page">
      <header className="sticky top-0 z-20 bg-ink/90 backdrop-blur-xl">
        <div className="flex h-12 items-center gap-1 px-1">
          <BackButton to="/settings" />
          <h1 className="min-w-0 flex-1 truncate text-[18px] font-bold">Arşivler</h1>
        </div>
        <div className="grid grid-cols-2 border-b border-white/10">
          <button
            type="button"
            onClick={() => setTab('posts')}
            className={`relative py-2.5 text-[14px] font-semibold ${tab === 'posts' ? 'text-white' : 'text-mute'}`}
          >
            Gönderiler
            {tab === 'posts' ? <span className="absolute inset-x-0 bottom-0 h-[1px] bg-white" /> : null}
          </button>
          <button
            type="button"
            onClick={() => setTab('stories')}
            className={`relative py-2.5 text-[14px] font-semibold ${tab === 'stories' ? 'text-white' : 'text-mute'}`}
          >
            Hikâyeler
            {tab === 'stories' ? <span className="absolute inset-x-0 bottom-0 h-[1px] bg-white" /> : null}
          </button>
        </div>
      </header>

      {tab === 'posts' ? (
        posts.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Gönderi arşivi boş" text="Bir gönderide Arşivle dersen burada durur." />
          </div>
        ) : (
          <ProfileGrid posts={posts} empty="Gönderi arşivi boş." meId={user.id} onChange={refresh} />
        )
      ) : stories.length === 0 ? (
        <div className="p-6">
          <EmptyState title="Hikâye arşivi boş" text="24 saati dolan hikâyelerin burada saklanır." />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-px overflow-hidden bg-ink">
          {stories.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStory(s.id)}
              className="aspect-square min-w-0 overflow-hidden bg-ink"
            >
              <img src={s.image} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {openStory
        ? createPortal(
            <button
              type="button"
              className="fixed inset-0 z-[90] bg-black"
              onClick={() => setStory(null)}
              aria-label="Kapat"
            >
              <img src={openStory.image} alt="" className="h-full w-full object-contain" />
            </button>,
            document.body,
          )
        : null}
    </div>
  )
}

function FeedbackSection() {
  const { user, refresh } = useApp()
  const toast = useUiStore((s) => s.toast)
  const [type, setType] = useState<FeedbackType>('request')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  if (!user) return null
  const items = feedbackService.list(user.id)
  const labels: Record<FeedbackType, string> = {
    request: 'İstek',
    bug: 'Hata',
  }

  return (
    <Shell title="İstek ve hata">
      <form
        className="rounded-3xl border border-line bg-panel p-4"
        onSubmit={(e) => {
          e.preventDefault()
          setError('')
          if (title.trim().length < 3) {
            setError('Başlık en az 3 karakter olsun')
            return
          }
          if (message.trim().length < 8) {
            setError('Mesajı biraz daha aç')
            return
          }
          feedbackService.add(user.id, type, title.trim(), message.trim())
          setTitle('')
          setMessage('')
          refresh()
          toast('Gönderildi, teşekkürler')
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(labels) as FeedbackType[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setType(id)}
              className={`rounded-2xl py-2 text-xs ${type === id ? 'bg-hot text-ink' : 'bg-ink text-mute'}`}
            >
              {labels[id]}
            </button>
          ))}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Başlık"
          className="mt-3 w-full rounded-2xl border border-line bg-ink px-4 py-3 text-sm"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ne ekleyelim veya neyi düzeltelim?"
          className="mt-2 min-h-28 w-full rounded-2xl border border-line bg-ink px-4 py-3 text-sm"
        />
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        <Button className="mt-3 w-full">Gönder</Button>
      </form>

      <h2 className="mt-6 mb-2 text-sm font-semibold text-mute">Gönderdiklerin</h2>
      {items.length === 0 ? (
        <EmptyState title="Henüz yok" text="İstek veya hata bildirimin burada durur." />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-line bg-panel p-4">
              <p className="text-xs text-hot">{labels[item.type]} · {timeAgo(item.createdAt)}</p>
              <p className="mt-1 font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-mute">{item.message}</p>
            </article>
          ))}
        </div>
      )}
    </Shell>
  )
}
