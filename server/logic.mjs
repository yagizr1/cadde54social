import { loadDb, saveDb, uid, token } from './db.mjs'
import { hashPassword, isHashed, verifyPassword } from './password.mjs'

const ADMIN_ID = 'u_admin'
const MIN_AGE = 16
const CADDE54_CENTER = { lat: 40.9818, lng: 29.0574 }
const CADDE54_RADIUS_M = 450
const RESERVED_HANDLES = new Set(['admin', 'cadde54', 'cadde_54'])
const STARTER_FOLLOW = 'yagiztalhaazman'

function isLifetimePremiumUser(u) {
  return Boolean(u && handleize(u.username) === STARTER_FOLLOW)
}

function grantLifetimePremium(u) {
  if (!u) return
  u.isPremium = true
  u.premiumPlan = 'lifetime'
  u.premiumUntil = null
}

const BOOST_DURATION_MS = 24 * 60 * 60 * 1000

function isPremiumActive(u) {
  if (isLifetimePremiumUser(u)) return true
  if (!u?.isPremium) return false
  if (!u.premiumUntil) return true
  return u.premiumUntil > Date.now()
}

function clearBoosts(db, userId, keep) {
  for (const post of db.posts) {
    if (post.userId !== userId) continue
    if (keep?.kind === 'post' && keep.id === post.id) continue
    if (post.boostedUntil) post.boostedUntil = null
  }
  for (const reel of db.reels) {
    if (reel.userId !== userId) continue
    if (keep?.kind === 'reel' && keep.id === reel.id) continue
    if (reel.boostedUntil) reel.boostedUntil = null
  }
}

function syncLifetimePremium(db) {
  for (const u of db.users) {
    if (isLifetimePremiumUser(u)) grantLifetimePremium(u)
  }
}

function followUser(db, me, target, silent = false) {
  if (!me || !target || target.id === me.id || isStaff(target) || target.banned) return
  if (!me.following.includes(target.id)) me.following.push(target.id)
  if (!target.followers.includes(me.id)) target.followers.push(me.id)
  if (!silent) {
    notify(db, {
      type: 'follow',
      actorId: me.id,
      recipientId: target.id,
      text: 'seni takip etmeye başladı',
      href: `/u/${me.username}`,
    })
  }
}

function isStaff(u) {
  return Boolean(u && (u.id === ADMIN_ID || u.role === 'admin' || u.username === 'admin'))
}

function staffIdSet(db) {
  return new Set(db.users.filter(isStaff).map((u) => u.id))
}

function requireAdmin(me) {
  if (!isStaff(me)) throw new Error('Yetkisiz')
}

function adminTarget(db, body) {
  const target = findUser(db, body.targetId) || findByHandle(db, body.username)
  if (!target || isStaff(target)) throw new Error('Kullanıcı bulunamadı')
  return target
}

function isSuspended(u) {
  if (!u?.suspended) return false
  if (u.suspendedUntil && Number(u.suspendedUntil) <= Date.now()) return false
  return true
}

function accountBlockReason(u) {
  if (!u) return 'Hesap bulunamadı'
  if (u.banned) return u.banReason ? `Bu hesap kapatıldı · ${u.banReason}` : 'Bu hesap kapatıldı'
  if (isSuspended(u)) {
    return u.suspendReason ? `Bu hesap askıya alındı · ${u.suspendReason}` : 'Bu hesap askıya alındı'
  }
  return null
}

function dropSessions(db, userId) {
  db.sessions = (db.sessions ?? []).filter((s) => s.userId !== userId)
}

function stripUserId(list, userId) {
  return (list ?? []).filter((id) => id !== userId)
}

function purgeUserContent(db, userId) {
  db.posts = (db.posts ?? []).filter((p) => p.userId !== userId)
  db.stories = (db.stories ?? []).filter((s) => s.userId !== userId)
  db.reels = (db.reels ?? []).filter((r) => r.userId !== userId)
  db.reposts = (db.reposts ?? []).filter((r) => r.userId !== userId)
  db.meetups = (db.meetups ?? []).filter((m) => m.creatorId !== userId)
  db.meetupRequests = (db.meetupRequests ?? []).filter((r) => r.userId !== userId)
  for (const p of db.posts ?? []) {
    p.comments = (p.comments ?? []).filter((c) => c.userId !== userId)
    p.likes = stripUserId(p.likes, userId)
    p.saves = stripUserId(p.saves, userId)
  }
  for (const r of db.reels ?? []) {
    r.comments = (r.comments ?? []).filter((c) => c.userId !== userId)
    r.likes = stripUserId(r.likes, userId)
  }
  for (const m of db.meetups ?? []) {
    m.participants = stripUserId(m.participants, userId)
  }
}

function purgeUser(db, userId) {
  const user = findUser(db, userId)
  if (!user) throw new Error('Kullanıcı bulunamadı')
  purgeUserContent(db, userId)
  for (const u of db.users) {
    u.followers = stripUserId(u.followers, userId)
    u.following = stripUserId(u.following, userId)
  }
  db.conversations = (db.conversations ?? []).filter((c) => !(c.participantIds ?? []).includes(userId))
  db.notifications = (db.notifications ?? []).filter((n) => n.recipientId !== userId && n.actorId !== userId)
  db.settings = (db.settings ?? []).filter((s) => s.userId !== userId)
  db.swipes = (db.swipes ?? []).filter((s) => s.fromId !== userId && s.toId !== userId)
  db.matches = (db.matches ?? []).filter((m) => !(m.userIds ?? []).includes(userId))
  db.profileViews = (db.profileViews ?? []).filter((v) => v.viewerId !== userId && v.targetId !== userId)
  db.xpHistory = (db.xpHistory ?? []).filter((x) => x.userId !== userId)
  db.feedback = (db.feedback ?? []).filter((f) => f.userId !== userId)
  db.userReports = (db.userReports ?? []).filter((r) => r.fromId !== userId && r.targetId !== userId)
  db.hereSessions = (db.hereSessions ?? []).filter((s) => s.userId !== userId)
  if (db.loginDays) delete db.loginDays[userId]
  if (db.interactUsers) delete db.interactUsers[userId]
  if (db.unlockedBadges) delete db.unlockedBadges[userId]
  if (db.completedHere) delete db.completedHere[userId]
  if (db.searchHistory) delete db.searchHistory[userId]
  db.credentials = (db.credentials ?? []).filter((c) => c.username !== user.username)
  dropSessions(db, userId)
  db.users = db.users.filter((u) => u.id !== userId)
}

function findByHandle(db, username) {
  const handle = handleize(username)
  return db.users.find((u) => u.username === handle)
}

