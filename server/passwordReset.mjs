import nodemailer from 'nodemailer'

const codes = new Map()
const TTL_MS = 15 * 60 * 1000

function envFlag(name, fallback = '') {
  return (process.env[name] ?? fallback).toString().trim()
}

function mailReady() {
  return (
    envFlag('MAIL_ENABLED', 'true') !== 'false' &&
    Boolean(envFlag('SMTP_HOST') && envFlag('SMTP_USER') && envFlag('SMTP_PASS'))
  )
}

function createTransport() {
  const port = Number(envFlag('SMTP_PORT', '465'))
  const secure = envFlag('SMTP_SECURE', 'true') === 'true' || port === 465
  return nodemailer.createTransport({
    host: envFlag('SMTP_HOST'),
    port,
    secure,
    auth: {
      user: envFlag('SMTP_USER'),
      pass: envFlag('SMTP_PASS'),
    },
    tls: {
      minVersion: 'TLSv1.2',
      servername: envFlag('SMTP_HOST'),
    },
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
  })
}

function sixDigit() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function sendResetMail(to, code) {
  const fromUser = envFlag('SMTP_USER')
  const fromName = envFlag('MAIL_FROM_NAME', 'Cadde54 Social')
  const transport = createTransport()
  await transport.sendMail({
    from: `"${fromName}" <${fromUser}>`,
    to,
    replyTo: fromUser,
    subject: 'Şifre sıfırlama kodu — Cadde54 Social',
    text: `Cadde54 Social şifre sıfırlama kodun: ${code}\n\nKod 15 dakika geçerli.`,
    html: `
      <div style="background:#050505;color:#fff;font-family:Arial,sans-serif;padding:28px;border-radius:16px">
        <p style="font-size:22px;font-weight:800;margin:0 0 12px">Cadde<span style="color:#22c55e">54</span> Social</p>
        <p style="margin:0 0 16px;color:#a3a3a3">Şifre sıfırlama kodun:</p>
        <p style="font-size:32px;letter-spacing:8px;font-weight:800;color:#22c55e;margin:0 0 16px">${code}</p>
        <p style="margin:0;color:#a3a3a3;font-size:13px">Kod 15 dakika geçerlidir. Bu isteği sen yapmadıysan yok say.</p>
      </div>
    `,
    envelope: { from: fromUser, to },
  })
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export { codes as resetCodes, mailReady, sendResetMail, sixDigit }

export function passwordResetMiddleware() {
  return async function handle(req, res, next) {
    const url = (req.url ?? '').split('?')[0]
    if (req.method !== 'POST' || !url.startsWith('/api/auth/forgot')) {
      next()
      return
    }

    try {
      const body = await readJson(req)
      const email = String(body.email ?? '').trim().toLowerCase()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        json(res, 400, { ok: false, error: 'Geçerli bir e-posta gir' })
        return
      }

      if (url === '/api/auth/forgot' || url === '/api/auth/forgot/') {
        if (!mailReady()) {
          json(res, 503, { ok: false, error: 'E-posta servisi kapalı. SMTP ayarlarını kontrol et.' })
          return
        }
        const code = sixDigit()
        codes.set(email, { code, expiresAt: Date.now() + TTL_MS })
        try {
          await sendResetMail(email, code)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'SMTP hatası'
          console.error('[password-reset] SMTP:', message)
          json(res, 500, { ok: false, error: 'E-posta gönderilemedi. SMTP ayarlarını kontrol et.' })
          return
        }
        json(res, 200, { ok: true })
        return
      }

      if (url === '/api/auth/forgot/verify') {
        const code = String(body.code ?? '').replace(/\s/g, '')
        const row = codes.get(email)
        if (!row || row.expiresAt < Date.now() || row.code !== code) {
          json(res, 400, { ok: false, error: 'Kod hatalı veya süresi doldu' })
          return
        }
        codes.delete(email)
        json(res, 200, { ok: true })
        return
      }

      next()
    } catch {
      json(res, 400, { ok: false, error: 'İstek işlenemedi' })
    }
  }
}
