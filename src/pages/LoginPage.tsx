import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isAdminUser } from '../lib/admin'
import { Link, useNavigate } from '../lib/nav'
import { Button } from '../components/ui/Button'
import { AuthFrame } from '../components/layout/AuthFrame'
import { BrandLabel } from '../components/layout/BrandMark'
import { isStandalone } from '../lib/pwaInstall'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'

const field =
  'box-border w-full min-w-0 rounded-xl border border-line bg-panel px-3 py-2.5 text-sm outline-none focus:border-hot sm:rounded-2xl sm:px-4 sm:py-3 sm:text-base md:py-3.5'

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const toast = useUiStore((s) => s.toast)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const adding = params.get('add') === '1'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <AuthFrame
      onSubmit={(e) => {
        e.preventDefault()
        setError('')
        if (!username.trim() || !password) {
          setError('Kullanıcı adı ve şifre gerekli')
          return
        }
        setLoading(true)
        void (async () => {
          try {
            const user = await login(username, password)
            toast(isAdminUser(user) ? 'Yönetim paneli' : adding ? `${user.username} eklendi` : `${user.username} hoşgeldin`)
            navigate(isAdminUser(user) ? '/admin' : '/', { replace: true })
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Giriş yapılamadı')
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
      <p className="font-display text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-[2.25rem]">
        {adding ? (
          <>Hesap ekle</>
        ) : (
          <BrandLabel className="max-w-full flex-wrap" />
        )}
      </p>
      <p className="mt-2 text-sm leading-snug text-mute sm:text-base">
        {adding ? 'Bu cihaza başka bir hesap ekle, sonra tek dokunuşla geç.' : 'Gençlik sosyal platformu. Gece burada başlar.'}
      </p>
      <div className="mt-6 space-y-2.5 sm:mt-8 sm:space-y-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Kullanıcı adı"
          autoComplete="username"
          className={field}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Şifre"
          autoComplete="current-password"
          className={field}
        />
      </div>
      {error ? <p className="mt-2 text-sm text-hot sm:mt-3">{error}</p> : null}
      {adding ? null : (
        <div className="mt-2 text-right sm:mt-3">
          <Link to="/forgot-password" className="text-sm text-mute underline">
            Şifremi unuttum
          </Link>
        </div>
      )}
      <Button
        className="mt-4 w-full rounded-xl py-2.5 text-sm sm:mt-5 sm:rounded-2xl sm:py-3 sm:text-base md:py-3.5"
        disabled={loading}
      >
        {loading ? 'Giriş yapılıyor...' : adding ? 'Hesabı ekle' : 'Giriş yap'}
      </Button>
      <p className="mt-3 text-center text-sm text-mute sm:mt-4">
        Hesabın yok mu?{' '}
        <Link to={adding ? '/register?add=1' : '/register'} className="text-white underline">
          Kayıt ol
        </Link>
      </p>
      {adding || isStandalone() ? null : (
        <p className="mt-4 text-center text-xs text-mute">
          <a href="/" className="text-white underline">
            Tanıtım sitesine dön
          </a>
        </p>
      )}
    </AuthFrame>
  )
}
