import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isAdminUser } from '../lib/admin'
import { Link, useNavigate } from '../lib/nav'
import { Button } from '../components/ui/Button'
import { BrandLabel } from '../components/layout/BrandMark'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'

const field =
  'w-full rounded-xl border border-line bg-panel px-3 py-2.5 text-sm outline-none focus:border-hot sm:rounded-2xl sm:px-4 sm:py-3 sm:text-base md:py-3.5'

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
    <div className="mx-auto grid min-h-dvh w-full max-w-[min(28rem,92vw)] place-items-center px-4 sm:px-6">
      <form
        className="w-full anim-page"
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
        <p className="font-display text-[clamp(1.75rem,7vw,3rem)] font-extrabold leading-none tracking-tight">
          {adding ? (
            <>Hesap ekle</>
          ) : (
            <>
              <BrandLabel />
            </>
          )}
        </p>
        <p className="mt-2 text-[clamp(0.8rem,3.2vw,1.05rem)] text-mute">
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
        {error ? <p className="mt-2 text-[clamp(0.75rem,3vw,0.95rem)] text-hot sm:mt-3">{error}</p> : null}
        {adding ? null : (
          <div className="mt-2 text-right sm:mt-3">
            <Link to="/forgot-password" className="text-[clamp(0.75rem,3vw,0.95rem)] text-mute underline">
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
        <p className="mt-3 text-center text-[clamp(0.75rem,3vw,0.95rem)] text-mute sm:mt-4">
          Hesabın yok mu?{' '}
          <Link to={adding ? '/register?add=1' : '/register'} className="text-white underline">
            Kayıt ol
          </Link>
        </p>
        {adding ? null : (
          <p className="mt-4 text-center text-[clamp(0.7rem,2.8vw,0.85rem)] text-mute">
            <a href="/" className="text-white underline">
              Tanıtım sitesine dön
            </a>
          </p>
        )}
      </form>
    </div>
  )
}
