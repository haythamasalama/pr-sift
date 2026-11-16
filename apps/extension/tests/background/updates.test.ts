import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installChrome } from '../helpers/chrome'

// The worker is a script with no exports, so TypeScript refuses a static import of it.
const WORKER = '../../src/background/index.ts'

let fake: ReturnType<typeof installChrome>

async function startWorker() {
  fake = installChrome()
  vi.resetModules()
  await import(/* @vite-ignore */ WORKER)
  const { runtime } = fake.chrome
  return {
    message: runtime.onMessage.addListener.mock.calls[0]![0],
    updateAvailable: runtime.onUpdateAvailable.addListener.mock.calls[0]![0],
    installed: runtime.onInstalled.addListener.mock.calls[0]![0],
  }
}

const self = { id: 'test-extension' }

describe('background update handling', () => {
  let worker: Awaited<ReturnType<typeof startWorker>>

  beforeEach(async () => {
    worker = await startWorker()
  })

  it('replies to an update check with the status and the new version', async () => {
    fake.chrome.runtime.requestUpdateCheck.mockResolvedValueOnce({ status: 'update_available', version: '1.2.0' })
    const send = vi.fn()
    expect(worker.message({ type: 'update-check' }, self, send)).toBe(true)
    await flushPromises()
    expect(send).toHaveBeenCalledWith({ status: 'update_available', version: '1.2.0' })
  })

  it('replies with an error when Chrome cannot check', async () => {
    fake.chrome.runtime.requestUpdateCheck.mockRejectedValueOnce(new Error('offline'))
    const send = vi.fn()
    worker.message({ type: 'update-check' }, self, send)
    await flushPromises()
    expect(send).toHaveBeenCalledWith({ status: 'error' })
  })

  it('ignores messages from other extensions', () => {
    const send = vi.fn()
    expect(worker.message({ type: 'apply-update' }, { id: 'other' }, send)).toBeUndefined()
    expect(fake.chrome.runtime.reload).not.toHaveBeenCalled()
  })

  it('restarts to apply a downloaded update', () => {
    worker.message({ type: 'apply-update' }, self, vi.fn())
    expect(fake.chrome.runtime.reload).toHaveBeenCalledOnce()
  })

  it('remembers a downloaded update until it is installed', async () => {
    worker.updateAvailable({ version: '1.2.0' })
    expect(fake.store.updateReady).toBe('1.2.0')

    worker.installed({ reason: 'update', previousVersion: '1.0.1' })
    await flushPromises()
    expect('updateReady' in fake.store).toBe(false)
    expect(fake.store.updated).toEqual({ version: '1.1.0', previous: '1.0.1' })
  })

  it('does not announce an update when the version did not change or on a fresh install', async () => {
    worker.installed({ reason: 'update', previousVersion: '1.1.0' })
    worker.installed({ reason: 'install' })
    await flushPromises()
    expect('updated' in fake.store).toBe(false)
  })
})
