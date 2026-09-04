const hits = new Map()

export function rateLimit(key, max, windowMs) {
  const now = Date.now()
  const row = hits.get(key)
  if (!row || now - row.start > windowMs) {
    hits.set(key, { start: now, count: 1 })
    return true
  }
  row.count += 1
  return row.count <= max
}

export function clientKey(req, name) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'ip').split(',')[0].trim()
  return `${name}:${ip}`
}
