import { getItem, setItem } from './storage'
import { sync } from './syncService'

const KEY = 'searchHistory'
const LIMIT = 20

function all(): Record<string, string[]> {
  return getItem<Record<string, string[]>>(KEY, {})
}

export const searchHistoryService = {
  list(meId: string): string[] {
    return all()[meId] ?? []
  },

  add(meId: string, userId: string): void {
    if (!userId || userId === meId) return
    const map = all()
    const next = [userId, ...(map[meId] ?? []).filter((id) => id !== userId)].slice(0, LIMIT)
    map[meId] = next
    setItem(KEY, map)
    sync('search.add', { userId })
  },

  remove(meId: string, userId: string): void {
    const map = all()
    map[meId] = (map[meId] ?? []).filter((id) => id !== userId)
    setItem(KEY, map)
    sync('search.remove', { userId })
  },
}
