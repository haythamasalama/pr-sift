export const alive = () => Boolean(chrome.runtime?.id)

export async function storageGet<T>(key: string): Promise<T | undefined> {
  if (!alive()) return undefined
  try {
    const stored = (await chrome.storage.local.get(key)) as Record<string, T | undefined>
    return stored[key]
  } catch {
    return undefined
  }
}

export async function storageSet(values: Record<string, unknown>): Promise<void> {
  if (!alive()) return
  try {
    await chrome.storage.local.set(values)
  } catch {
    return
  }
}

export function onStorageKey<T>(key: string, callback: (value: T | undefined) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && key in changes) callback(changes[key]!.newValue as T | undefined)
  }
  try {
    chrome.storage?.onChanged?.addListener(listener)
  } catch {
    return () => undefined
  }
  return () => {
    try {
      chrome.storage?.onChanged?.removeListener(listener)
    } catch {
      return
    }
  }
}

export function ignoreInvalidatedContext() {
  const matches = (value: unknown) => /Extension context invalidated/i.test(value instanceof Error ? value.message : String(value ?? ''))
  window.addEventListener('unhandledrejection', (e) => {
    if (matches(e.reason)) e.preventDefault()
  })
  window.addEventListener('error', (e) => {
    if (matches(e.error ?? e.message)) e.preventDefault()
  })
}
