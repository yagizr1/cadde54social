import { loadDb, saveDb } from './db.mjs'
import { hashPassword, isHashed } from './password.mjs'

const ADMIN = 'u_admin'

export function seedIfEmpty() {
  const db = loadDb()
  let changed = false

  const admin = db.users.find((u) => u.id === ADMIN || u.username === 'admin')
  if (admin) {
    if (admin.role !== 'admin') {
      admin.role = 'admin'
      changed = true
    }
    if (admin.showInMeet !== false) {
      admin.showInMeet = false
      changed = true
    }
  }

  for (const c of db.credentials ?? []) {
    if (c.password && !isHashed(c.password)) {
      c.password = hashPassword(c.password)
      changed = true
    }
  }

  if (changed) saveDb(db)
  return db
}
