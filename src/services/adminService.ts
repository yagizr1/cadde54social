import { api } from '../lib/api'
import { applySnapshot, type AppSnapshot } from './syncService'
import type { User } from '../types'

export const adminService = {
  async act(name: string, body: Record<string, unknown> = {}): Promise<User | null> {
    const data = await api<{ snapshot?: AppSnapshot; me?: User }>(`/api/actions/${encodeURIComponent(name)}`, {
      method: 'POST',
      body,
    })
    if (data.snapshot) applySnapshot(data.snapshot)
    return data.me ?? data.snapshot?.me ?? null
  },
}
