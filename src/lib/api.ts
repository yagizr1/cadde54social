const TOKEN_KEY = 'c54_live_token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

type ApiInit = Omit<RequestInit, 'body'> & { body?: unknown }

export async function api<T = Record<string, unknown>>(path: string, init: ApiInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let body = init.body
  if (body && !(body instanceof FormData) && typeof body !== 'string') {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(body)
  }
  const res = await fetch(path, { ...init, headers, body: body as BodyInit | undefined })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; ok?: boolean }
  if (!res.ok) throw new Error(data.error || 'İstek başarısız')
  return data
}
