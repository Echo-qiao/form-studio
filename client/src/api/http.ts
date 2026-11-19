const TOKEN_KEY = 'form_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t)
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

type Options = { method?: string; body?: unknown; query?: Record<string, string | number | undefined> }

export async function request<T>(path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let url = path
  if (options.query) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== '') params.set(k, String(v))
    }
    const qs = params.toString()
    if (qs) url += `?${qs}`
  }

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (res.status === 401 && !path.startsWith('/api/f/')) {
    clearToken()
    if (location.pathname !== '/login') location.href = '/login'
    throw new HttpError(401, '登录已过期')
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new HttpError(res.status, (data.message as string) ?? `请求失败（${res.status}）`)
  return data as T
}