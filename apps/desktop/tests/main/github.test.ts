import { describe, expect, it, vi } from 'vitest'
import { apiRequest, scopeWarning, TokenRejected, verifyToken, type Fetch } from '../../src/main/github'

const ok = (data: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(data), { status: 200, headers })

describe('apiRequest', () => {
  it('refuses without a token', async () => {
    expect(await apiRequest(undefined, { type: 'gh', path: '/user' })).toMatchObject({ ok: false, status: 401 })
  })

  it('only talks to api.github.com', async () => {
    const fetcher = vi.fn<Fetch>()
    const res = await apiRequest('t', { type: 'gh', path: 'https://evil.example/steal' }, fetcher)
    expect(res).toMatchObject({ ok: false, status: 400 })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('sends the token and keeps only GitHub media types', async () => {
    const fetcher = vi.fn<Fetch>(async () => ok({ id: 1 }))
    await apiRequest('secret', { type: 'gh', path: '/repos/a/b/pulls/1', accept: 'text/html' }, fetcher)
    const [url, init] = fetcher.mock.calls[0]!
    expect(String(url)).toBe('https://api.github.com/repos/a/b/pulls/1')
    const headers = init!.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer secret')
    expect(headers.Accept).toBe('application/vnd.github+json')
  })

  it('passes a JSON body through', async () => {
    const fetcher = vi.fn<Fetch>(async () => ok({}))
    await apiRequest('t', { type: 'gh', path: '/x', method: 'post', body: { event: 'APPROVE' } }, fetcher)
    expect(fetcher.mock.calls[0]![1]).toMatchObject({ method: 'POST', body: '{"event":"APPROVE"}' })
  })

  it('turns a network failure into a reply', async () => {
    const res = await apiRequest('t', { type: 'gh', path: '/user' }, async () => {
      throw new Error('offline')
    })
    expect(res).toMatchObject({ ok: false, status: 0, data: { message: 'offline' } })
  })
})

describe('verifyToken', () => {
  it('reads the account and scopes', async () => {
    const v = await verifyToken('t', async () =>
      ok({ login: 'octo', name: 'Octo', avatar_url: 'a' }, { 'x-oauth-scopes': 'repo, read:org' }),
    )
    expect(v).toEqual({ account: { login: 'octo', name: 'Octo', avatarUrl: 'a' }, scopes: ['repo', 'read:org'] })
  })

  it('treats a missing scopes header as a fine-grained token', async () => {
    expect((await verifyToken('t', async () => ok({ login: 'octo' }))).scopes).toBeNull()
  })

  it('rejects a token GitHub refuses', async () => {
    await expect(verifyToken('t', async () => new Response('{}', { status: 401 }))).rejects.toBeInstanceOf(TokenRejected)
  })
})

describe('scopeWarning', () => {
  it('warns only for classic tokens without repo', () => {
    expect(scopeWarning(['repo'])).toBeUndefined()
    expect(scopeWarning(null)).toBeUndefined()
    expect(scopeWarning(['read:user'])).toMatch(/repo scope/)
  })
})
