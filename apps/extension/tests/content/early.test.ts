import { afterEach, describe, expect, it, vi } from 'vitest'
import { EARLY_DIFF, takeEarlyDiff } from '../../src/lib/earlyDiff'
import { installChrome } from '../helpers/chrome'

async function runEarly(path: string, autoOpen: boolean) {
  ;(window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(`https://github.com${path}`)
  const fake = installChrome((message) => (message.type === 'text' ? { ok: true, status: 200, url: 'u', text: 'DIFF' } : {}))
  fake.store.settings = { autoOpen }
  vi.resetModules()
  await import('../../src/content/early')
  return fake
}

describe('early content script', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[EARLY_DIFF]
  })

  it('starts the diff of the pull request when the review opens by itself', async () => {
    const { sent } = await runEarly('/o/r/pull/7/files', true)
    expect(await takeEarlyDiff('/o/r/pull/7')).toBe('DIFF')
    expect(sent).toEqual([{ type: 'text', url: 'https://github.com/o/r/pull/7.diff' }])
  })

  it('reads nothing when the review does not open by itself', async () => {
    const { sent } = await runEarly('/o/r/pull/7', false)
    expect(await takeEarlyDiff('/o/r/pull/7')).toBeNull()
    expect(sent).toEqual([])
  })

  it('leaves other pages alone', async () => {
    await runEarly('/o/r/issues/7', true)
    expect(takeEarlyDiff('/o/r/pull/7')).toBeNull()
  })

  it('hands the diff over only for the same pull request', async () => {
    await runEarly('/o/r/pull/7', true)
    expect(takeEarlyDiff('/o/r/pull/8')).toBeNull()
    expect(takeEarlyDiff('/o/r/pull/7')).toBeNull()
  })
})
