import { alive, onStorageKey, storageGet, storageRemove } from './extension'

const STORE_URL = 'https://chromewebstore.google.com/detail/pr-sift/kdbgdnoafohnnojmoaaabdomgfigdhln'
export const REVIEWS_URL = `${STORE_URL}/reviews`
export const CHANGELOG_URL = 'https://pr-sift.haythamasalama.me/changelog/'

export type UpdateStatus = 'update_available' | 'no_update' | 'throttled' | 'error'

export interface UpdateCheck {
  status: UpdateStatus
  version?: string
}

export interface UpdatedInfo {
  version: string
  previous?: string
}

const CHECK_RESULTS: UpdateStatus[] = ['update_available', 'no_update', 'throttled']

export function currentVersion(): string {
  if (!alive()) return ''
  try {
    return chrome.runtime.getManifest().version
  } catch {
    return ''
  }
}

export function checkForUpdate(): Promise<UpdateCheck> {
  return new Promise((resolve) => {
    if (!alive()) return resolve({ status: 'error' })
    try {
      chrome.runtime.sendMessage({ type: 'update-check' }, (res: UpdateCheck | undefined) => {
        const valid = !chrome.runtime.lastError && res && CHECK_RESULTS.includes(res.status)
        resolve(valid ? res : { status: 'error' })
      })
    } catch {
      resolve({ status: 'error' })
    }
  })
}

export function applyUpdate() {
  if (!alive()) return
  // Reading lastError stops Chrome logging the closed port when the worker restarts before replying.
  chrome.runtime.sendMessage({ type: 'apply-update' }, () => void chrome.runtime.lastError)
}

function watchKey<T>(key: string, callback: (value: T | undefined) => void): () => void {
  let changed = false
  const stop = onStorageKey<T>(key, (value) => {
    changed = true
    callback(value)
  })
  void storageGet<T>(key).then((value) => {
    if (!changed) callback(value)
  })
  return stop
}

export const watchUpdateReady = (callback: (version: string | undefined) => void) => watchKey('updateReady', callback)

export const watchUpdated = (callback: (info: UpdatedInfo | undefined) => void) => watchKey('updated', callback)

export const dismissUpdated = () => storageRemove('updated')
