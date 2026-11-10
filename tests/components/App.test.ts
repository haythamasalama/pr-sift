import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/content/App.vue'
import { installChrome } from '../helpers/chrome'

const launcher = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('button').find((b) => b.text().includes('Review Lens'))
const closeButton = (wrapper: ReturnType<typeof mount>) => wrapper.find('[aria-label="Close"]')

describe('App launcher', () => {
  beforeEach(() => {
    installChrome()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    )
    history.pushState({}, '', '/o/r/pull/1/files')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('opens the review again after closing it, as many times as needed', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await vi.waitFor(() => expect(launcher(wrapper)).toBeDefined())

    for (let round = 0; round < 3; round++) {
      await launcher(wrapper)!.trigger('click')
      await vi.waitFor(() => expect(closeButton(wrapper).exists()).toBe(true))
      await closeButton(wrapper).trigger('click')
      await vi.waitFor(() => expect(launcher(wrapper)).toBeDefined())
    }
    wrapper.unmount()
  })

  it('keeps a separate empty container for menus and dialogs, away from the nodes Vue patches', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await vi.waitFor(() => expect(launcher(wrapper)).toBeDefined())
    const portal = wrapper.element.lastElementChild
    expect(portal?.tagName).toBe('DIV')
    expect(portal?.childElementCount).toBe(0)
    wrapper.unmount()
  })
})
