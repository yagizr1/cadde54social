import { Link, useLocation } from 'react-router-dom'
import { APP_BASE } from '../lib/appPath'
import { BrandLabel } from '../components/layout/BrandMark'
import { APP_NAME } from '../lib/constants'

type Kind = 'terms' | 'privacy'

export function LegalPage({ kind }: { kind: Kind }) {
  const { pathname } = useLocation()
  const fromApp = pathname.startsWith(`${APP_BASE}/`)
  const backTo = fromApp ? `${APP_BASE}/settings/about` : '/'
  const title = kind === 'privacy' ? 'Gizlilik politikası' : 'Kullanım şartları'
  const body = kind === 'privacy' ? privacy : terms

  return (
    <div className="min-h-dvh bg-ink text-white">
      <header className="safe-t sticky top-0 z-20 border-b border-white/10 bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to={backTo} className="text-sm text-mute">
            Geri
          </Link>
          <p className="font-display text-[15px] font-bold">
            <BrandLabel />
          </p>
          <span className="w-10" />
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-[12px] font-semibold tracking-wide text-hot">{APP_NAME}</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm text-mute">Son güncelleme: 4 Eylül 2026</p>
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-white/85">
          {body.map((block) => (
            <section key={block.h}>
              <h2 className="font-semibold text-white">{block.h}</h2>
              {block.p.map((para) => (
                <p key={para} className="mt-2 text-mute">
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </div>
  )
}

const terms: { h: string; p: string[] }[] = [
  {
    h: '1. Taraflar',
    p: [
      'Bu şartlar, Cadde 54 uygulamasını (“Uygulama”) kullanan kişi ile Uygulama işletmecisi arasındadır. Uygulamayı açarak veya hesap oluşturarak bu metni kabul etmiş sayılırsın.',
    ],
  },
  {
    h: '2. Yaş ve uygunluk',
    p: [
      'Cadde 54 16 yaşını doldurmuş kullanıcılar içindir. Hesap açarak 16 yaşından büyük olduğunu beyan edersin. 16 yaşından küçüklerin kullanımı yasaktır.',
    ],
  },
  {
    h: '3. Hesap',
    p: [
      'Kullanıcı adı, e-posta ve şifre senden sorumludur. Şifreni başkasıyla paylaşma. Hesabında yapılan işlemler senin hesabın üzerinden yapılmış kabul edilir. Şüpheli girişte şifreni değiştir ve Yardım’dan bildir.',
    ],
  },
  {
    h: '4. İçerik ve davranış',
    p: [
      'Gönderi, hikâye, reels, mesaj, itiraf, tanış ve buluşma içerikleri yasalara ve Cadde 54 kurallarına uymalıdır. Taciz, nefret söylemi, spam, sahte hesap, ifşa, tehdit, cinsel istismar içeriği ve başkasının izni olmadan kişisel veri paylaşımı yasaktır.',
      'İhlalde içerik kaldırılabilir, hesap kısıtlanabilir veya kapatılabilir. Yasal zorunluluk halinde yetkili mercilere bilgi verilebilir.',
    ],
  },
  {
    h: '5. Konum (Buradayım)',
    p: [
      'Buradayım özelliği, tarayıcının verdiği konumun Cadde 54 (Bağdat Caddesi civarı) alanında olup olmadığına bakar. Konum izni vermezsen bu özellik çalışmaz. Konumu sahte cihaz veya uygulama ile yanıltmak yasaktır.',
    ],
  },
  {
    h: '6. Premium',
    p: [
      'Premium aylık üyeliktir. Ödeme WhatsApp üzerinden yönlendirilir; üyelik, ödemen doğrulandıktan sonra işletmeci tarafından açılır. Uygulama içinden kart çekilmez. Süre bitince ayrıcalıklar durur. İade talepleri, ödemenin alındığı kanal üzerinden ayrıca değerlendirilir.',
    ],
  },
  {
    h: '7. Henüz açılmayan özellikler',
    p: [
      'İşletmeler ve ayın ödülleri gibi duyurulan bazı başlıklar henüz yayında değildir. Bu sayfalar yer tutucudur; çekiliş, kampanya veya ödül taahhüdü yoktur.',
    ],
  },
  {
    h: '8. Sorumluluk',
    p: [
      'Kullanıcılar arasındaki mesaj, eşleşme ve buluşmalardan Cadde 54 sorumlu tutulamaz. Gerçek hayatta tanışırken basiretli davran. Uygulama “olduğu gibi” sunulur; kesintisiz hizmet garanti edilmez.',
    ],
  },
  {
    h: '9. Değişiklik',
    p: [
      'Bu metin güncellenebilir. Önemli değişiklikler uygulamada duyurulur. Kullanmaya devam etmek yeni metni kabul anlamına gelir.',
    ],
  },
]

const privacy: { h: string; p: string[] }[] = [
  {
    h: '1. Veri sorumlusu',
    p: [
      'Cadde 54, 6698 sayılı KVKK kapsamında kişisel verilerini Uygulama hizmetini sunmak için işler. Soruların için uygulama içi Yardım bölümünü veya işletmecinin duyurduğu iletişim kanalını kullan.',
    ],
  },
  {
    h: '2. İşlenen veriler',
    p: [
      'Hesap: ad, kullanıcı adı, e-posta, şifre (hash’lenmiş), cinsiyet, yaş (girdiysen), profil fotoğrafı ve biyografi.',
      'İçerik: gönderi, hikâye, reels, yorum, mesaj, tanış fotoğrafları, buluşma kayıtları, itiraflar ve yüklediğin medya.',
      'Konum: Buradayım için anlık enlem/boylam, Cadde 54 alanında olup olmadığın ve check-in sürelerin. Konum sürekli harita takibi olarak saklanmaz; doğrulama ve süre için kullanılır.',
      'Teknik: oturum jetonu, cihazdaki kayıtlı hesaplar, bildirim tercihleri ve güvenlik uyarıları.',
    ],
  },
  {
    h: '3. Amaç ve hukuki sebep',
    p: [
      'Veriler hesabını yönetmek, içeriği göstermek, eşleşme ve mesajlaşmayı çalıştırmak, konum özelliğini doğrulamak, güvenliği sağlamak, kötüye kullanımı önlemek ve yasal yükümlülükleri yerine getirmek için işlenir. Hukuki sebepler: sözleşmenin ifası, meşru menfaat ve açık rıza (konum izni, isteğe bağlı alanlar).',
    ],
  },
  {
    h: '4. Paylaşım',
    p: [
      'Kişisel veriler satılmaz. E-posta gönderimi için SMTP sağlayıcısı, barındırma ve yasal zorunluluk halleri dışında üçüncü kişilerle paylaşılmaz. Diğer kullanıcılar, gizlilik ayarlarına göre profilini, içeriğini ve (gizlemediysen) Cadde’de oluşunu görebilir.',
    ],
  },
  {
    h: '5. Saklama ve güvenlik',
    p: [
      'Şifreler düz metin olarak tutulmaz. Medya dosyaları sunucu diskine kaydedilir. Veriler, hesabın durduğu ve yasal saklama süreleri dolduğu sürece tutulur. Hesap kapatma talebin Yardım üzerinden iletilir.',
    ],
  },
  {
    h: '6. Hakların',
    p: [
      'KVKK md. 11 kapsamında verilerine erişme, düzeltme, silme, işlemeyi kısıtlama ve itiraz etme hakların vardır. Kullanıcı adı ve e-postanı Ayarlar → Hesap’tan güncelleyebilir, şifreni Güvenlik’ten değiştirebilirsin.',
    ],
  },
  {
    h: '7. Çerez ve yerel depolama',
    p: [
      'Oturum jetonu ve tercihlerin tarayıcının yerel deposunda tutulur. Zorunlu oturum işlemi dışında reklam profillemesi yapılmaz.',
    ],
  },
]
