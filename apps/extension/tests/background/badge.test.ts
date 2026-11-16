import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { badgeFor } from '../../src/background/badge'
import { installChrome } from '../helpers/chrome'

const WORKER = '../../src/background/index.ts'

async function startWorker(stored: Record<string, unknown> = {}) {
  const fake = installChrome()
  Object.assign(fake.store, stored)
  vi.resetModules()
  await import(/* @vite-ignore */ WORKER)
  await flushPromises()
  const { action, runtime, storage } = fake.chrome
  return {
    ...fake,
    action,
    changed: storage.onChanged.addListener.mock.calls[0]![0],
    startup: runtime.onStartup.addListener.mock.calls[0]![0],
    lastText: () => action.setBadgeText.mock.calls.at(-1)?.[0].text,
    lastColor: () => action.setBadgeBackgroundColor.mock.calls.at(-1)?.[0].color,
    lastTitle: () => action.setTitle.mock.calls.at(-1)?.[0].title,
  }
}

describe('badgeFor', () => {
  it('shows an arrow in GitHub blue while a downloaded update waits for a restart', () => {
    expect(badgeFor({ updateReady: '1.2.0', updated: { version: '1.1.0' } })).toEqual({
      text: '↑',
      color: '#1f6feb',
      title: 'PR Sift 1.2.0 is ready. Open settings to restart.',
    })
  })

  it('shows NEW in GitHub green after an update was installed', () => {
    expect(badgeFor({ updated: { version: '1.2.0', previous: '1.1.0' } })).toEqual({
      text: 'NEW',
      color: '#1f883d',
      title: 'PR Sift was updated to 1.2.0',
    })
  })

  it('shows nothing otherwise', () => {
    expect(badgeFor({})).toBeNull()
  })
})

describe('background badge', () => {
  it('sets the badge when the worker starts', async () => {
    const worker = await startWorker({ updateReady: '1.2.0' })
    expect(worker.lastText()).toBe('↑')
    expect(worker.lastColor()).toBe('#1f6feb')
    expect(worker.lastTitle()).toBe('PR Sift 1.2.0 is ready. Open settings to restart.')
  })

  it('clears the badge and restores the default title when there is no update', async () => {
    const worker = await startWorker()
    expect(worker.lastText()).toBe('')
    expect(worker.action.setBadgeBackgroundColor).not.toHaveBeenCalled()
    expect(worker.lastTitle()).toBe('PR Sift settings')
  })

  it('follows storage changes to the update keys and ignores the rest', async () => {
    const worker = await startWorker()
    const calls = () => worker.action.setBadgeText.mock.calls.length
    const before = calls()

    worker.changed({ settings: { newValue: {} } }, 'local')
    worker.changed({ updated: { newValue: { version: '1.2.0' } } }, 'sync')
    await flushPromises()
    expect(calls()).toBe(before)

    worker.store.updated = { version: '1.2.0', previous: '1.1.0' }
    worker.changed({ updated: { newValue: worker.store.updated } }, 'local')
    await flushPromises()
    expect(worker.lastText()).toBe('NEW')
    expect(worker.lastColor()).toBe('#1f883d')

    delete worker.store.updated
    worker.changed({ updated: { oldValue: { version: '1.2.0' } } }, 'local')
    await flushPromises()
    expect(worker.lastText()).toBe('')
  })

  it('checks again when the browser starts', async () => {
    const worker = await startWorker()
    worker.store.updateReady = '1.3.0'
    worker.startup()
    await flushPromises()
    expect(worker.lastText()).toBe('↑')
  })
})
