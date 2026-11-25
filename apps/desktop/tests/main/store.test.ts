import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Store } from '../../src/main/store'

const fresh = () => join(mkdtempSync(join(tmpdir(), 'store-')), 'data.json')

describe('Store', () => {
  it('keeps values on disk across instances', async () => {
    const file = fresh()
    await new Store(file).set({ settings: { theme: 'dark' } })
    expect(await new Store(file).get(['settings', 'missing'])).toEqual({ settings: { theme: 'dark' } })
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ settings: { theme: 'dark' } })
  })

  it('reports old and new values on change', async () => {
    const store = new Store(fresh())
    const seen: unknown[] = []
    store.on('changed', (c) => seen.push(c))
    await store.set({ a: 1 })
    await store.set({ a: 2 })
    await store.remove(['a', 'never-set'])
    expect(seen).toEqual([{ a: { oldValue: undefined, newValue: 1 } }, { a: { oldValue: 1, newValue: 2 } }, { a: { oldValue: 2 } }])
  })

  it('hands out copies, so callers cannot change stored values in place', async () => {
    const store = new Store(fresh())
    await store.set({ list: [1] })
    const { list } = (await store.get(['list'])) as { list: number[] }
    list.push(2)
    expect(await store.getOne('list')).toEqual([1])
  })
})
