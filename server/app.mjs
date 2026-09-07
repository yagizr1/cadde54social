import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { extname } from 'node:path'
import { loadEnv } from './env.mjs'
import { loadDb, UPLOAD_DIR, uid } from './db.mjs'
import { seedIfEmpty } from './seed.mjs'
import {
  handleize,
  loginUser,
  logoutToken,
  registerUser,
  resetPassword,
  runAction,
  snapshot,
  userFromToken,
} from './logic.mjs'
import { mailReady, resetCodes, sendResetMail, sixDigit } from './passwordReset.mjs'
import { clientKey, rateLimit } from './rateLimit.mjs'
import { dispatchPush, pushPublicKey, removePushSubscription, savePushSubscription } from './push.mjs'
import { subscribe, typingFor } from './live.mjs'

loadEnv()

const TTL_MS = 15 * 60 * 1000

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname || '').slice(0, 8) || '.bin'
      cb(null, `${uid('up')}${ext}`)
    },
  }),
  limits: { fileSize: 40 * 1024 * 1024 },
})

function bearer(req) {
  const header = String(req.headers.authorization ?? '')
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

function auth(req, res, next) {
  const user = userFromToken(bearer(req))
  if (!user) {
    res.status(401).json({ error: 'Oturum gerekli' })
    return
  }
  req.user = user
  next()
}

function liveAuth(req, res, next) {
  const q = String(req.query?.token ?? '')
  const user = userFromToken(bearer(req) || q)
  if (!user) {
    res.status(401).json({ error: 'Oturum gerekli' })
    return
  }
  req.user = user
  next()
}

function fail(res, err, fallback = 'İstek işlenemedi') {
  const message = err instanceof Error ? err.message : fallback
  res.status(400).json({ error: message })
}

export function createApiApp() {
  seedIfEmpty()
  const app = express()
  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json({ limit: '15mb' }))
  app.use('/uploads', express.static(UPLOAD_DIR))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.post('/api/auth/login', (req, res) => {
    if (!rateLimit(clientKey(req, 'login'), 12, 60_000)) {
      res.status(429).json({ error: 'Çok fazla deneme. Bir dakika bekle.' })
      return
    }
    try {
      const { username, password } = req.body ?? {}
      res.json(loginUser(username, password))
    } catch (err) {
      fail(res, err, 'Giriş yapılamadı')
    }
  })

  app.post('/api/auth/register', (req, res) => {
    if (!rateLimit(clientKey(req, 'register'), 6, 60_000)) {
      res.status(429).json({ error: 'Çok fazla kayıt denemesi. Bir dakika bekle.' })
      return
    }
    try {
      res.json(registerUser(req.body ?? {}))
    } catch (err) {
      fail(res, err, 'Kayıt yapılamadı')
    }
  })

  app.post('/api/auth/logout', (req, res) => {
    logoutToken(bearer(req))
    res.json({ ok: true })
  })

  app.get('/api/auth/me', auth, (req, res) => {
    const db = loadDb()
    res.json({ user: req.user, snapshot: snapshot(db, req.user.id) })
  })

  app.post('/api/auth/forgot', async (req, res) => {
    if (!rateLimit(clientKey(req, 'forgot'), 4, 60_000)) {
      res.status(429).json({ ok: false, error: 'Çok fazla deneme. Bir dakika bekle.' })
      return
    }
    try {
      const raw = String(req.body?.email ?? '').trim()
      const db = loadDb()
      const entry = db.credentials.find(
        (c) => c.email === raw.toLowerCase() || c.username === handleize(raw),
      )
      const email = entry?.email ?? raw.toLowerCase()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ ok: false, error: 'Geçerli bir e-posta veya kullanıcı adı gir' })
        return
      }
      if (!mailReady()) {
        res.status(503).json({ ok: false, error: 'E-posta servisi kapalı. SMTP ayarlarını kontrol et.' })
        return
      }
      const code = sixDigit()
      resetCodes.set(email, { code, expiresAt: Date.now() + TTL_MS })
      await sendResetMail(email, code)
      res.json({ ok: true, email })
    } catch (err) {
      console.error('[password-reset]', err instanceof Error ? err.message : err)
      res.status(500).json({ ok: false, error: 'E-posta gönderilemedi. SMTP ayarlarını kontrol et.' })
    }
  })

  app.post('/api/auth/forgot/verify', (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const code = String(req.body?.code ?? '').replace(/\s/g, '')
    const row = resetCodes.get(email)
    if (!row || row.expiresAt < Date.now() || row.code !== code) {
      res.status(400).json({ ok: false, error: 'Kod hatalı veya süresi doldu' })
      return
    }
    res.json({ ok: true })
  })

  app.post('/api/auth/forgot/reset', (req, res) => {
    try {
      const email = String(req.body?.email ?? '').trim().toLowerCase()
      const code = String(req.body?.code ?? '').replace(/\s/g, '')
      const password = String(req.body?.password ?? '')
      if (password.length < 6) {
        res.status(400).json({ ok: false, error: 'Yeni şifre en az 6 karakter olmalı' })
        return
      }
      const row = resetCodes.get(email)
      if (!row || row.expiresAt < Date.now() || row.code !== code) {
        res.status(400).json({ ok: false, error: 'Kod hatalı veya süresi doldu' })
        return
      }
      resetCodes.delete(email)
      resetPassword(email, password)
      res.json({ ok: true })
    } catch (err) {
      fail(res, err, 'Şifre güncellenemedi')
    }
  })

  app.get('/api/push/public-key', (_req, res) => {
    res.json({ key: pushPublicKey() })
  })

  app.post('/api/push/subscribe', auth, (req, res) => {
    try {
      savePushSubscription(req.user.id, req.body ?? {})
      res.json({ ok: true })
    } catch (err) {
      fail(res, err, 'Bildirim açılamadı')
    }
  })

  app.post('/api/push/unsubscribe', auth, (req, res) => {
    try {
      removePushSubscription(req.user.id, req.body?.endpoint)
      res.json({ ok: true })
    } catch (err) {
      fail(res, err, 'Bildirim kapatılamadı')
    }
  })

  app.get('/api/snapshot', auth, (req, res) => {
    res.json({ snapshot: snapshot(loadDb(), req.user.id), me: req.user })
  })

  app.get('/api/chat/sync', auth, (req, res) => {
    const since = Number(req.query.since) || 0
    const db = loadDb()
    const mine = db.conversations.filter((c) => c.participantIds.includes(req.user.id))
    res.json({
      now: Date.now(),
      conversations: since ? mine.filter((c) => c.updatedAt > since) : mine,
      typing: typingFor(req.user.id, mine),
    })
  })

  app.get('/api/live', liveAuth, (req, res) => {
    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    if (typeof res.flushHeaders === 'function') res.flushHeaders()
    req.socket.setTimeout(0)
    req.socket.setNoDelay?.(true)
    res.write(':ok\n\n')
    const unsub = subscribe(req.user.id, {
      write: (chunk) => {
        res.write(chunk)
        if (typeof res.flush === 'function') res.flush()
      },
    })
    const ping = setInterval(() => {
      try {
        res.write(':ping\n\n')
      } catch {
        clearInterval(ping)
      }
    }, 15000)
    const close = () => {
      clearInterval(ping)
      unsub()
    }
    req.on('close', close)
    res.on('close', close)
  })

  app.post('/api/actions/:name', auth, (req, res) => {
    try {
      const snap = runAction(req.user.id, req.params.name, req.body ?? {})
      if (snap?.okOnly) {
        res.json({ ok: true })
        return
      }
      res.json({ ok: true, snapshot: snap, me: snap.me })
    } catch (err) {
      fail(res, err)
    }
  })

  app.post('/api/upload', auth, (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        const tooBig = err.code === 'LIMIT_FILE_SIZE'
        res.status(tooBig ? 413 : 400).json({ error: tooBig ? 'Fotoğraf çok büyük' : 'Yükleme başarısız' })
        return
      }
      if (!req.file) {
        res.status(400).json({ error: 'Dosya gerekli' })
        return
      }
      res.json({ url: `/uploads/${req.file.filename}` })
    })
  })

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Bulunamadı' })
  })

  return app
}

export function apiMiddleware() {
  const app = createApiApp()
  return (req, res, next) => {
    const url = String(req.originalUrl || req.url || '').split('?')[0]
    if (url.startsWith('/api') || url.startsWith('/uploads')) {
      app(req, res, next)
      return
    }
    next()
  }
}
