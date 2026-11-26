import { alive } from '../../lib/extension'
import { prKey, type PrRef } from '../../lib/types'
import type { Loaded } from './pull'

// The last few pull requests are kept in chrome.storage.session: memory only, readable by the extension alone, and
// gone when Chrome closes. Opening one again shows it at once while a fresh copy loads.
const INDEX = 'prCacheIndex'
const ENTRY = 'prCache:'
const MAX_ENTRIES = 4
// storage.session holds about 10 MB in all, so very large pull requests are not kept.
const MAX_ENTRY_CHARS = 2_000_000

const area = () => (alive() ? chrome.storage.session : undefined)

export async function readCachedPr(pr: PrRef): Promise<Loaded | null> {
  try {
    const key = ENTRY + prKey(pr)
    const stored = (await area()?.get(key)) as Record<string, Loaded | undefined> | undefined
    return stored?.[key] ?? null
  } catch {
    return null
  }
}

export async function cachePr(pr: PrRef, loaded: Loaded): Promise<void> {
  const storage = area()
  if (!storage) return
  try {
    if (JSON.stringify(loaded).length > MAX_ENTRY_CHARS) return
    const key = ENTRY + prKey(pr)
    const { [INDEX]: index = [] } = (await storage.get(INDEX)) as { [INDEX]?: string[] }
    const next = [key, ...index.filter((k) => k !== key)]
    const dropped = next.splice(MAX_ENTRIES)
    if (dropped.length) await storage.remove(dropped)
    await storage.set({ [key]: loaded, [INDEX]: next })
  } catch {
    return
  }
}
