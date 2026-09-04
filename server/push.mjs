import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { DATA_DIR, loadDb, saveDb } from './db.mjs'

const require = createRequire(import.meta.url)
const webpush = require('web-push')

const VAPID_PATH = join(DATA_DIR, 'vapid.json')

function loadOrCreateVapid() {
  const fromEnv = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT || 'mailto:hello@cadde54social.fun',
  }
  if (fromEnv.publicKey && fromEnv.privateKey) return fromEnv
  if (existsSync(VAPID_PATH)) {
    try {
      const saved = JSON.parse(readFileSync(VAPID_PATH, 'utf8'))
      if (saved.publicKey && saved.privateKey) {
        return {
          publicKey: saved.publicKey,
          privateKey: saved.privateKey,
          subject: saved.subject || fromEnv.subject,
        }
      }
    } catch {
      /* regenerate */
    }
  }
  const generated = webpush.generateVAPIDKeys()
  const keys = { ...generated, subject: fromEnv.subject }
  try {
    mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(VAPID_PATH, JSON.stringify(keys, null, 2), 'utf8')
  } catch {
    /* ignore */
  }
  return keys
}

let ready = false
let vapid = { publicKey: '', privateKey: '', subject: 'mailto:hello@cadde54social.fun' }

function ensurePush() {
  if (ready) return vapid
  vapid = loadOrCreateVapid()
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)
  ready = true
  return vapid
}

export function pushPublicKey() {
  return ensurePush().publicKey
}

function wantsPush(db, type, recipientId) {
  const row = (db.settings ?? []).find((s) => s.userId === recipientId) ?? {}
  if (row.notifyPaused) return false
  if (type === 'xp' || type === 'challenge' || type === 'leaderboard') return false
  if (type === 'like' || type === 'repost' || type === 'meet_like') return row.notifyLikes !== false
  if (type === 'comment' || type === 'mention') return row.notifyComments !== false
  if (type === 'follow') return row.notifyFollows !== false
  if (type === 'message') return row.notifyMessages !== false
  if (type === 'view') return row.notifyStory !== false
  return true
}

function payloadFor(db, n) {
  const actor = n.actorId ? (db.users ?? []).find((u) => u.id === n.actorId) : null
  const title = actor?.username ? `@${actor.username}` : 'Cadde54 Social'
  return {
    title,
    body: String(n.text || 'Yeni bildirim'),
    url: n.href || '/app/',
    tag: n.groupKey ? `${n.recipientId}:${n.groupKey}` : `${n.type || 'n'}-${n.recipientId || ''}`,
    renotify: n.type === 'message',
  }
}

async function dropDead(endpoints) {
  if (!endpoints.length) return
  const db = loadDb()
  const before = (db.pushSubscriptions ?? []).length
  db.pushSubscriptions = (db.pushSubscriptions ?? []).filter((s) => !endpoints.includes(s.endpoint))
  if (db.pushSubscriptions.length !== before) saveDb(db)
}

async function sendToSubs(subs, payload) {
  ensurePush()
  const dead = []
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 12 },
        )
      } catch (err) {
        const code = err?.statusCode
        if (code === 404 || code === 410) dead.push(sub.endpoint)
      }
    }),
  )
  if (dead.length) await dropDead(dead)
}

export function dispatchPush(db, n) {
  if (!n?.recipientId) return
  if (!wantsPush(db, n.type, n.recipientId)) return
  const subs = (db.pushSubscriptions ?? []).filter((s) => s.userId === n.recipientId)
  if (!subs.length) return
  const payload = payloadFor(db, n)
  setImmediate(() => {
    void sendToSubs(subs, payload)
  })
}

export function savePushSubscription(userId, body) {
  const endpoint = String(body?.endpoint ?? '')
  const keys = body?.keys ?? {}
  if (!endpoint || !keys.p256dh || !keys.auth) throw new Error('Bildirim kaydı geçersiz')
  const db = loadDb()
  const rest = (db.pushSubscriptions ?? []).filter((s) => s.endpoint !== endpoint)
  const mine = rest.filter((s) => s.userId === userId)
  const others = rest.filter((s) => s.userId !== userId)
  db.pushSubscriptions = [
    ...others,
    ...mine.slice(-7),
    { userId, endpoint, keys: { p256dh: String(keys.p256dh), auth: String(keys.auth) }, updatedAt: Date.now() },
  ]
  saveDb(db)
}

export function removePushSubscription(userId, endpoint) {
  const db = loadDb()
  if (endpoint) {
    db.pushSubscriptions = (db.pushSubscriptions ?? []).filter((s) => s.endpoint !== endpoint)
  } else {
    db.pushSubscriptions = (db.pushSubscriptions ?? []).filter((s) => s.userId !== userId)
  }
  saveDb(db)
}
