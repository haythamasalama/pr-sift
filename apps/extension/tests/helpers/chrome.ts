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

  const event = <T extends (...args: never[]) => unknown>() => ({ addListener: vi.fn((_listener: T) => {}) })

  const chrome = {
    runtime: {
      id: 'test-extension',
      lastError: undefined,
      sendMessage: vi.fn((message: { type: string }, callback?: (response: unknown) => void) => {
        sent.push(message)
        callback?.(responder(message))
      }),
      getManifest: vi.fn(() => ({ version: '1.1.0' })),
      requestUpdateCheck: vi.fn(async (): Promise<{ status: string; version?: string }> => ({ status: 'no_update' })),
      reload: vi.fn(),
      openOptionsPage: vi.fn(async () => {}),
      onMessage: event<(message: unknown, sender: { id?: string }, send: (response: unknown) => void) => boolean | void>(),
      onUpdateAvailable: event<(details: { version: string }) => void>(),
      onInstalled: event<(details: { reason: string; previousVersion?: string }) => void>(),
    },
    action: { onClicked: event<() => void>() },
    storage: { local },
  }

  vi.stubGlobal('chrome', chrome)
  return { store, sent, chrome }
}

export function invalidateExtension() {
  const chrome = (globalThis as unknown as { chrome: { runtime: { id?: string } } }).chrome
  delete chrome.runtime.id
}
