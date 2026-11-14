import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/content/App.vue'
import { useAppearance } from '../../src/features/appearance/useAppearance'
import { installChrome } from '../helpers/chrome'

const launcher = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('button').find((b) => b.text().includes('PR Sift'))
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

  afterEach(async () => {
    const { setGlow, setTheme } = useAppearance()
    await Promise.all([setGlow('soft'), setTheme('system')])
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
    delete document.documentElement.dataset.colorMode
    delete document.documentElement.dataset.darkTheme
  })

  it('makes the launcher glow by default', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await vi.waitFor(() => expect(launcher(wrapper)).toBeDefined())
    expect(launcher(wrapper)!.attributes('data-glow')).toBe('soft')
    wrapper.unmount()
  })

  it('stops the glow when it is turned off', async () => {
    await useAppearance().setGlow('off')
    const wrapper = mount(App, { attachTo: document.body })
    await vi.waitFor(() => expect(launcher(wrapper)).toBeDefined())
    expect(launcher(wrapper)!.attributes('data-glow')).toBeUndefined()
    wrapper.unmount()
  })

  it('draws the launcher for a dark GitHub page even when PR Sift is light', async () => {
    await useAppearance().setTheme('light')
    document.documentElement.dataset.colorMode = 'dark'
    document.documentElement.dataset.darkTheme = 'dark'
    const wrapper = mount(App, { attachTo: document.body })
    await vi.waitFor(() => expect(launcher(wrapper)).toBeDefined())
    expect(wrapper.classes()).toContain('dark')
    wrapper.unmount()
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
