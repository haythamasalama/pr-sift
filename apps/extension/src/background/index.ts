import { BADGE_KEYS, refreshBadge } from './badge'

interface ApiMessage {
  type: 'gh'
  path: string
  method?: string
  body?: unknown
  accept?: string
}

interface TextMessage {
  type: 'text'
  url: string
}

type Message =
  | ApiMessage
  | TextMessage
  | { type: 'options'; section?: string }
  | { type: 'update-check' }
  | { type: 'apply-update' }
  | { type: 'extensions-page' }
  | { type: 'highlighter' }

// The review keeps its last few pull requests in session storage, which content scripts can only read once allowed.
void chrome.storage.session.setAccessLevel?.({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' }).catch(() => undefined)

// highlight.js is loaded into a page only when a review there needs colours, into the extension's isolated world.
async function injectHighlighter(sender: chrome.runtime.MessageSender) {
  const tabId = sender.tab?.id
  if (tabId === undefined) return { ok: false }
  await chrome.scripting.executeScript({ target: { tabId, frameIds: [sender.frameId ?? 0] }, files: ['dist/highlighter.js'] })
  return { ok: true }
}

async function api(msg: ApiMessage) {
  const { token } = (await chrome.storage.local.get('token')) as { token?: string }
  if (!token) return { ok: false, status: 401, data: { message: 'No token set in the extension options.' } }
  const url = new URL(msg.path, 'https://api.github.com')
  if (url.origin !== 'https://api.github.com') return { ok: false, status: 400, data: { message: 'Invalid API path.' } }
  const res = await fetch(url, {
    method: msg.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: msg.accept && ACCEPT.test(msg.accept) ? msg.accept : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(msg.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: msg.body ? JSON.stringify(msg.body) : undefined,
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}

const ACCEPT = /^application\/vnd\.github(\.[a-z-]+)?\+json$/

async function checkForUpdate() {
  try {
    const { status, version } = await chrome.runtime.requestUpdateCheck()
    return { status, version }
  } catch {
    return { status: 'error' }
  }
}

const READABLE_ORIGINS = ['https://github.com', 'https://patch-diff.githubusercontent.com']

async function fetchText(url: string) {
  if (!READABLE_ORIGINS.includes(new URL(url).origin)) return { ok: false, status: 400, url, text: '', error: 'Origin not allowed' }
  try {
    const res = await fetch(url, { credentials: 'include' })
    return { ok: res.ok, status: res.status, url: res.url, text: await res.text() }
  } catch (e) {
    return { ok: false, status: 0, url, text: '', error: String(e) }
  }
}

chrome.runtime.onMessage.addListener((msg: Message, sender, send) => {
  if (sender.id !== chrome.runtime.id) return
  if (msg.type === 'options') {
    if (msg.section && /^[a-z]+$/.test(msg.section))
      void chrome.tabs.create({ url: chrome.runtime.getURL(`dist/options.html#${msg.section}`) })
    else void chrome.runtime.openOptionsPage()
    return
  }
  if (msg.type === 'apply-update') {
    chrome.runtime.reload()
    return
  }
  if (msg.type === 'extensions-page') {
    void chrome.tabs.create({ url: 'chrome://extensions/' })
    return
  }
  if (msg.type === 'update-check') {
    void checkForUpdate().then(send)
    return true
  }
  if (msg.type === 'highlighter') {
    injectHighlighter(sender).then(send, (e: unknown) => send({ ok: false, error: String(e) }))
    return true
  }
  const task = msg.type === 'gh' ? api(msg) : msg.type === 'text' ? fetchText(msg.url) : null
  if (!task) return
  task.then(send).catch((e) => send({ ok: false, status: 0, data: { message: String(e) } }))
  return true
})

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage()
})

chrome.runtime.onUpdateAvailable.addListener((details) => {
  void chrome.storage.local.set({ updateReady: details.version })
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && BADGE_KEYS.some((key) => key in changes)) void refreshBadge()
})

chrome.runtime.onStartup.addListener(() => void refreshBadge())

void refreshBadge()

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== 'update') return
  void chrome.storage.local.remove('updateReady')
  const version = chrome.runtime.getManifest().version
  // Reloading an unpacked build also reports an update, with the version unchanged.
  if (details.previousVersion !== version) void chrome.storage.local.set({ updated: { version, previous: details.previousVersion } })
})
