import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link, useNavigate } from '../lib/nav'
import { Button } from '../components/ui/Button'
import { AuthFrame } from '../components/layout/AuthFrame'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import type { Gender } from '../types'

const field =
  'box-border w-full min-w-0 rounded-xl border border-line bg-panel px-3 py-2.5 text-sm outline-none focus:border-hot sm:rounded-2xl sm:px-4 sm:py-3 sm:text-base md:py-3.5'

export function RegisterPage() {
  const register = useAuthStore((s) => s.register)
  const toast = useUiStore((s) => s.toast)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const adding = params.get('add') === '1'
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirm: '',
    gender: '' as Gender | '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <AuthFrame
      onSubmit={(e) => {
          e.preventDefault()
          setError('')
          if (form.name.trim().length < 2) return setError('Ad soyad en az 2 karakter olmalı')
          if (!/^[a-zA-Z0-9._]{3,16}$/.test(form.username)) {
            return setError('Kullanıcı adı 3-16 karakter, harf/rakam olmalı')
          }
          if (['admin', 'cadde54', 'cadde_54'].includes(form.username.toLowerCase())) {
            return setError('Bu kullanıcı adı alınmış')
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Geçerli bir e-posta gir')
          if (form.password.length < 6) return setError('Şifre en az 6 karakter olmalı')
          if (form.password !== form.confirm) return setError('Şifreler eşleşmiyor')
          if (!form.gender) return setError('Cinsiyet seçmelisin')
          if (!accepted) return setError('16 yaşını ve şartları kabul etmelisin')
          const gender = form.gender
          setLoading(true)
          void (async () => {
            try {
              await register({
                name: form.name,
                username: form.username,
                email: form.email,
                password: form.password,
                gender,
              })
              toast(adding ? 'Yeni hesap eklendi' : 'Hesabın hazır')
              navigate('/', { replace: true })
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Kayıt yapılamadı')
            } finally {
              setLoading(false)
            }
          })()
        }}
      >
        {adding ? (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-1 text-sm text-mute"
          >
            <ChevronLeft className="h-5 w-5" />
            Geri
          </button>
        ) : null}
        <p className="font-display text-[1.65rem] font-extrabold leading-tight sm:text-[2.25rem]">
          {adding ? 'Yeni hesap oluştur' : 'Aramıza katıl'}
        </p>
        <p className="mt-2 text-sm leading-snug text-mute sm:text-base">
          {adding ? 'Yeni hesabı bu cihaza ekle, diğer hesapların durur.' : 'Cadde54 Social hesabını oluştur, hemen içeri gir.'}
        </p>
        <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ad Soyad" className={field} />
          <input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="Kullanıcı adı" className={field} />
          <input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="E-posta" type="email" className={field} />
          <input value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Şifre (en az 6 karakter)" type="password" className={field} />
          <input value={form.confirm} onChange={(e) => set('confirm', e.target.value)} placeholder="Şifre tekrar" type="password" className={field} />
          <div>
            <p className="mb-2 text-sm text-mute">Cinsiyet</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                  onClick={() => set('gender', id)}
                  className={`${field} ${form.gender === id ? 'border-hot text-white' : 'text-mute'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <label className="mt-4 flex items-start gap-2.5 text-sm text-mute">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 accent-hot"
          />
          <span>
            16 yaşını doldurdum.{' '}
            <Link to="/sartlar" className="text-white underline">
              Kullanım şartları
            </Link>{' '}
            ve{' '}
            <Link to="/gizlilik" className="text-white underline">
              gizlilik politikasını
            </Link>{' '}
            okudum, kabul ediyorum.
          </span>
        </label>
        {error ? <p className="mt-2 text-sm text-hot sm:mt-3">{error}</p> : null}
        <Button
          className="mt-4 w-full rounded-xl py-2.5 text-sm sm:mt-5 sm:rounded-2xl sm:py-3 sm:text-base md:py-3.5"
          disabled={loading}
        >
          {loading ? 'Oluşturuluyor...' : adding ? 'Oluştur ve ekle' : 'Kayıt ol ve gir'}
        </Button>
        <p className="mt-3 text-center text-sm text-mute sm:mt-4">
          Zaten hesabın var mı?{' '}
          <Link to={adding ? '/login?add=1' : '/login'} className="text-white underline">
            Giriş yap
          </Link>
        </p>
    </AuthFrame>
  )
}
