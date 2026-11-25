import type { DesktopSettings } from '#shared/ipc'
import type { Store } from './store'

const KEY = 'settings'
export const DEFAULT_SETTINGS: DesktopSettings = { roots: [], depth: 4, fullPaths: false }

export async function readSettings(store: Store): Promise<DesktopSettings> {
  return { ...DEFAULT_SETTINGS, ...((await store.getOne<Partial<DesktopSettings>>(KEY)) ?? {}) }
}

export async function writeSettings(store: Store, next: Partial<DesktopSettings>): Promise<DesktopSettings> {
  const current = await readSettings(store)
  const merged: DesktopSettings = { ...current }
  if (next.roots) merged.roots = [...new Set(next.roots.filter((r) => typeof r === 'string' && r.length > 0))]
  if (typeof next.depth === 'number') merged.depth = Math.min(8, Math.max(1, Math.round(next.depth)))
  if (typeof next.fullPaths === 'boolean') merged.fullPaths = next.fullPaths
  await store.set({ [KEY]: merged })
  return merged
}
