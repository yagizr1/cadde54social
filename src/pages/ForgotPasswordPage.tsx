import { useState } from 'react'
import { Link, useNavigate } from '../lib/nav'
import { Button } from '../components/ui/Button'
import { AuthFrame } from '../components/layout/AuthFrame'
import { authService } from '../services/authService'
import { useUiStore } from '../store/uiStore'

const field =
  'box-border w-full min-w-0 rounded-xl border border-line bg-panel px-3 py-2.5 text-sm outline-none focus:border-hot sm:rounded-2xl sm:px-4 sm:py-3 sm:text-base md:py-3.5'

export function ForgotPasswordPage() {
  const toast = useUiStore((s) => s.toast)
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [emailInput, setEmailInput] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <AuthFrame
      onSubmit={(e) => {
          e.preventDefault()
          setError('')
          void (async () => {
            setLoading(true)
            try {
              if (step === 'email') {
                const next = await authService.requestPasswordReset(emailInput)
                setEmail(next)
                setStep('code')
                toast('Sıfırlama kodu e-postana gönderildi')
                return
              }
              if (code.trim().length < 6) {
                setError('6 haneli kodu gir')
                return
              }
              if (password.length < 6) {
                setError('Yeni şifre en az 6 karakter olmalı')
                return
              }
              if (password !== confirm) {
                setError('Şifreler eşleşmiyor')
                return
              }
              await authService.confirmPasswordReset(email, code.trim(), password)
              toast('Şifren güncellendi')
              navigate('/login', { replace: true })
            } catch (err) {
              setError(err instanceof Error ? err.message : 'İşlem yapılamadı')
            } finally {
              setLoading(false)
            }
          })()
        }}
      >
        <p className="font-display text-[1.65rem] font-extrabold leading-tight sm:text-[2.25rem]">
          Şifremi unuttum
        </p>
        <p className="mt-2 text-sm leading-snug text-mute sm:text-base">
          {step === 'email'
            ? 'E-posta veya kullanıcı adını yaz, kod gönderelim.'
            : `${email} adresine kod gönderildi.`}
        </p>

        {step === 'email' ? (
          <input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="E-posta veya kullanıcı adı"
            autoComplete="email"
            className={`mt-6 ${field}`}
          />
        ) : (
          <div className="mt-6 space-y-2.5 sm:space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6 haneli kod"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={field}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Yeni şifre (en az 6 karakter)"
              className={field}
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Yeni şifre tekrar"
              className={field}
            />
          </div>
        )}

        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

        <Button
          className="mt-4 w-full rounded-xl py-2.5 text-sm sm:mt-5 sm:rounded-2xl sm:py-3 sm:text-base md:py-3.5"
          disabled={loading}
        >
          {loading ? 'Gönderiliyor...' : step === 'email' ? 'Kod gönder' : 'Şifreyi güncelle'}
        </Button>

        {step === 'code' ? (
          <button
            type="button"
            className="mt-3 w-full text-center text-sm text-mute"
            onClick={() => {
              setStep('email')
              setCode('')
              setError('')
            }}
          >
            Farklı e-posta kullan
          </button>
        ) : null}

        <p className="mt-4 text-center text-sm text-mute">
          <Link to="/login" className="text-white underline">
            Girişe dön
          </Link>
        </p>
    </AuthFrame>
  )
}