function haversineMeters(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

function handleize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
}

function findUser(db, id) {
  return db.users.find((u) => u.id === id)
}

function settingsOf(db, userId) {
  const found = db.settings.find((s) => s.userId === userId)
  return {
    userId,
    privateAccount: false,
    hideHereStatus: false,
    hideLikes: false,
    ghostMode: false,
    allowMessages: 'everyone',
    allowComments: 'everyone',
    allowMentions: 'everyone',
    allowTags: 'everyone',
    allowStoryReplies: true,
    hiddenWords: [],
    loginAlerts: true,
    notifyPaused: false,
    notifyLikes: true,
    notifyComments: true,
    notifyFollows: true,
    notifyMessages: true,
    notifyStory: true,
    showInMeet: true,
    meetShowGender: 'everyone',
    meetAgeMin: 16,
    meetAgeMax: 40,
    unmatchRemovesFollow: false,
    blockedIds: [],
    mutedIds: [],
    ...(found ?? {}),
    blockedIds: found?.blockedIds ?? [],
    mutedIds: found?.mutedIds ?? [],
    hiddenWords: found?.hiddenWords ?? [],
  }
}

function upsertSettings(db, userId, patch) {
  const next = { ...settingsOf(db, userId), ...patch, userId }
  const idx = db.settings.findIndex((s) => s.userId === userId)
  if (idx >= 0) db.settings[idx] = next
  else db.settings.push(next)
  return next
}

function blocked(db, a, b) {
  return settingsOf(db, a).blockedIds.includes(b) || settingsOf(db, b).blockedIds.includes(a)
}

function hiddenFrom(db, viewerId, otherId) {
  return settingsOf(db, otherId).blockedIds.includes(viewerId)
}

function visibleComments(comments, viewerId, ownerId) {
  return (comments ?? []).filter((c) => !c.hidden || c.userId === viewerId || ownerId === viewerId)
}

function closeHereSession(db, userId, at = Date.now()) {
  db.hereSessions = (db.hereSessions ?? []).map((s) =>
    s.userId === userId && s.endedAt == null ? { ...s, endedAt: Math.max(s.startedAt, at) } : s,
  )
}

function startHereSession(db, userId, at = Date.now()) {
  db.hereSessions = db.hereSessions ?? []
  if (db.hereSessions.some((s) => s.userId === userId && s.endedAt == null)) return
  db.hereSessions.unshift({ id: uid('hs'), userId, startedAt: at, endedAt: null })
}

function expirePresence(db) {
  const now = Date.now()
  for (const u of db.users) {
    if (u.hereUntil && u.hereUntil < now) {
      closeHereSession(db, u.id, u.hereUntil)
      u.hereLeftAt = u.hereLeftAt ?? u.hereUntil
      u.hereUntil = null
      u.hereDemo = false
    }
  }
}

function appHref(path) {
  if (!path || path === '/') return '/app'
  if (path.startsWith('/app/') || path === '/app') return path
  return path.startsWith('/') ? `/app${path}` : path
}

function notify(db, n) {
  if (n.actorId && n.recipientId && n.actorId === n.recipientId) return
  if (n.actorId && n.recipientId && hiddenFrom(db, n.recipientId, n.actorId)) return
  db.notifications.unshift({
    id: uid('n'),
    read: false,
    createdAt: Date.now(),
    ...n,
    href: n.href ? appHref(n.href) : n.href,
  })
  db.notifications = db.notifications.slice(0, 80)
}

function addXp(db, userId, amount, reason) {
  const user = findUser(db, userId)
  if (!user || amount <= 0) return
  user.xp = (user.xp ?? 0) + amount
  db.xpHistory.unshift({ id: uid('xp'), userId, amount, reason, createdAt: Date.now() })
  db.xpHistory = db.xpHistory.slice(0, 80)
}

function publicUser(u, meId) {
  if (!u) return u
  if (u.id === meId) return u
  const { email: _e, ...rest } = u
  return rest
}

export function snapshot(db, meId) {
  expirePresence(db)
  syncLifetimePremium(db)
  const me = findUser(db, meId)
  const blockedBy = db.settings.filter((s) => (s.blockedIds ?? []).includes(meId)).map((s) => s.userId)
  const hidden = new Set(blockedBy)
  const staff = staffIdSet(db)
  const adminView = isStaff(me)
  const hide = (userId) => {
    if (!userId || userId === meId) return false
    if (hidden.has(userId)) return true
    if (!adminView && staff.has(userId)) return true
    const other = findUser(db, userId)
    if (!adminView && other && (other.banned || isSuspended(other))) return true
    return false
  }
  const present = (u) => {
    const row = adminView ? u : publicUser(u, meId)
    if (adminView) return row
    return {
      ...row,
      followers: (row.followers ?? []).filter((id) => !staff.has(id)),
      following: (row.following ?? []).filter((id) => !staff.has(id)),
    }
  }
  return {
    users: db.users.filter((u) => !hide(u.id)).map(present),
    posts: db.posts
      .filter((p) => !hide(p.userId))
      .map((p) => ({ ...p, comments: visibleComments(p.comments, meId, p.userId) })),
    stories: adminView
      ? db.stories
      : db.stories.filter((s) => s.expiresAt > Date.now() && !hide(s.userId)),
    reels: db.reels
      .filter((r) => !hide(r.userId))
      .map((r) => ({ ...r, comments: visibleComments(r.comments, meId, r.userId) })),
    conversations: adminView
      ? db.conversations
      : db.conversations.filter(
          (c) =>
            c.participantIds.includes(meId) &&
            !c.participantIds.some((id) => id !== meId && staff.has(id)),
        ),
    notifications: db.notifications.filter((n) => (!n.recipientId || n.recipientId === meId) && !hide(n.actorId)),
    settings: db.settings.filter((s) => s.userId === meId),
    blockedBy,
    meetups: db.meetups.filter((m) => !hide(m.creatorId)),
    meetupRequests: db.meetupRequests.filter((r) => !hide(r.userId) && !hide(r.creatorId)),
    swipes: db.swipes.filter((s) => (s.fromId === meId || s.toId === meId) && !hide(s.fromId) && !hide(s.toId)),
    matches: db.matches.filter((m) => m.userIds.includes(meId) && !m.userIds.some((id) => hide(id))),
    reposts: db.reposts.filter((r) => !hide(r.userId)),
    confessions: db.confessions,
    profileViews: db.profileViews.filter(
      (v) => (v.targetId === meId || v.viewerId === meId) && !hide(v.viewerId) && !hide(v.targetId),
    ),
    xpHistory: db.xpHistory.filter((x) => !x.userId || x.userId === meId || adminView),
    challengeStates: db.challengeStates,
    unlockedBadges: db.unlockedBadges[meId] ?? [],
    loginDays: db.loginDays[meId] ?? [],
    interactUsers: db.interactUsers[meId] ?? [],
    completedHere: Boolean(db.completedHere?.[meId]),
    hereSessions: (db.hereSessions ?? []).filter((s) => !hide(s.userId)),
    feedback: adminView ? db.feedback : db.feedback.filter((f) => f.userId === meId),
    userReports: adminView ? db.userReports ?? [] : [],
    searchHistory: { [meId]: db.searchHistory[meId] ?? [] },
    commentCount: db.commentCount,
    completedChallengeCount: db.completedChallengeCount,
    session: me ? { userId: me.id, username: me.username } : null,
    me: me ?? null,
  }
}

