/** @typedef {{ write: (chunk: string) => void }} LiveClient */

/** @type {Map<string, Set<LiveClient>>} */
const clients = new Map()

/** @type {Map<string, number>} */
const typingUntil = new Map()

function typingKey(conversationId, userId) {
  return `${conversationId}:${userId}`
}

export function subscribe(userId, client) {
  let set = clients.get(userId)
  if (!set) {
    set = new Set()
    clients.set(userId, set)
  }
  set.add(client)
  return () => {
    set.delete(client)
    if (set.size === 0) clients.delete(userId)
  }
}

export function emitTo(userId, event) {
  const set = clients.get(userId)
  if (!set || !set.size) return
  const payload = `data: ${JSON.stringify(event)}\n\n`
  for (const client of set) {
    try {
      client.write(payload)
    } catch {
      set.delete(client)
    }
  }
}

export function emitToUsers(userIds, event) {
  for (const id of userIds) {
    if (id) emitTo(id, event)
  }
}

export function setTyping(conversationId, userId, on) {
  const key = typingKey(conversationId, userId)
  if (on) typingUntil.set(key, Date.now() + 3500)
  else typingUntil.delete(key)
}

export function typingFor(userId, conversations) {
  const now = Date.now()
  const out = []
  for (const [key, until] of typingUntil) {
    if (until <= now) {
      typingUntil.delete(key)
      continue
    }
    const sep = key.indexOf(':')
    const conversationId = key.slice(0, sep)
    const fromId = key.slice(sep + 1)
    if (fromId === userId) continue
    const conv = conversations.find((c) => c.id === conversationId)
    if (!conv?.participantIds.includes(userId)) continue
    out.push({ conversationId, userId: fromId, until })
  }
  return out
}
