// A small cache so screens open with what was last seen and refresh behind it, instead of starting empty every time.
// It lives in memory for this run and in localStorage for the next one; losing it only costs a slower first look.
export interface Cached<T> {
  at: number
  value: T
}

const PREFIX = 'prSift.cache.'
const memory = new Map<string, Cached<unknown>>()

export function readCache<T>(key: string): Cached<T> | undefined {
  const hit = memory.get(key) as Cached<T> | undefined
  if (hit) return hit
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Cached<T>
    memory.set(key, parsed)
    return parsed
  } catch {
    return undefined
  }
}

export function writeCache<T>(key: string, value: T): Cached<T> {
  const entry = { at: Date.now(), value }
  memory.set(key, entry)
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(entry))
  } catch {
    // Full or unavailable storage: the in-memory copy still helps for this run.
  }
  return entry
}

export const isFresh = (entry: Cached<unknown> | undefined, maxAgeMs: number) => !!entry && Date.now() - entry.at < maxAgeMs

// Drops everything, for signing out.
export function clearCache() {
  memory.clear()
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k)
  } catch {
    return
  }
}
