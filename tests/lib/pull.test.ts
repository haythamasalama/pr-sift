import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchSignature, loadPr } from '../../src/lib/pull'
import { installChrome } from '../helpers/chrome'
import { PR, SAMPLE_DIFF } from '../helpers/fixtures'

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => handler(String(url))),
  )
}

const pageHtml = '<html><body><h1 class="js-issue-title">  Add shipment parsing  </h1></body></html>'

describe('loadPr', () => {
  beforeEach(() => {
    installChrome()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('reads the diff and title with the signed-in session', async () => {
    mockFetch((url) => (url.endsWith('.diff') ? new Response(SAMPLE_DIFF) : new Response(pageHtml)))
    const result = await loadPr(PR)
    expect(result.via).toBe('session')
    expect(result.info.title).toBe('Add shipment parsing')
    expect(result.files).toHaveLength(5)
    expect(result.signature).toBeTruthy()
  })

  it('falls back to the background worker when the page fetch is blocked', async () => {
    installChrome((message) =>
      message.type === 'text' ? { ok: true, status: 200, url: 'u', text: SAMPLE_DIFF } : { ok: false, status: 401, data: {} },
    )
    mockFetch((url) => {
      if (url.endsWith('.diff')) throw new TypeError('Failed to fetch')
      return new Response(pageHtml)
    })
    const result = await loadPr(PR)
    expect(result.via).toBe('session')
    expect(result.files).toHaveLength(5)
  })

  it('explains what to do when nothing works and there is no token', async () => {
    installChrome(() => ({ ok: false, status: 0, url: 'u', text: '', error: 'blocked' }))
    mockFetch(() => {
      throw new TypeError('Failed to fetch')
    })
    await expect(loadPr(PR)).rejects.toThrow(/Add a token/)
  })

  it('uses the API when the session fails and a token exists', async () => {
    const { store } = installChrome((message) => {
      const path = (message as unknown as { path?: string }).path ?? ''
      if (message.type === 'text') return { ok: false, status: 0, url: 'u', text: '', error: 'blocked' }
      if (path.includes('/files')) {
        return {
          ok: true,
          status: 200,
          data: [
            { filename: 'a.php', status: 'modified', additions: 1, deletions: 0, patch: '@@ -1 +1 @@\n+x', sha: 'blob1', blob_url: 'b' },
          ],
        }
      }
      return { ok: true, status: 200, data: { title: 'API title', changed_files: 1, head: { sha: 'head1' } } }
    })
    store.token = 'ghp_test'
    mockFetch(() => {
      throw new TypeError('Failed to fetch')
    })
    const result = await loadPr(PR)
    expect(result.via).toBe('api')
    expect(result.info.title).toBe('API title')
    expect(result.files[0]).toMatchObject({ filename: 'a.php', hash: 'blob1' })
    expect(result.signature).toBe('head1')
  })
})

describe('fetchSignature', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('changes when the diff changes', async () => {
    installChrome()
    mockFetch(() => new Response(SAMPLE_DIFF))
    const a = await fetchSignature(PR, 'session')
    mockFetch(() => new Response(SAMPLE_DIFF + '\n+x'))
    const b = await fetchSignature(PR, 'session')
    expect(a).not.toBe(b)
  })

  it('uses the head commit when reading through the API', async () => {
    installChrome(() => ({ ok: true, status: 200, data: { head: { sha: 'abc' } } }))
    expect(await fetchSignature(PR, 'api')).toBe('abc')
  })
})
