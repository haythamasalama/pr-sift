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

  const chrome = {
    runtime: {
      id: 'test-extension',
      lastError: undefined,
      sendMessage: vi.fn((message: { type: string }, callback: (response: unknown) => void) => {
        sent.push(message)
        callback(responder(message))
      }),
    },
    storage: { local },
  }

  vi.stubGlobal('chrome', chrome)
  return { store, sent, chrome }
}

export function invalidateExtension() {
  const chrome = (globalThis as unknown as { chrome: { runtime: { id?: string } } }).chrome
  delete chrome.runtime.id
}
