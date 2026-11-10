import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { useViewed } from '../../../src/features/review/useViewed'
import { installChrome } from '../../helpers/chrome'
import { file } from '@pr-sift/core/testing'

describe('useViewed', () => {
  it('marks files as viewed against their content hash', async () => {
    installChrome()
    const viewed = useViewed(shallowRef('o/r#1'))
    const a = file('a.php', { hash: 'h1' })
    await viewed.setViewed(a, true)
    expect(viewed.isViewed(a)).toBe(true)
    expect(viewed.isViewed({ ...a, hash: 'h2' })).toBe(false)
  })

  it('flags a file as stale when it changed after being viewed', async () => {
    installChrome()
    const viewed = useViewed(shallowRef('o/r#1'))
    await viewed.setViewed(file('a.php', { hash: 'h1' }), true)
    const changed = file('a.php', { hash: 'h2' })
    expect(viewed.isStale(changed)).toBe(true)
    expect(viewed.isStale(file('b.php'))).toBe(false)
  })

  it('persists per pull request and restores on load', async () => {
    const { store } = installChrome()
    const first = useViewed(shallowRef('o/r#1'))
    await first.setViewed(file('a.php', { hash: 'h1' }), true)
    expect(store['viewed2:o/r#1']).toEqual({ 'a.php': 'h1' })

    const second = useViewed(shallowRef('o/r#1'))
    await flushPromises()
    expect(second.isViewed(file('a.php', { hash: 'h1' }))).toBe(true)

    const other = useViewed(shallowRef('o/r#2'))
    await flushPromises()
    expect(other.isViewed(file('a.php', { hash: 'h1' }))).toBe(false)
  })

  it('marks and unmarks many files and clears everything', async () => {
    installChrome()
    const viewed = useViewed(shallowRef('o/r#1'))
    const list = [file('a'), file('b'), file('c')]
    await viewed.setMany(list, true)
    expect(list.every(viewed.isViewed)).toBe(true)
    await viewed.setMany([list[0]!], false)
    expect(viewed.isViewed(list[0]!)).toBe(false)
    await viewed.clearAll()
    expect(list.some(viewed.isViewed)).toBe(false)
  })
})
