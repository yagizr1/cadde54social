import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Coffee,
  Eye,
  EyeOff,
  Flame,
  Heart,
  MapPin,
  MessageCircle,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { InstallButton, installBtnClass } from '../components/pwa/InstallButton'
import { APP_BASE } from '../lib/appPath'
import { BrandLabel } from '../components/layout/BrandMark'

const slides = [
  {
    title: 'Akış ve hikâyeler',
    text: 'Takip ettiklerinin gönderilerini gör, story paylaş, beğen ve yorumla.',
    icon: Heart,
  },
  {
    title: 'Reels ve keşfet',
    text: 'Dikey videolar, yeni hesaplar ve Cadde’den içerikler tek yerde.',
    icon: Clapperboard,
  },
  {
    title: 'Mesajlar',
    text: 'Takiplerden sohbet başlat. Fotoğraf ve yanıtla konuş.',
    icon: MessageCircle,
  },
  {
    title: 'Buluşmalar',
    text: 'Kahve, yürüyüş, etkinlik aç. Kimlerin katılacağını sen seç.',
    icon: Coffee,
  },
  {
    title: 'Buradayım',
    text: 'Konumunla Cadde 54’te olduğunu doğrula. Kimlerin orada olduğunu gör, süren sıralamaya yazılır.',
    icon: MapPin,
  },
  {
    title: 'Sıralama ve görevler',
    text: 'Cadde’de geçirdiğin süreye göre sıra. Günlük görevler, XP ve rozetler hesabında durur.',
    icon: Trophy,
  },
  {
    title: 'İtiraflar',
    text: 'Anonim yaz, Cadde’den habersiz not bırak.',
    icon: Shield,
  },
  {
    title: 'Profil ve takip',
    text: 'Takip et, arkadaşlar, profilini düzenle, gizlilik ayarların sende.',
    icon: Users,
  },
]

const premiumFeatures = [
  { icon: Flame, title: 'Tanış', text: 'Tinder tarzı bir özellik. Kaydır, beğen, eşleş.' },
  { icon: Eye, title: 'Kimler baktı', text: 'Profilini kimlerin gördüğünü gör.' },
  { icon: Zap, title: 'İstatistikler', text: 'Detaylı profil istatistikleri ve içgörüler.' },
  { icon: Sparkles, title: 'Öne çıkarma', text: 'Gönderini 24 saat Keşfet’te büyük göster, akışta üste çıkar.' },
  { icon: BadgeCheck, title: 'Mavi tik', text: 'Onaylı hesap işareti profilinde durur.' },
  { icon: EyeOff, title: 'Hayalet modu', text: 'Başkalarının profilini görüntüleyince seni göremezler.' },
]

export function LandingPage() {
  const [i, setI] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % slides.length), 5200)
    return () => window.clearInterval(id)
  }, [])

  const slide = slides[i]
  const Icon = slide.icon

  return (
    <div className="min-h-dvh bg-ink text-white">
      <header className="safe-t sticky top-0 z-20 border-b border-white/10 bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <a href="#top" className="font-display text-[15px] font-bold tracking-tight">
            <BrandLabel />
          </a>
          <nav className="flex items-center gap-2 text-sm">
            <a href="#ozellikler" className="hidden px-3 py-1.5 text-mute sm:block">
              Özellikler
            </a>
            <Link to={`${APP_BASE}/login`} className="px-3 py-1.5 text-mute">
              Giriş
            </Link>
            <Link to={APP_BASE} className="hidden px-3 py-1.5 text-mute sm:block">
              Uygulamayı aç
            </Link>
            <InstallButton className={installBtnClass('header')} />
          </nav>
        </div>
      </header>

      <section id="top" className="mx-auto max-w-5xl px-4 pt-14 pb-10 sm:pt-20">
        <p className="text-[13px] font-semibold tracking-wide text-hot">Cadde 54 topluluğu için bağımsız sosyal platform.</p>
        <h1 className="mt-3 max-w-2xl font-display text-[2.4rem] leading-[1.05] font-extrabold sm:text-6xl">
          Cadde’nin hızlılarına özel sosyal medya uygulaması
        </h1>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-mute">
          Gönderi, hikâye, reels, mesaj, tanışma, buluşma ve Cadde check-in.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <InstallButton className={installBtnClass('hero')} />
          <Link
            to={`${APP_BASE}/register`}
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold"
          >
            Hesap oluştur
          </Link>
          <Link
            to={`${APP_BASE}/login`}
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold"
          >
            Giriş yap
          </Link>
        </div>
      </section>

      <section id="ozellikler" className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="font-display text-2xl font-bold">Ücretsiz özellikler</h2>
        <p className="mt-2 text-sm text-mute">Hesap açınca bunlar hazır.</p>
        <div className="relative mt-6 overflow-hidden rounded-[28px] border border-line bg-panel">
          <div className="flex min-h-[280px] flex-col justify-between p-6 sm:min-h-[320px] sm:p-10">
            <div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-hot/15 text-hot">
                <Icon className="h-6 w-6" />
              </span>
              <h2 className="mt-5 font-display text-2xl font-bold sm:text-3xl">{slide.title}</h2>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-mute">{slide.text}</p>
            </div>
            <div className="mt-8 flex items-center justify-between">
              <div className="flex gap-1.5">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Slayt ${idx + 1}`}
                    onClick={() => setI(idx)}
                    className={`h-1.5 rounded-full transition ${idx === i ? 'w-6 bg-hot' : 'w-1.5 bg-white/25'}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Önceki"
                  onClick={() => setI((n) => (n - 1 + slides.length) % slides.length)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Sonraki"
                  onClick={() => setI((n) => (n + 1) % slides.length)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="premium" className="mx-auto max-w-5xl px-4 pb-20">
        <h2 className="font-display text-2xl font-bold">Premium özellikler</h2>
        <p className="mt-2 text-sm text-mute">Üyelikle açılanlar, kısaca.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {premiumFeatures.map((f) => {
            const FIcon = f.icon
            return (
              <div key={f.title} className="rounded-3xl border border-line bg-panel p-5">
                <FIcon className="h-5 w-5 text-hot" />
                <p className="mt-3 font-semibold">{f.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-mute">{f.text}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="font-display text-2xl font-bold">Nasıl başlarım?</h2>
          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ['1', 'Kayıt ol', 'Adın, kullanıcı adın ve cinsiyetin yeterli.'],
              ['2', 'Uygulamayı aç', 'Akış, hikâye ve Cadde özellikleri hazır.'],
              ['3', 'Cadde’ye gel', 'Buradayım de, tanış, buluş, paylaş.'],
            ].map(([n, t, d]) => (
              <li key={n} className="rounded-3xl border border-line bg-panel p-5">
                <p className="text-hot font-bold">{n}</p>
                <p className="mt-2 font-semibold">{t}</p>
                <p className="mt-1 text-[13px] text-mute">{d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <InstallButton className={installBtnClass('hero')} label="Uygulamayı indir" />
            <Link
              to={APP_BASE}
              className="inline-flex rounded-full border border-white/15 px-6 py-3 text-sm font-semibold"
            >
              Uygulamaya geç
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-[12px] text-mute">
          <p>Cadde54 Social · Serdivan</p>
          <div className="flex flex-wrap gap-4">
            <Link to={`${APP_BASE}/login`}>Giriş</Link>
            <Link to={`${APP_BASE}/register`}>Kayıt</Link>
            <Link to="/sartlar">Şartlar</Link>
            <Link to="/gizlilik">Gizlilik</Link>
            <Link to={APP_BASE}>Uygulama</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
