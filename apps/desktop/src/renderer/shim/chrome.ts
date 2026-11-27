import type { ApiRequest, Bridge, StorageChange } from '#shared/ipc'

type Listener = (changes: Record<string, StorageChange>, area: string) => void
type Callback = (response: unknown) => void

// Values the extension expects that make no sense here: the tip about opening the review on github.com.
const DEFAULTS: Record<string, unknown> = { autoOpenTipDismissed: true }

const asList = (keys: string | string[] | null | undefined) => (keys == null ? [] : Array.isArray(keys) ? keys : [keys])

export interface ShimOptions {
  version: string
  openSection: (section?: string) => void
}

// The extension's code reaches the browser only through `chrome.storage.local` and `chrome.runtime.sendMessage`.
// This gives it both, backed by the main process, so the review UI runs here unchanged.
export function createChrome(bridge: Bridge, options: ShimOptions) {
  const listeners = new Set<Listener>()
  bridge.on('store:changed', (changes) => {
    for (const listener of listeners) listener(changes, 'local')
  })

  const runtime = {
    id: 'desktop',
    lastError: undefined as { message: string } | undefined,
    getManifest: () => ({ version: options.version, name: 'PR Sift' }),
    sendMessage(message: { type: string; [key: string]: unknown }, callback?: Callback) {
      const reply = (response: unknown, error?: string) => {
        runtime.lastError = error ? { message: error } : undefined
        try {
          callback?.(response)
        } finally {
          runtime.lastError = undefined
        }
      }
      if (message.type === 'gh') {
        const { path, method, body, accept } = message as unknown as ApiRequest
        bridge.invoke('gh:request', { type: 'gh', path, method, body, accept }).then(
          (res) => reply(res),
          (e: unknown) => reply(undefined, e instanceof Error ? e.message : String(e)),
        )
        return
      }
      // The page-session fallback has no github.com cookies here; failing fast sends the review to the API instead.
      if (message.type === 'text') {
        queueMicrotask(() =>
          reply({ ok: false, status: 0, url: String(message.url ?? ''), text: '', error: 'Not available in the desktop app' }),
        )
        return
      }
      if (message.type === 'options') {
        options.openSection(typeof message.section === 'string' ? message.section : undefined)
        return
      }
      if (message.type === 'update-check') {
        queueMicrotask(() => reply({ status: 'no_update' }))
        return
      }
      queueMicrotask(() => reply(undefined))
    },
  }

  const local = {
    async get(keys?: string | string[] | null) {
      const list = asList(keys)
      const stored = await bridge.invoke('store:get', list)
      const withDefaults: Record<string, unknown> = {}
      for (const key of list) if (key in DEFAULTS) withDefaults[key] = DEFAULTS[key]
      return { ...withDefaults, ...stored }
    },
    set: (values: Record<string, unknown>) => bridge.invoke('store:set', values),
    remove: (keys: string | string[]) => bridge.invoke('store:remove', asList(keys)),
  }

  const onChanged = {
    addListener: (listener: Listener) => void listeners.add(listener),
    removeListener: (listener: Listener) => void listeners.delete(listener),
  }

  return { runtime, storage: { local, onChanged } }
}

// Relative `/<owner>/<repo>/pull/…` and `/raw/…` requests are github.com page requests in the extension. Here they
// would reach the app's own files, which can answer with HTML that looks like success, so they are refused.
export function guardFetch(target: { fetch: typeof fetch }) {
  const original = target.fetch.bind(target)
  const PAGE = /^\/[^/]+\/[^/]+\/(pull|raw)\//
  target.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.startsWith('/') && !url.startsWith('//') && PAGE.test(url)) {
      return Promise.reject(new TypeError('GitHub page requests are not available in the desktop app'))
    }
    return original(input, init)
  }
}
