import { vi } from 'vitest'

type Responder = (message: { type: string; [key: string]: unknown }) => unknown

export function installChrome(responder: Responder = () => ({ ok: false, status: 401, data: { message: 'no token' } })) {
  const store: Record<string, unknown> = {}
  const sent: { type: string; [key: string]: unknown }[] = []

  const local = {
    get: vi.fn(async (key: string | string[]) => {
      if (typeof key === 'string') return key in store ? { [key]: store[key] } : {}
      return Object.fromEntries(key.filter((k) => k in store).map((k) => [k, store[k]]))
    }),
    set: vi.fn(async (values: Record<string, unknown>) => {
      Object.assign(store, values)
    }),
    remove: vi.fn(async (key: string) => {
      delete store[key]
    }),
  }

  const sessionStore: Record<string, unknown> = {}
  const session = {
    get: vi.fn(async (key: string | string[]) => {
      const keys = typeof key === 'string' ? [key] : key
      return Object.fromEntries(keys.filter((k) => k in sessionStore).map((k) => [k, structuredClone(sessionStore[k])]))
    }),
    set: vi.fn(async (values: Record<string, unknown>) => {
      Object.assign(sessionStore, structuredClone(values))
    }),
    remove: vi.fn(async (key: string | string[]) => {
      for (const k of typeof key === 'string' ? [key] : key) delete sessionStore[k]
    }),
    setAccessLevel: vi.fn(async (_options: { accessLevel: string }) => {}),
  }

  const event = <T extends (...args: never[]) => unknown>() => ({
    addListener: vi.fn((_listener: T) => {}),
    removeListener: vi.fn((_listener: T) => {}),
  })

  const chrome = {
    runtime: {
      id: 'test-extension',
      lastError: undefined,
      sendMessage: vi.fn((message: { type: string }, callback?: (response: unknown) => void) => {
        sent.push(message)
        callback?.(responder(message))
      }),
      getManifest: vi.fn(() => ({ version: '1.1.0', action: { default_title: 'PR Sift settings' } })),
      requestUpdateCheck: vi.fn(async (): Promise<{ status: string; version?: string }> => ({ status: 'no_update' })),
      reload: vi.fn(),
      openOptionsPage: vi.fn(async () => {}),
      onMessage:
        event<
          (
            message: unknown,
            sender: { id?: string; tab?: { id?: number }; frameId?: number },
            send: (response: unknown) => void,
          ) => boolean | void
        >(),
      onUpdateAvailable: event<(details: { version: string }) => void>(),
      onInstalled: event<(details: { reason: string; previousVersion?: string }) => void>(),
      onStartup: event<() => void>(),
    },
    tabs: {
      create: vi.fn(async (_properties: { url: string }) => ({})),
    },
    action: {
      onClicked: event<() => void>(),
      setBadgeText: vi.fn(async (_details: { text: string }) => {}),
      setBadgeBackgroundColor: vi.fn(async (_details: { color: string }) => {}),
      setTitle: vi.fn(async (_details: { title: string }) => {}),
    },
    scripting: {
      executeScript: vi.fn(async (_injection: { target: { tabId: number; frameIds?: number[] }; files: string[] }) => []),
    },
    storage: {
      local,
      session,
      // Listeners are recorded, not called: a test that needs a change event calls the listener itself.
      onChanged: event<(changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string) => void>(),
    },
  }

  vi.stubGlobal('chrome', chrome)
  return { store, sessionStore, sent, chrome }
}

export function invalidateExtension() {
  const chrome = (globalThis as unknown as { chrome: { runtime: { id?: string } } }).chrome
  delete chrome.runtime.id
}
