import { storageGet, storageSet } from './extension'
import type { Settings } from './types'

export const DEFAULTS: Settings = {
  presets: [],
  hide: ['**/*.lock', '**/package-lock.json', '**/pnpm-lock.yaml', '**/*.min.js', '**/*.min.css', '**/*.map'],
  hideStatuses: [],
  customExtensions: [],
  hiddenTypes: [],
  reviewMode: true,
  diffView: 'unified',
  sidebarWidth: 320,
  theme: 'system',
}

export async function getSettings(): Promise<Settings> {
  const settings = await storageGet<Partial<Settings>>('settings')
  return { ...DEFAULTS, ...(settings ?? {}) }
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  const settings = await storageGet<Partial<Settings>>('settings')
  await storageSet({ settings: { ...(settings ?? {}), [key]: value } })
}

export function onSettingsChange(callback: (settings: Settings) => void): () => void {
  try {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.settings)
        callback({ ...DEFAULTS, ...((changes.settings.newValue as Partial<Settings> | undefined) ?? {}) })
    }
    chrome.storage?.onChanged?.addListener(listener)
    return () => chrome.storage?.onChanged?.removeListener(listener)
  } catch {
    return () => {}
  }
}
