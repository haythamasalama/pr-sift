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

export function globToRegex(glob: string): RegExp {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++
        if (glob[i + 1] === '/') {
          i++
          re += '(?:.*/)?'
        } else {
          re += '.*'
        }
      } else {
        re += '[^/]*'
      }
    } else if (c === '?') {
      re += '[^/]'
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp('^' + re + '$', 'i')
}

export function matcher(globs: string[]): (path: string) => boolean {
  const res = globs.map(globToRegex)
  return (path) => res.some((r) => r.test(path))
}
