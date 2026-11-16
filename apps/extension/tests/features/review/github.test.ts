import { describe, expect, it, vi } from 'vitest'
import { watchToken } from '../../../src/features/review/github'
import { installChrome } from '../../helpers/chrome'

describe('watchToken', () => {
  it('reports the stored token, then every change to it', async () => {
    const { chrome, store } = installChrome()
    store.token = 'ghp_old'
    const listeners: ((changes: Record<string, { newValue?: unknown }>, area: string) => void)[] = []
    Object.assign(chrome.storage, {
      onChanged: { addListener: (l: (typeof listeners)[number]) => listeners.push(l), removeListener: vi.fn() },
    })
    const seen: boolean[] = []
    watchToken((present) => seen.push(present))
    await vi.waitFor(() => expect(seen).toEqual([true]))

    for (const l of listeners) l({ token: { newValue: '' } }, 'local')
    for (const l of listeners) l({ token: { newValue: 'ghp_new' } }, 'local')
    expect(seen).toEqual([true, false, true])
  })
})