export function applySnapshotKeys(store) {
  return store
}

function toggleId(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

export function runAction(meId, name, body = {}) {
  const db = loadDb()
  expirePresence(db)
  syncLifetimePremium(db)
  const me = findUser(db, meId)
  if (!me) throw new Error('Oturum geçersiz')

  const actions = {
    'users.update'() {
      const patch = {}
      const originalUsername = me.username
      for (const key of ['name', 'bio', 'avatar', 'theme', 'gender', 'age', 'showInMeet']) {
        if (body[key] !== undefined) patch[key] = body[key]
      }
      if (body.meetPhotos !== undefined) {
        patch.meetPhotos = Array.isArray(body.meetPhotos)
          ? body.meetPhotos.filter((src) => typeof src === 'string' && src).slice(0, 3)
          : []
      }
      if (body.username !== undefined) {
        const username = handleize(body.username)
        if (RESERVED_HANDLES.has(username) && me.id !== ADMIN_ID) throw new Error('Bu kullanıcı adı alınmış')
        if (username.length < 3 || username.length > 16) throw new Error('Kullanıcı adı 3-16 karakter olmalı')
        if (
          db.users.some((u) => u.id !== meId && u.username === username) ||
          db.credentials.some((c) => c.username === username && c.username !== originalUsername)
        ) {
          throw new Error('Bu kullanıcı adı alınmış')
        }
        patch.username = username
      }
      if (body.email !== undefined) {
        const email = String(body.email).trim().toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Geçerli bir e-posta gir')
        if (
          db.users.some((u) => u.id !== meId && u.email === email) ||
          db.credentials.some((c) => c.email === email && c.username !== originalUsername)
        ) {
          throw new Error('Bu e-posta zaten kayıtlı')
        }
        patch.email = email
      }
      if (body.meetPhotosReady !== undefined) patch.meetPhotosReady = Boolean(body.meetPhotosReady)
      if (patch.age !== undefined && patch.age !== null && patch.age !== '') {
        const age = Math.trunc(Number(patch.age))
        if (!Number.isFinite(age) || age < MIN_AGE || age > 99) throw new Error(`Yaş ${MIN_AGE}–99 arasında olmalı`)
        patch.age = age
      }
      Object.assign(me, patch)
      const cred = db.credentials.find((c) => c.username === originalUsername)
      if (cred) {
        if (patch.username) cred.username = patch.username
        if (patch.email) cred.email = patch.email
      }
    },
    'users.follow'() {
      const target = findUser(db, body.targetId)
      if (!target || hiddenFrom(db, meId, target.id)) return
      followUser(db, me, target, Boolean(body.silent))
    },
    'users.unfollow'() {
      const target = findUser(db, body.targetId)
      if (!target) return
      me.following = me.following.filter((id) => id !== target.id)
      target.followers = target.followers.filter((id) => id !== meId)
    },
    'users.removeFollower'() {
      const other = findUser(db, body.followerId)
      if (!other) return
      other.following = other.following.filter((id) => id !== meId)
      me.followers = me.followers.filter((id) => id !== other.id)
    },
    'settings.update'() {
      upsertSettings(db, meId, body.patch ?? {})
      if (body.patch?.showInMeet !== undefined) me.showInMeet = body.patch.showInMeet
    },
    'settings.block'() {
      const s = settingsOf(db, meId)
      if (!s.blockedIds.includes(body.targetId)) s.blockedIds.push(body.targetId)
      upsertSettings(db, meId, { blockedIds: s.blockedIds })
      actions['users.unfollow']()
      const target = findUser(db, body.targetId)
      if (target) {
        target.following = target.following.filter((id) => id !== meId)
        me.followers = me.followers.filter((id) => id !== target.id)
      }
      db.matches = db.matches.filter(
        (m) => !(m.userIds.includes(meId) && m.userIds.includes(body.targetId)),
      )
    },
    'settings.unblock'() {
      const s = settingsOf(db, meId)
      upsertSettings(db, meId, { blockedIds: s.blockedIds.filter((id) => id !== body.targetId) })
    },
    'settings.mute'() {
      const s = settingsOf(db, meId)
      if (!s.mutedIds.includes(body.targetId)) s.mutedIds.push(body.targetId)
      upsertSettings(db, meId, { mutedIds: s.mutedIds })
    },
    'settings.unmute'() {
      const s = settingsOf(db, meId)
      upsertSettings(db, meId, { mutedIds: s.mutedIds.filter((id) => id !== body.targetId) })
    },
    'settings.report'() {
      db.userReports.unshift({
        id: uid('ur'),
        fromId: meId,
        targetId: body.targetId,
        reason: body.reason ?? '',
        createdAt: Date.now(),
      })
    },
    'posts.create'() {
      db.posts.unshift({
        id: body.id || uid('p'),
        userId: meId,
        image: body.image,
        caption: body.caption ?? '',
        likes: [],
        comments: [],
        saves: [],
        createdAt: body.createdAt ?? Date.now(),
        location: body.location,
        altText: body.altText,
        hideLikes: body.hideLikes,
        commentsOff: body.commentsOff,
        taggedIds: body.taggedIds,
        audience: body.audience,
      })
      addXp(db, meId, 10, 'Gönderi')
    },
    'posts.update'() {
      const post = db.posts.find((p) => p.id === body.postId)
      if (!post || post.userId !== meId) return
      const patch = body.patch ?? {}
      for (const key of [
        'caption',
        'location',
        'altText',
        'hideLikes',
        'commentsOff',
        'taggedIds',
        'audience',
        'archived',
        'pinnedAt',
      ]) {
        if (patch[key] !== undefined) post[key] = patch[key] === '' ? undefined : patch[key]
      }
    },
    'posts.remove'() {
      db.posts = db.posts.filter((p) => !(p.id === body.postId && p.userId === meId))
    },
    'posts.like'() {
      const post = db.posts.find((p) => p.id === body.postId)
      if (!post) return
      const liked = post.likes.includes(meId)
      post.likes = toggleId(post.likes, meId)
      if (!liked) {
        notify(db, {
          type: 'like',
          actorId: meId,
          recipientId: post.userId,
          text: 'gönderini beğendi',
          href: `/p/${post.id}`,
          image: post.image,
        })
      }
    },
    'posts.save'() {
      const post = db.posts.find((p) => p.id === body.postId)
      if (post) post.saves = toggleId(post.saves, meId)
    },
    'posts.comment'() {
      const post = db.posts.find((p) => p.id === body.postId)
      if (!post || (post.commentsOff && post.userId !== meId)) return
      const hidden = Boolean(body.hidden)
      post.comments.push({
        id: body.commentId || uid('c'),
        userId: meId,
        text: body.text,
        createdAt: Date.now(),
        hidden: hidden || undefined,
      })
      db.commentCount += 1
      addXp(db, meId, 5, 'Yorum')
      notify(db, {
        type: 'comment',
        actorId: meId,
        recipientId: post.userId,
        text: `yorum yaptı: ${String(body.text).slice(0, 80)}`,
        href: `/p/${post.id}`,
        image: post.image,
      })
    },
    'posts.approveComment'() {
      const post = db.posts.find((p) => p.id === body.postId)
      if (!post || post.userId !== meId) return
      const row = post.comments.find((c) => c.id === body.commentId)
      if (row) row.hidden = false
    },
    'posts.boost'() {
      const post = db.posts.find((p) => p.id === body.postId)
      if (!post || post.userId !== meId) throw new Error('Gönderi bulunamadı')
      if (body.off) {
        post.boostedUntil = null
        return
      }
      if (!isPremiumActive(me)) throw new Error('Öne çıkarmak için Premium gerekli')
      if (post.archived) throw new Error('Arşivdeki gönderi öne çıkarılamaz')
      clearBoosts(db, meId, { kind: 'post', id: post.id })
      post.boostedUntil = Date.now() + BOOST_DURATION_MS
    },
    'stories.create'() {
      const createdAt = Date.now()
      db.stories.unshift({
        id: body.id || uid('s'),
        userId: meId,
        image: body.image,
        createdAt,
        expiresAt: createdAt + 24 * 60 * 60 * 1000,
        viewedBy: [],
        likes: [],
        mentionedIds: body.mentionedIds ?? [],
      })
      addXp(db, meId, 15, 'Story')
    },
    'stories.view'() {
      const story = db.stories.find((s) => s.id === body.storyId)
      if (story && !story.viewedBy.includes(meId)) story.viewedBy.push(meId)
    },
    'stories.like'() {
      const story = db.stories.find((s) => s.id === body.storyId)
      if (!story) return
      const liked = story.likes.includes(meId)
      story.likes = toggleId(story.likes, meId)
      if (!liked) {
        notify(db, { type: 'like', actorId: meId, recipientId: story.userId, text: 'story’ni beğendi', href: `/u/${me.username}` })
      }
    },
    'stories.remove'() {
      db.stories = db.stories.filter((s) => !(s.id === body.storyId && s.userId === meId))
    },
    'reels.create'() {
      db.reels.unshift({
        id: body.id || uid('r'),
        userId: meId,
        videoUrl: body.videoUrl,
        caption: body.caption ?? '',
        music: body.music || 'Orijinal ses — Cadde 54',
        likes: [],
        comments: [],
        saves: [],
        createdAt: Date.now(),
      })
    },
    'reels.like'() {
      const reel = db.reels.find((r) => r.id === body.reelId)
      if (reel) reel.likes = toggleId(reel.likes, meId)
    },
    'reels.save'() {
      const reel = db.reels.find((r) => r.id === body.reelId)
      if (reel) reel.saves = toggleId(reel.saves, meId)
    },
    'reels.comment'() {
      const reel = db.reels.find((r) => r.id === body.reelId)
      if (!reel) return
      const hidden = Boolean(body.hidden)
      reel.comments.push({
        id: body.commentId || uid('c'),
        userId: meId,
        text: body.text,
        createdAt: Date.now(),
        hidden: hidden || undefined,
      })
    },
    'reels.approveComment'() {
      const reel = db.reels.find((r) => r.id === body.reelId)
      if (!reel || reel.userId !== meId) return
      const row = reel.comments.find((c) => c.id === body.commentId)
      if (row) row.hidden = false
    },
    'reels.boost'() {
      const reel = db.reels.find((r) => r.id === body.reelId)
      if (!reel || reel.userId !== meId) throw new Error('Reels bulunamadı')
      if (body.off) {
        reel.boostedUntil = null
        return
      }
      if (!isPremiumActive(me)) throw new Error('Öne çıkarmak için Premium gerekli')
      clearBoosts(db, meId, { kind: 'reel', id: reel.id })
      reel.boostedUntil = Date.now() + BOOST_DURATION_MS
    },
    'confessions.create'() {
      db.confessions.unshift({
        id: body.id || uid('cf'),
        content: body.content,
        likes: [],
        comments: [],
        reports: [],
        createdAt: Date.now(),
      })
    },
    'confessions.like'() {
      const row = db.confessions.find((c) => c.id === body.id)
      if (row) row.likes = toggleId(row.likes, meId)
    },
    'confessions.comment'() {
      const row = db.confessions.find((c) => c.id === body.id)
      if (!row) return
      row.comments.push({ id: body.commentId || uid('c'), userId: meId, text: body.text, createdAt: Date.now() })
    },
    'confessions.report'() {
      const row = db.confessions.find((c) => c.id === body.id)
      if (row && !row.reports.includes(meId)) row.reports.push(meId)
    },
    'messages.ensure'() {
      if (body.otherId && blocked(db, meId, body.otherId)) throw new Error('Bu kullanıcıyla mesajlaşamazsın')
      let conv = db.conversations.find(
        (c) => c.participantIds.includes(meId) && c.participantIds.includes(body.otherId),
      )
      if (!conv) {
        conv = {
          id: body.id || uid('cv'),
          participantIds: [meId, body.otherId],
          messages: [],
          updatedAt: Date.now(),
        }
        db.conversations.unshift(conv)
      }
      return conv
    },
    'messages.send'() {
      let conv = db.conversations.find((c) => c.id === body.conversationId)
      if (!conv) conv = actions['messages.ensure']()
      if (!conv.participantIds.includes(meId)) throw new Error('Bu sohbete yazamazsın')
      const other = conv.participantIds.find((id) => id !== meId)
      if (other && blocked(db, meId, other)) throw new Error('Bu kullanıcıyla mesajlaşamazsın')
      conv.messages.push({
        id: body.id || uid('m'),
        senderId: meId,
        text: body.text ?? '',
        image: body.image,
        video: body.video,
        share: body.share,
        replyTo: body.replyTo,
        reactions: [],
        createdAt: Date.now(),
      })
      conv.updatedAt = Date.now()
      delete conv.pendingRequestFor
      if (other) {
        notify(db, {
          type: 'message',
          actorId: meId,
          recipientId: other,
          text: 'sana bir mesaj gönderdi',
          href: `/messages/${conv.id}`,
          image: me.avatar,
        })
      }
    },
    'messages.system'() {
      const conv = db.conversations.find((c) => c.id === body.conversationId)
      if (!conv || !conv.participantIds.includes(meId)) return
      if (conv.messages.some((m) => m.system && m.text === body.text)) return
      conv.messages.push({
        id: uid('m'),
        senderId: 'system',
        text: body.text,
        system: true,
        createdAt: Date.now(),
      })
      conv.updatedAt = Date.now()
    },
    'messages.read'() {
      const conv = db.conversations.find((c) => c.id === body.conversationId)
      if (!conv || !conv.participantIds.includes(meId)) return
      const other = conv.participantIds.find((id) => id !== meId)
      if (other && blocked(db, meId, other)) return
      conv.lastRead = { ...(conv.lastRead ?? {}), [meId]: Date.now() }
    },
    'messages.removeConversations'() {
      const hide = new Set(body.ids ?? [])
      db.conversations = db.conversations.filter((c) => !hide.has(c.id) || !c.participantIds.includes(meId))
    },
    'messages.removeMessages'() {
      const conv = db.conversations.find((c) => c.id === body.conversationId)
      if (!conv) return
      const hide = new Set(body.messageIds ?? [])
      conv.messages = conv.messages.filter((m) => !hide.has(m.id) || m.senderId !== meId)
    },
    'messages.react'() {
      const conv = db.conversations.find((c) => c.id === body.conversationId)
      const msg = conv?.messages.find((m) => m.id === body.messageId)
      if (!msg || !conv.participantIds.includes(meId)) return
      const other = conv.participantIds.find((id) => id !== meId)
      if (other && blocked(db, meId, other)) return
      const reactions = msg.reactions ?? []
      const mine = reactions.find((r) => r.userId === meId)
      msg.reactions =
        mine?.emoji === body.emoji
          ? reactions.filter((r) => r.userId !== meId)
          : [...reactions.filter((r) => r.userId !== meId), { userId: meId, emoji: body.emoji }]
    },
    'notifications.push'() {
      notify(db, {
        type: body.type ?? 'xp',
        actorId: body.actorId,
        recipientId: body.recipientId,
        text: body.text,
        href: body.href,
        image: body.image,
      })
    },
    'notifications.readAll'() {
      for (const n of db.notifications) {
        if (!n.recipientId || n.recipientId === meId) n.read = true
      }
    },
    'notifications.remove'() {
      const ids = new Set(Array.isArray(body.ids) ? body.ids : [])
      if (!ids.size) return
      db.notifications = db.notifications.filter((n) => {
        if (!ids.has(n.id)) return true
        if (n.recipientId && n.recipientId !== meId) return true
        return false
      })
    },
    'reposts.toggle'() {
      const found = db.reposts.find((r) => r.userId === meId && r.kind === body.kind && r.targetId === body.targetId)
      if (found) db.reposts = db.reposts.filter((r) => r.id !== found.id)
      else {
        db.reposts.unshift({
          id: body.id || uid('rp'),
          userId: meId,
          kind: body.kind,
          targetId: body.targetId,
          createdAt: Date.now(),
        })
        if (body.authorId && body.authorId !== meId) {
          notify(db, {
            type: 'repost',
            actorId: meId,
            recipientId: body.authorId,
            text: body.kind === 'reel' ? 'reels’ini tekrar paylaştı' : 'gönderini tekrar paylaştı',
            href: `/u/${me.username}`,
          })
        }
      }
    },
    'meet.swipe'() {
      if (meId === body.toId || blocked(db, meId, body.toId)) return
      if (db.swipes.some((s) => s.fromId === meId && s.toId === body.toId)) return
      db.swipes.unshift({
        id: body.id || uid('sw'),
        fromId: meId,
        toId: body.toId,
        liked: Boolean(body.liked),
        createdAt: Date.now(),
      })
      if (!body.liked) return
      notify(db, {
        type: 'meet_like',
        recipientId: body.toId,
        text: 'Yeni bir beğeni! Birisi seni beğendi.',
        href: '/meet?tab=likes',
      })
      const mutual = db.swipes.some((s) => s.fromId === body.toId && s.toId === meId && s.liked)
      if (!mutual) return
      const other = findUser(db, body.toId)
      if (!other) return
      if (!db.matches.some((m) => m.userIds.includes(meId) && m.userIds.includes(body.toId))) {
        let conv = db.conversations.find(
          (c) => c.participantIds.includes(meId) && c.participantIds.includes(body.toId),
        )
        if (!conv) {
          conv = {
            id: uid('cv'),
            participantIds: [meId, body.toId],
            messages: [],
            updatedAt: Date.now(),
          }
          db.conversations.unshift(conv)
        }
        if (!conv.messages.some((m) => m.system)) {
          conv.messages.push({
            id: uid('m'),
            senderId: 'system',
            text: '🎉 Artık eşleştiniz!',
            system: true,
            createdAt: Date.now(),
          })
        }
        if (!me.following.includes(other.id)) me.following.push(other.id)
        if (!other.followers.includes(meId)) other.followers.push(meId)
        if (!other.following.includes(meId)) other.following.push(meId)
        if (!me.followers.includes(other.id)) me.followers.push(other.id)
        db.matches.unshift({
          id: uid('mt'),
          userIds: [meId, other.id],
          createdAt: Date.now(),
          conversationId: conv.id,
        })
      }
      notify(db, {
        type: 'match',
        actorId: other.id,
        recipientId: meId,
        text: 'ile eşleştiniz.',
        href: '/meet?tab=matches',
        image: other.avatar,
      })
      notify(db, {
        type: 'match',
        actorId: meId,
        recipientId: other.id,
        text: 'ile eşleştiniz.',
        href: '/meet?tab=matches',
        image: me.avatar,
      })
    },
    'meet.resetPasses'() {
      db.swipes = db.swipes.filter((s) => !(s.fromId === meId && !s.liked))
    },
    'meet.unmatch'() {
      db.matches = db.matches.filter(
        (m) => !(m.userIds.includes(meId) && m.userIds.includes(body.otherId)),
      )
      const mine = settingsOf(db, meId)
      if (mine.unmatchRemovesFollow) {
        const other = findUser(db, body.otherId)
        if (other) {
          me.following = me.following.filter((id) => id !== other.id)
          other.followers = other.followers.filter((id) => id !== meId)
        }
      }
    },
    'meet.undo'() {
      const last = db.swipes.find((s) => s.fromId === meId && (!body.swipeId || s.id === body.swipeId))
      if (!last) return
      db.swipes = db.swipes.filter((s) => s.id !== last.id)
      if (last.liked) {
        db.matches = db.matches.filter((m) => {
          if (!(m.userIds.includes(meId) && m.userIds.includes(last.toId))) return true
          return Math.abs((m.createdAt ?? 0) - last.createdAt) >= 8_000
        })
      }
    },
    'meetups.create'() {
      db.meetups.unshift({
        id: body.id || uid('mt'),
        creatorId: meId,
        title: String(body.title ?? '').trim(),
        description: String(body.description ?? '').trim(),
        locationName: String(body.locationName ?? '').trim(),
        date: body.date,
        time: body.time,
        currentParticipants: Number(body.currentParticipants) || 1,
        targetParticipants: Number(body.targetParticipants) || 1,
        participantPreference: body.participantPreference,
        participants: [meId],
        status: 'open',
        createdAt: new Date().toISOString(),
      })
    },
    'meetups.update'() {
      const m = db.meetups.find((x) => x.id === body.id && x.creatorId === meId)
      if (!m) throw new Error('Buluşma bulunamadı')
      Object.assign(m, {
        title: body.title ?? m.title,
        description: body.description ?? m.description,
        locationName: body.locationName ?? m.locationName,
        date: body.date ?? m.date,
        time: body.time ?? m.time,
        currentParticipants: body.currentParticipants ?? m.currentParticipants,
        targetParticipants: body.targetParticipants ?? m.targetParticipants,
        participantPreference: body.participantPreference ?? m.participantPreference,
      })
    },
    'meetups.delete'() {
      db.meetups = db.meetups.filter((m) => !(m.id === body.id && m.creatorId === meId))
      db.meetupRequests = db.meetupRequests.filter((r) => r.meetupId !== body.id)
    },
    'meetups.cancel'() {
      const m = db.meetups.find((x) => x.id === body.id && x.creatorId === meId)
      if (!m) throw new Error('Buluşma bulunamadı')
      m.status = 'cancelled'
      for (const pid of m.participants) {
        if (pid === meId) continue
        notify(db, { type: 'meetup', actorId: meId, recipientId: pid, text: `“${m.title}” buluşması iptal edildi.`, href: `/meetups/${m.id}` })
      }
    },
    'meetups.request'() {
      const m = db.meetups.find((x) => x.id === body.meetupId)
      if (!m) throw new Error('Buluşma bulunamadı')
      if (m.creatorId === meId) throw new Error('Kendi buluşmana başvuramazsın.')
      if (m.status === 'cancelled' || m.status === 'full') throw new Error('Bu buluşmaya başvuramazsın.')
      if (db.meetupRequests.some((r) => r.meetupId === m.id && r.userId === meId)) {
        throw new Error('Bu buluşmaya zaten başvurdun.')
      }
      const pref = m.participantPreference
      if (pref !== 'any' && me.gender !== pref) {
        throw new Error(pref === 'female' ? 'Bu buluşma yalnızca kız kullanıcıların katılımına açıktır.' : 'Bu buluşma yalnızca erkek kullanıcıların katılımına açıktır.')
      }
      db.meetupRequests.unshift({
        id: body.id || uid('mr'),
        meetupId: m.id,
        userId: meId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
      notify(db, {
        type: 'meetup',
        actorId: meId,
        recipientId: m.creatorId,
        text: `👋 Yeni katılma isteği\n${me.name}, “${m.title}” buluşmana katılmak istiyor.`,
        href: `/meetups/${m.id}`,
        image: me.avatar,
      })
    },
    'meetups.cancelRequest'() {
      db.meetupRequests = db.meetupRequests.filter(
        (r) => !(r.meetupId === body.meetupId && r.userId === meId && r.status === 'pending'),
      )
    },
    'meetups.accept'() {
      const row = db.meetupRequests.find((r) => r.id === body.requestId)
      const m = row ? db.meetups.find((x) => x.id === row.meetupId) : undefined
      if (!row || !m || m.creatorId !== meId) throw new Error('İstek bulunamadı')
      row.status = 'accepted'
      row.updatedAt = new Date().toISOString()
      if (!m.participants.includes(row.userId)) m.participants.push(row.userId)
      const filled = m.currentParticipants + m.participants.filter((id) => id !== m.creatorId).length
      if (filled >= m.currentParticipants + m.targetParticipants) m.status = 'full'
      notify(db, {
        type: 'meetup',
        actorId: meId,
        recipientId: row.userId,
        text: `🎉 Katılımın kabul edildi!\n“${m.title}” buluşmasına katılacaksın.`,
        href: `/meetups/${m.id}`,
      })
      if (m.status === 'full') {
        notify(db, { type: 'meetup', recipientId: meId, text: `🎉 Buluşman tamamen doldu!\n“${m.title}”`, href: `/meetups/${m.id}` })
      }
    },
    'meetups.reject'() {
      const row = db.meetupRequests.find((r) => r.id === body.requestId)
      const m = row ? db.meetups.find((x) => x.id === row.meetupId) : undefined
      if (!row || !m || m.creatorId !== meId) throw new Error('İstek bulunamadı')
      row.status = 'rejected'
      row.updatedAt = new Date().toISOString()
      notify(db, { type: 'meetup', actorId: meId, recipientId: row.userId, text: 'Buluşma isteğin kabul edilmedi.', href: `/meetups/${m.id}` })
    },
    'meetups.removeParticipant'() {
      const m = db.meetups.find((x) => x.id === body.meetupId && x.creatorId === meId)
      if (!m) throw new Error('Buluşma bulunamadı')
      m.participants = m.participants.filter((id) => id !== body.userId)
      if (m.status === 'full') m.status = 'open'
      notify(db, { type: 'meetup', actorId: meId, recipientId: body.userId, text: `“${m.title}” buluşmasından çıkarıldın.`, href: `/meetups/${m.id}` })
    },
    'premium.activate'() {
      throw new Error('Yetkisiz')
    },
    'premium.grant'() {
      requireAdmin(me)
      const target =
        findUser(db, body.targetId) || findByHandle(db, body.username)
      if (!target || isStaff(target)) throw new Error('Kullanıcı bulunamadı')
      if (isLifetimePremiumUser(target)) {
        grantLifetimePremium(target)
        return
      }
      const months = Math.max(1, Math.min(12, Number(body.months) || 1))
      target.isPremium = true
      target.premiumPlan = 'month'
      target.premiumUntil = Date.now() + months * 30 * 86_400_000
    },
    'premium.revoke'() {
      requireAdmin(me)
      const target = findUser(db, body.targetId) || findByHandle(db, body.username)
      if (!target) throw new Error('Kullanıcı bulunamadı')
      if (isLifetimePremiumUser(target)) throw new Error('Bu hesap süresiz premium')
      target.isPremium = false
      target.premiumPlan = undefined
      target.premiumUntil = null
    },
    'admin.ban'() {
      requireAdmin(me)
      const target = adminTarget(db, body)
      const on = body.banned !== false
      target.banned = on
      target.banReason = on ? String(body.reason ?? '').trim() || undefined : undefined
      if (on) {
        target.suspended = false
        target.suspendedUntil = null
        target.suspendReason = undefined
        dropSessions(db, target.id)
      }
    },
    'admin.suspend'() {
      requireAdmin(me)
      const target = adminTarget(db, body)
      const days = Number(body.days)
      target.banned = false
      target.banReason = undefined
      target.suspended = true
      target.suspendReason = String(body.reason ?? '').trim() || undefined
      target.suspendedUntil = Number.isFinite(days) && days > 0 ? Date.now() + days * 86_400_000 : null
      dropSessions(db, target.id)
    },
    'admin.unsuspend'() {
      requireAdmin(me)
      const target = adminTarget(db, body)
      target.suspended = false
      target.suspendedUntil = null
      target.suspendReason = undefined
    },
    'admin.addXp'() {
      requireAdmin(me)
      const target = adminTarget(db, body)
      const amount = Math.trunc(Number(body.amount))
      if (!Number.isFinite(amount) || amount === 0) throw new Error('Geçerli bir XP gir')
      target.xp = Math.max(0, (target.xp ?? 0) + amount)
      db.xpHistory.unshift({
        id: uid('xp'),
        userId: target.id,
        amount,
        reason: body.reason || (amount > 0 ? 'Yönetim XP ekledi' : 'Yönetim XP düşürdü'),
        createdAt: Date.now(),
      })
    },
    'admin.warn'() {
      requireAdmin(me)
      const target = adminTarget(db, body)
      const note = String(body.text ?? '').trim()
      const text = note ? `Admin tarafından uyarı: ${note}` : 'Admin tarafından uyarı'
      notify(db, { type: 'xp', recipientId: target.id, text, href: '/settings' })
    },
    'admin.setPassword'() {
      requireAdmin(me)
      const target = adminTarget(db, body)
      const next = String(body.password ?? '')
      if (next.length < 6) throw new Error('Şifre en az 6 karakter olmalı')
      const cred = db.credentials.find((c) => c.username === target.username)
      if (!cred) throw new Error('Hesap bulunamadı')
      cred.password = hashPassword(next)
      dropSessions(db, target.id)
    },
    'admin.kickHere'() {
      requireAdmin(me)
      const target = adminTarget(db, body)
      target.hereUntil = null
      target.hereLeftAt = Date.now()
      target.hereDemo = false
      closeHereSession(db, target.id)
    },
    'admin.clearContent'() {
      requireAdmin(me)
      const target = adminTarget(db, body)
      purgeUserContent(db, target.id)
    },
    'admin.deleteUser'() {
      requireAdmin(me)
      const target = adminTarget(db, body)
      if (isLifetimePremiumUser(target)) throw new Error('Bu hesap silinemez')
      purgeUser(db, target.id)
    },
    'admin.announce'() {
      requireAdmin(me)
      const text = String(body.text ?? '').trim()
      if (text.length < 3) throw new Error('Duyuru çok kısa')
      for (const u of db.users) {
        if (isStaff(u) || u.banned || isSuspended(u)) continue
        notify(db, { type: 'xp', recipientId: u.id, text, href: '/' })
      }
    },
    'admin.deletePost'() {
      requireAdmin(me)
      const before = db.posts.length
      db.posts = db.posts.filter((p) => p.id !== body.id)
      if (db.posts.length === before) throw new Error('Gönderi bulunamadı')
    },
    'admin.deleteReel'() {
      requireAdmin(me)
      const before = db.reels.length
      db.reels = db.reels.filter((r) => r.id !== body.id)
      if (db.reels.length === before) throw new Error('Reels bulunamadı')
    },
    'admin.deleteStory'() {
      requireAdmin(me)
      const before = db.stories.length
      db.stories = db.stories.filter((s) => s.id !== body.id)
      if (db.stories.length === before) throw new Error('Hikâye bulunamadı')
    },
    'admin.deleteMeetup'() {
      requireAdmin(me)
      const before = db.meetups.length
      db.meetups = db.meetups.filter((m) => m.id !== body.id)
      db.meetupRequests = (db.meetupRequests ?? []).filter((r) => r.meetupId !== body.id)
      if (db.meetups.length === before) throw new Error('Buluşma bulunamadı')
    },
    'admin.deleteConversation'() {
      requireAdmin(me)
      const before = db.conversations.length
      db.conversations = db.conversations.filter((c) => c.id !== body.id)
      if (db.conversations.length === before) throw new Error('Sohbet bulunamadı')
    },
    'admin.deleteConfession'() {
      requireAdmin(me)
      const before = db.confessions.length
      db.confessions = db.confessions.filter((c) => c.id !== body.id)
      if (db.confessions.length === before) throw new Error('İtiraf bulunamadı')
    },
    'admin.deleteFeedback'() {
      requireAdmin(me)
      db.feedback = (db.feedback ?? []).filter((f) => f.id !== body.id)
    },
    'admin.resolveReport'() {
      requireAdmin(me)
      db.userReports = (db.userReports ?? []).filter((r) => r.id !== body.id)
    },
    'presence.check'() {
      const lat = Number(body.lat)
      const lng = Number(body.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('Konum gerekli')
      const distance = haversineMeters({ lat, lng }, CADDE54_CENTER)
      if (distance > CADDE54_RADIUS_M) throw new Error('Cadde 54 alanının dışındasın')
      const wasHere = me.hereUntil && me.hereUntil > Date.now()
      const wasLeft = me.hereLeftAt && Date.now() - me.hereLeftAt < 11 * 60 * 1000
      me.hereUntil = Date.now() + 24 * 60 * 60 * 1000
      me.hereLeftAt = null
      me.hereDemo = false
      db.completedHere = db.completedHere || {}
      db.completedHere[meId] = true
      if (!wasHere) startHereSession(db, meId)
      if (!wasHere && !wasLeft) addXp(db, meId, 20, 'Buradayım')
    },
    'presence.leave'() {
      if (!me.hereUntil || me.hereUntil <= Date.now()) return
      me.hereUntil = null
      me.hereLeftAt = Date.now()
      me.hereDemo = false
      closeHereSession(db, meId)
    },
    'progress.save'() {
      if (body.xp != null) me.xp = Number(body.xp) || 0
      if (Array.isArray(body.xpHistory)) {
        const mine = body.xpHistory.map((e) => ({ ...e, userId: meId }))
        db.xpHistory = [...mine, ...db.xpHistory.filter((e) => e.userId !== meId)].slice(0, 80)
      }
      if (Array.isArray(body.challengeStates)) db.challengeStates = body.challengeStates
      if (Array.isArray(body.loginDays)) db.loginDays[meId] = body.loginDays
      if (Array.isArray(body.interactUsers)) db.interactUsers[meId] = body.interactUsers
      if (Array.isArray(body.unlockedBadges)) db.unlockedBadges[meId] = body.unlockedBadges
      if (body.completedChallengeCount != null) db.completedChallengeCount = Number(body.completedChallengeCount) || 0
      if (body.commentCount != null) db.commentCount = Number(body.commentCount) || 0
    },
    'views.record'() {
      if (body.targetId === meId) return
      if (hiddenFrom(db, meId, body.targetId)) return
      const s = settingsOf(db, meId)
      if (me.isPremium && s.ghostMode) return
      db.profileViews.unshift({
        id: body.id || uid('pv'),
        viewerId: meId,
        targetId: body.targetId,
        createdAt: Date.now(),
      })
      db.profileViews = db.profileViews.slice(0, 80)
    },
    'feedback.add'() {
      db.feedback.unshift({
        id: body.id || uid('fb'),
        userId: meId,
        type: body.type,
        title: body.title,
        message: body.message,
        createdAt: Date.now(),
      })
    },
    'search.add'() {
      const list = db.searchHistory[meId] ?? []
      db.searchHistory[meId] = [body.userId, ...list.filter((id) => id !== body.userId)].slice(0, 20)
    },
    'search.remove'() {
      db.searchHistory[meId] = (db.searchHistory[meId] ?? []).filter((id) => id !== body.userId)
    },
    'auth.changePassword'() {
      const row = db.credentials.find((c) => c.username === me.username)
      if (!row || !verifyPassword(body.current, row.password)) throw new Error('Mevcut şifre hatalı')
      if (String(body.next).length < 6) throw new Error('Yeni şifre en az 6 karakter olmalı')
      row.password = hashPassword(body.next)
    },
  }

  const fn = actions[name]
  if (!fn) throw new Error('Bilinmeyen işlem')
  fn()
  saveDb(db)
  return snapshot(db, meId)
}

export function loginUser(username, password) {
  const db = loadDb()
  const handle = handleize(username)
  const entry = db.credentials.find(
    (c) => c.username === handle || c.email.toLowerCase() === String(username).trim().toLowerCase(),
  )
  if (!entry || !verifyPassword(password, entry.password)) throw new Error('Kullanıcı adı veya şifre hatalı')
  if (!isHashed(entry.password)) {
    entry.password = hashPassword(password)
  }
  const user = db.users.find((u) => u.username === entry.username)
  if (!user) throw new Error('Hesap bulunamadı')
  const blocked = accountBlockReason(user)
  if (blocked) throw new Error(blocked)
  syncLifetimePremium(db)
  const tok = token()
  db.sessions = db.sessions.filter((s) => s.userId !== user.id)
  db.sessions.push({ token: tok, userId: user.id, createdAt: Date.now() })
  saveDb(db)
  return { token: tok, user, snapshot: snapshot(db, user.id) }
}

export function registerUser(input) {
  const db = loadDb()
  const username = handleize(input.username)
  const email = String(input.email ?? '').trim().toLowerCase()
  if (username.length < 3) throw new Error('Kullanıcı adı 3-16 karakter, harf/rakam olmalı')
  if (RESERVED_HANDLES.has(username)) throw new Error('Bu kullanıcı adı alınmış')
  if (db.users.some((u) => u.username === username) || db.credentials.some((c) => c.username === username)) {
    throw new Error('Bu kullanıcı adı alınmış')
  }
  if (db.users.some((u) => u.email === email) || db.credentials.some((c) => c.email === email)) {
    throw new Error('Bu e-posta zaten kayıtlı')
  }
  if (!input.gender) throw new Error('Cinsiyet seçmelisin')
  if (String(input.password ?? '').length < 6) throw new Error('Şifre en az 6 karakter olmalı')
  const user = {
    id: uid('u'),
    name: String(input.name ?? '').trim(),
    username,
    email,
    avatar: `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(username)}&backgroundColor=1c1c28`,
    bio: 'Cadde 54’e yeni katıldım.',
    xp: 0,
    followers: [],
    following: [],
    isPremium: false,
    hereUntil: null,
    hereLeftAt: null,
    theme: 'default',
    gender: input.gender,
    createdAt: Date.now(),
  }
  db.users.push(user)
  db.credentials.push({ username, email, password: hashPassword(input.password) })
  if (isLifetimePremiumUser(user)) grantLifetimePremium(user)
  if (username !== STARTER_FOLLOW) {
    followUser(db, user, findByHandle(db, STARTER_FOLLOW), true)
  }
  const tok = token()
  db.sessions.push({ token: tok, userId: user.id, createdAt: Date.now() })
  saveDb(db)
  return { token: tok, user, snapshot: snapshot(db, user.id) }
}

export function userFromToken(tok) {
  if (!tok) return null
  const db = loadDb()
  const session = db.sessions.find((s) => s.token === tok)
  if (!session) return null
  const user = findUser(db, session.userId)
  if (!user) return null
  if (!isStaff(user) && accountBlockReason(user)) {
    dropSessions(db, user.id)
    saveDb(db)
    return null
  }
  return user
}

export function logoutToken(tok) {
  const db = loadDb()
  db.sessions = db.sessions.filter((s) => s.token !== tok)
  saveDb(db)
}

export function resetPassword(email, password) {
  const db = loadDb()
  const entry = db.credentials.find((c) => c.email === email)
  if (!entry) throw new Error('Hesap bulunamadı')
  if (String(password).length < 6) throw new Error('Şifre en az 6 karakter olmalı')
  entry.password = hashPassword(password)
  saveDb(db)
}

export { handleize, blocked }
