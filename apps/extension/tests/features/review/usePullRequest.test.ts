import { afterEach, describe, expect, it, vi } from 'vitest'
import { PR, SAMPLE_DIFF } from '@pr-sift/core/testing'
import { usePullRequest } from '../../../src/features/review/usePullRequest'
import { cachePr, readCachedPr } from '../../../src/features/review/prCache'
import { loadPr } from '../../../src/features/review/pull'
import { installChrome } from '../../helpers/chrome'

const EXTRA_FILE = `diff --git a/new.md b/new.md
new file mode 100644
--- /dev/null
+++ b/new.md
@@ -0,0 +1 @@
+hello
`

const pageHtml = '<html><body><h1 class="js-issue-title">Fresh title</h1></body></html>'

function serve(diff: string) {
  let release = () => {}
  const gate = new Promise<void>((resolve) => (release = resolve))
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      await gate
      return String(url).endsWith('.diff') ? new Response(diff) : new Response(pageHtml)
    }),
  )
  return release
}

describe('usePullRequest', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows a saved copy at once and keeps it when nothing changed', async () => {
    installChrome()
    serve(SAMPLE_DIFF)()
    await cachePr(PR, { ...(await loadPr(PR)), info: { title: 'Saved title' } })
    const release = serve(SAMPLE_DIFF)
    const pull = usePullRequest()
    const loading = pull.load(PR)
    await vi.waitFor(() => expect(pull.status.value).toBe('ready'))
    expect(pull.info.value?.title).toBe('Saved title')
    const files = pull.files.value
    release()
    await loading
    expect(pull.info.value?.title).toBe('Fresh title')
    expect(pull.files.value).toBe(files)
    expect(pull.outdated.value).toBe(false)
  })

  it('marks a saved copy as outdated and refreshes from the load it already has', async () => {
    installChrome()
    serve(SAMPLE_DIFF)()
    await cachePr(PR, await loadPr(PR))
    serve(SAMPLE_DIFF + EXTRA_FILE)()
    const pull = usePullRequest()
    await pull.load(PR)
    expect(pull.outdated.value).toBe(true)
    expect(await pull.hasUpdate(PR)).toBe(true)
    const fetches = vi.mocked(fetch).mock.calls.length
    const summary = await pull.refresh(PR)
    expect(vi.mocked(fetch).mock.calls.length).toBe(fetches)
    expect(summary?.added).toBe(1)
    expect(pull.outdated.value).toBe(false)
    expect((await readCachedPr(PR))?.signature).toBe((await loadPr(PR)).signature)
  })

  it('saves a fresh load for next time', async () => {
    installChrome()
    serve(SAMPLE_DIFF)()
    const pull = usePullRequest()
    await pull.load(PR)
    expect(pull.status.value).toBe('ready')
    await vi.waitFor(async () => expect((await readCachedPr(PR))?.files).toHaveLength(5))
  })

  it('keeps showing the saved copy when the fresh load fails', async () => {
    installChrome()
    serve(SAMPLE_DIFF)()
    await cachePr(PR, await loadPr(PR))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('offline')
      }),
    )
    const pull = usePullRequest()
    await pull.load(PR)
    expect(pull.status.value).toBe('ready')
    expect(pull.files.value).toHaveLength(5)
  })
})
