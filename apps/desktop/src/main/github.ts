import type { Account, ApiRequest, ApiResponse } from '#shared/ipc'

const API = 'https://api.github.com'
const ACCEPT = /^application\/vnd\.github(\.[a-z-]+)?\+json$/
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

export type Fetch = typeof fetch

// The same rules as the extension's service worker: only api.github.com, only GitHub's own media types.
export async function apiRequest(
  token: string | undefined,
  msg: ApiRequest,
  fetcher: Fetch = (input, init) => fetch(input, init),
): Promise<ApiResponse> {
  if (!token) return { ok: false, status: 401, data: { message: 'Sign in to GitHub first.' } }
  let url: URL
  try {
    url = new URL(msg.path, API)
  } catch {
    return { ok: false, status: 400, data: { message: 'Invalid API path.' } }
  }
  if (url.origin !== API) return { ok: false, status: 400, data: { message: 'Invalid API path.' } }
  const method = (msg.method ?? 'GET').toUpperCase()
  if (!METHODS.has(method)) return { ok: false, status: 400, data: { message: 'Invalid method.' } }
  try {
    const res = await fetcher(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: msg.accept && ACCEPT.test(msg.accept) ? msg.accept : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(msg.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: msg.body ? JSON.stringify(msg.body) : undefined,
    })
    const data = await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, data }
  } catch (e) {
    return { ok: false, status: 0, data: { message: e instanceof Error ? e.message : String(e) } }
  }
}

export interface Verified {
  account: Account
  scopes: string[] | null
}

export class TokenRejected extends Error {}

export async function verifyToken(token: string, fetcher: Fetch = fetch): Promise<Verified> {
  let res: Response
  try {
    res = await fetcher(`${API}/user`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    })
  } catch (e) {
    throw new Error(`Could not reach GitHub: ${e instanceof Error ? e.message : String(e)}`, { cause: e })
  }
  if (res.status === 401) throw new TokenRejected('GitHub didn’t accept this token.')
  if (!res.ok) throw new Error(`GitHub answered ${res.status}.`)
  const user = (await res.json()) as { login: string; name?: string | null; avatar_url?: string }
  // Fine-grained tokens send no scopes header; classic and OAuth tokens list theirs.
  const header = res.headers.get('x-oauth-scopes')
  const scopes =
    header === null
      ? null
      : header
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
  return { account: { login: user.login, name: user.name ?? undefined, avatarUrl: user.avatar_url }, scopes }
}

export function scopeWarning(scopes: string[] | null): string | undefined {
  if (scopes === null || scopes.includes('repo')) return undefined
  return 'This token has no repo scope, so approving, commenting and merging on private repositories will fail.'
}
