import { describe, expect, it, vi } from 'vitest'
import type { Bridge, Channel, StorageChange } from '#shared/ipc'
import { createChrome, guardFetch } from '../../src/renderer/shim/chrome'

function fakeBridge(handlers: Partial<Record<Channel, (...args: unknown[]) => unknown>> = {}) {
  let storeListener: ((c: Record<string, StorageChange>) => void) | undefined
  const bridge = {
    invoke: vi.fn(async (channel: Channel, ...args: unknown[]) => handlers[channel]?.(...args)),
    on: vi.fn((event: string, listener: (c: Record<string, StorageChange>) => void) => {
      if (event === 'store:changed') storeListener = listener
      return () => undefined
    }),
  } as unknown as Bridge
  return { bridge, emit: (c: Record<string, StorageChange>) => storeListener?.(c) }
}

describe('chrome shim', () => {
  it('answers gh messages with the main process reply, like the service worker', async () => {
    const reply = { ok: true, status: 200, data: { login: 'octo' } }
    const { bridge } = fakeBridge({ 'gh:request': async () => reply })
    const chrome = createChrome(bridge, { version: '1.0.0', openSection: () => undefined })
    const res = await new Promise((resolve) => chrome.runtime.sendMessage({ type: 'gh', path: '/user' }, resolve))
    expect(res).toEqual(reply)
    expect(bridge.invoke).toHaveBeenCalledWith('gh:request', {
      type: 'gh',
      path: '/user',
      method: undefined,
      body: undefined,
      accept: undefined,
    })
  })

  it('sets lastError only while the callback runs', async () => {
    const { bridge } = fakeBridge({
      'gh:request': async () => {
        throw new Error('ipc closed')
      },
    })
    const chrome = createChrome(bridge, { version: '1.0.0', openSection: () => undefined })
    const seen = await new Promise((resolve) =>
      chrome.runtime.sendMessage({ type: 'gh', path: '/user' }, () => resolve(chrome.runtime.lastError)),
    )
    expect(seen).toEqual({ message: 'ipc closed' })
    expect(chrome.runtime.lastError).toBeUndefined()
  })

  it('fails page text requests so the review uses the API', async () => {
    const { bridge } = fakeBridge()
    const chrome = createChrome(bridge, { version: '1.0.0', openSection: () => undefined })
    const res = await new Promise((resolve) =>
      chrome.runtime.sendMessage({ type: 'text', url: 'https://github.com/a/b/pull/1.diff' }, resolve),
    )
    expect(res).toMatchObject({ ok: false })
  })

  it('reads storage with desktop defaults and passes change events on', async () => {
    const { bridge, emit } = fakeBridge({ 'store:get': async () => ({ settings: { theme: 'dark' } }) })
    const chrome = createChrome(bridge, { version: '1.0.0', openSection: () => undefined })
    expect(await chrome.storage.local.get(['settings', 'autoOpenTipDismissed'])).toEqual({
      settings: { theme: 'dark' },
      autoOpenTipDismissed: true,
    })
    const listener = vi.fn()
    chrome.storage.onChanged.addListener(listener)
    emit({ settings: { newValue: 1 } })
    expect(listener).toHaveBeenCalledWith({ settings: { newValue: 1 } }, 'local')
  })

  it('opens the right screen for an options message', () => {
    const openSection = vi.fn()
    const chrome = createChrome(fakeBridge().bridge, { version: '1.0.0', openSection })
    chrome.runtime.sendMessage({ type: 'options', section: 'token' })
    expect(openSection).toHaveBeenCalledWith('token')
  })
})

describe('guardFetch', () => {
  it('refuses github.com page paths and lets everything else through', async () => {
    const original = vi.fn(async () => new Response('ok'))
    const target = { fetch: original as unknown as typeof fetch }
    guardFetch(target)
    await expect(target.fetch('/octo/repo/pull/1.diff')).rejects.toThrow(/not available/)
    await expect(target.fetch('/octo/repo/raw/abc/file.ts')).rejects.toThrow()
    await target.fetch('/assets/index.js')
    await target.fetch('https://api.github.com/octo/repo/pull/1')
    expect(original).toHaveBeenCalledTimes(2)
  })
})
