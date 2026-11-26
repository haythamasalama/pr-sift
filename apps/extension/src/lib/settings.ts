import { DEFAULT_REMOVED_CO_AUTHORS } from '@pr-sift/core'
import { storageGet, storageSet } from './extension'
import type { Settings } from './types'

export const DEFAULTS: Settings = {
  presets: [],
  hide: ['**/*.lock', '**/package-lock.json', '**/pnpm-lock.yaml', '**/*.min.js', '**/*.min.css', '**/*.map'],
  hideStatuses: [],
  customExtensions: [],
  hiddenTypes: [],
  reviewMode: true,
  autoOpen: false,
  diffView: 'unified',
  sidebarWidth: 320,
  theme: 'system',
  treeIndent: 6,
  treeGuides: true,
  mergeMethod: 'squash',
  leaveOutCoAuthors: true,
  removedCoAuthors: DEFAULT_REMOVED_CO_AUTHORS,
  keptCoAuthors: [],
  showResolved: false,
  sidebarCollapsed: false,
  assistant: 'claude-code',
}

export async function getSettings(): Promise<Settings> {
  const settings = await storageGet<Partial<Settings>>('settings')
  return { ...DEFAULTS, ...(settings ?? {}) }
}

let writing = Promise.resolve()
const sameContext = new Set<(settings: Settings) => void>()

export function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  writing = writing.then(async () => {
    const settings = { ...(await storageGet<Partial<Settings>>('settings')), [key]: value }
    await storageSet({ settings })
    for (const callback of sameContext) callback({ ...DEFAULTS, ...settings })
  })
  return writing
}

// The storage change event can come late, so the review and the settings sheet in the same page hear each write right away.
export function onSettingsChange(callback: (settings: Settings) => void): () => void {
  sameContext.add(callback)
  const stopSameContext = () => sameContext.delete(callback)
  try {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.settings)
        callback({ ...DEFAULTS, ...((changes.settings.newValue as Partial<Settings> | undefined) ?? {}) })
    }
    chrome.storage?.onChanged?.addListener(listener)
    return () => {
      stopSameContext()
      chrome.storage?.onChanged?.removeListener(listener)
    }
  } catch {
    return stopSameContext
  }
}
