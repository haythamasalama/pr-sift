import { describe, expect, it, vi } from 'vitest'
import { isolateKeyboard } from '../../src/lib/isolate'

function setup() {
  const host = document.createElement('div')
  const input = document.createElement('textarea')
  host.appendChild(input)
  document.body.appendChild(host)
  isolateKeyboard(host)
  const seen = vi.fn()
  document.addEventListener('keydown', seen)
  return { input, seen, done: () => (document.removeEventListener('keydown', seen), host.remove()) }
}

describe('isolateKeyboard', () => {
  it('keeps typing from reaching page hotkeys', () => {
    const { input, seen, done } = setup()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(seen).not.toHaveBeenCalled()
    done()
  })

  it('lets Escape through', () => {
    const { input, seen, done } = setup()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(seen).toHaveBeenCalledOnce()
    done()
  })

  it('keeps page capture listeners from cancelling typing', () => {
    const { input, done } = setup()
    const grab = (e: Event) => e.preventDefault()
    document.addEventListener('keydown', grab, true)
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true, composed: true })
    input.dispatchEvent(event)
    document.removeEventListener('keydown', grab, true)
    expect(event.defaultPrevented).toBe(false)
    done()
  })

  it('still lets the extension cancel its own key presses', () => {
    const { input, done } = setup()
    input.addEventListener('keydown', (e) => e.preventDefault())
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true, composed: true })
    input.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    done()
  })
})
