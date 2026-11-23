import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULTS, getSettings, onSettingsChange, saveSetting } from '../../src/lib/settings'
import { installChrome } from '../helpers/chrome'

describe('settings storage', () => {
  beforeEach(() => {
    installChrome()
  })

  it('returns the defaults when nothing is stored', async () => {
    expect(await getSettings()).toEqual(DEFAULTS)
  })

  it('stores only the overridden keys and merges them over the defaults', async () => {
    await saveSetting('sidebarWidth', 480)
    await saveSetting('reviewMode', false)
    const settings = await getSettings()
    expect(settings.sidebarWidth).toBe(480)
    expect(settings.reviewMode).toBe(false)
    expect(settings.hide).toEqual(DEFAULTS.hide)
  })

  it('does not throw when the extension context is gone', async () => {
    const chrome = installChrome()
    delete (chrome.chrome.runtime as { id?: string }).id
    await expect(saveSetting('sidebarWidth', 300)).resolves.toBeUndefined()
    expect(await getSettings()).toEqual(DEFAULTS)
  })

  it('tells listeners in the same page about a write without waiting for the storage event', async () => {
    const heard = vi.fn()
    const stop = onSettingsChange(heard)
    await saveSetting('hide', ['lang/**'])
    expect(heard).toHaveBeenLastCalledWith(expect.objectContaining({ hide: ['lang/**'], reviewMode: DEFAULTS.reviewMode }))
    stop()
    await saveSetting('hide', [])
    expect(heard).toHaveBeenCalledTimes(1)
  })

  it('keeps both values when two settings are saved at the same time', async () => {
    await Promise.all([saveSetting('sidebarWidth', 400), saveSetting('reviewMode', false)])
    const settings = await getSettings()
    expect(settings.sidebarWidth).toBe(400)
    expect(settings.reviewMode).toBe(false)
  })
})
