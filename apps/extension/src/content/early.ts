import { setEarlyDiff } from '../lib/earlyDiff'
import type { Settings } from '../lib/types'

// Runs at document_start on pull request pages. When the review opens by itself, the diff, which GitHub can take
// a second or more to build, downloads while the page is still loading instead of after it.
const match = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(location.pathname)

function readDiff(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'text', url }, (res?: { ok: boolean; text: string }) => {
      resolve(!chrome.runtime.lastError && res?.ok ? res.text : null)
    })
  })
}

async function start(base: string): Promise<string | null> {
  try {
    const { settings } = (await chrome.storage.local.get('settings')) as { settings?: Partial<Settings> }
    return settings?.autoOpen ? await readDiff(`https://github.com${base}.diff`) : null
  } catch {
    return null
  }
}

if (match && chrome.runtime?.id) {
  const base = `/${match[1]}/${match[2]}/pull/${match[3]}`
  setEarlyDiff({ base, at: Date.now(), text: start(base) })
}
