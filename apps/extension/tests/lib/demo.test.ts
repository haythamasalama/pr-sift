import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEMO_ID, isDemo, isEmbeddedDemo, leaveDemo } from '../../src/lib/demo'
import { installChrome } from '../helpers/chrome'

describe('demo', () => {
  afterEach(() => vi.restoreAllMocks())

  it('is off in the real extension', () => {
    installChrome()
    expect(isDemo()).toBe(false)
    expect(isEmbeddedDemo()).toBe(false)
  })

  it('stays open only when the demo sits inside another page', () => {
    installChrome().chrome.runtime.id = DEMO_ID
    expect(isEmbeddedDemo()).toBe(false)
    vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window)
    expect(isEmbeddedDemo()).toBe(true)
  })

  it('goes back to the page the full screen demo was opened from', () => {
    vi.spyOn(history, 'length', 'get').mockReturnValue(2)
    const back = vi.spyOn(history, 'back').mockImplementation(() => {})
    leaveDemo()
    expect(back).toHaveBeenCalled()
  })
})
