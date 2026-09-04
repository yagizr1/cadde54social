export const APP_NAME = 'Cadde54 Social'
export const STORAGE_PREFIX = 'c54_live_'
export const TR_TIMEZONE = 'Europe/Istanbul'

export const CADDE54_CENTER = { lat: 40.9818, lng: 29.0574 }
export const CADDE54_RADIUS_M = 450
export const HERE_DURATION_MS = 24 * 60 * 60 * 1000
export const HERE_LEFT_MS = 11 * 60 * 1000
export const STORY_TTL_MS = 24 * 60 * 60 * 1000

export const ADMIN_ID = 'u_admin'
export const MIN_AGE = 16

export const LEVEL_THRESHOLDS: number[] = (() => {
  const levels = [0]
  let threshold = 0
  let step = 200
  for (let i = 0; i < 40; i += 1) {
    threshold += step
    step += 50
    levels.push(threshold)
  }
  return levels
})()

export const DEMO_SONG_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
]
