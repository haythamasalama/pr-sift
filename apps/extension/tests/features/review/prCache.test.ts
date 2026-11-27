import { describe, expect, it } from 'vitest'
import { cachePr, readCachedPr } from '../../../src/features/review/prCache'
import type { Loaded } from '../../../src/features/review/pull'
import { installChrome } from '../../helpers/chrome'

const loaded = (signature: string, patch = '+a'): Loaded => ({
  info: { title: 'T' },
  files: [{ filename: 'a.php', status: 'modified', additions: 1, deletions: 0, patch, hash: 'h1', blob_url: '' }],
  via: 'session',
  signature,
  headSha: 'sha',
})

const pr = (number: number) => ({ owner: 'o', repo: 'r', number })

describe('prCache', () => {
  it('keeps a pull request in session storage and reads it back', async () => {
    const { chrome } = installChrome()
    await cachePr(pr(1), loaded('s1'))
    expect(await readCachedPr(pr(1))).toEqual(loaded('s1'))
    expect(await readCachedPr(pr(2))).toBeNull()
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
  })

  it('keeps only the last four pull requests', async () => {
    installChrome()
    for (const n of [1, 2, 3, 4, 5]) await cachePr(pr(n), loaded(`s${n}`))
    expect(await readCachedPr(pr(1))).toBeNull()
    expect((await readCachedPr(pr(5)))?.signature).toBe('s5')
    await cachePr(pr(2), loaded('s2b'))
    await cachePr(pr(6), loaded('s6'))
    expect((await readCachedPr(pr(2)))?.signature).toBe('s2b')
    expect(await readCachedPr(pr(3))).toBeNull()
  })

  it('does not keep a pull request too large for session storage', async () => {
    installChrome()
    await cachePr(pr(1), loaded('s1', '+'.repeat(2_100_000)))
    expect(await readCachedPr(pr(1))).toBeNull()
  })
})
