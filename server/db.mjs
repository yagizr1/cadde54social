import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = join(root, 'data')
export const UPLOAD_DIR = join(root, 'uploads')
const DB_PATH = join(DATA_DIR, 'app.json')

const empty = () => ({
  users: [],
  credentials: [],
  sessions: [],
  posts: [],
  stories: [],
  reels: [],
  conversations: [],
  notifications: [],
  settings: [],
  meetups: [],
  meetupRequests: [],
  swipes: [],
  matches: [],
  reposts: [],
  confessions: [],
  profileViews: [],
  xpHistory: [],
  challengeStates: [],
  unlockedBadges: {},
  loginDays: {},
  interactUsers: {},
  feedback: [],
  userReports: [],
  searchHistory: {},
  completedHere: {},
  hereSessions: [],
  commentCount: 0,
  completedChallengeCount: 0,
})

function ensureDirs() {
  mkdirSync(DATA_DIR, { recursive: true })
  mkdirSync(UPLOAD_DIR, { recursive: true })
}

export function loadDb() {
  ensureDirs()
  if (!existsSync(DB_PATH)) return empty()
  try {
    return { ...empty(), ...JSON.parse(readFileSync(DB_PATH, 'utf8')) }
  } catch {
    return empty()
  }
}

export function saveDb(db) {
  ensureDirs()
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8')
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

export function token() {
  return uid('tok')
}
