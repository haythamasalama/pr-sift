import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/content/App.vue'
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

  it.each([
    ['ready to restart', { updateReady: '1.2.0' }, 'PR Sift 1.2.0 is ready', 'bg-emphasis'],
    ['just installed', { updated: { version: '1.2.0', previous: '1.1.0' } }, 'PR Sift was updated to 1.2.0', 'bg-success'],
  ])('marks the launcher while an update is %s', async (_state, stored, title, colour) => {
    const { store } = installChrome()
    Object.assign(store, stored)
    const wrapper = mount(App, { attachTo: document.body })
    await vi.waitFor(() => expect(launcher(wrapper)?.attributes('title')).toBe(title))
    const dot = launcher(wrapper)!.find('[data-update-dot]')
    expect(dot.classes()).toContain(colour)
    expect(dot.text()).toBe(title)
    wrapper.unmount()
  })

  it('waits for a click by default', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await vi.waitFor(() => expect(launcher(wrapper)).toBeDefined())
    await new Promise((done) => setTimeout(done, 50))
    expect(closeButton(wrapper).exists()).toBe(false)
    wrapper.unmount()
  })

  it('opens the review on its own when Open PR Sift automatically is on, and stays closed once closed', async () => {
    const { store } = installChrome()
    store.settings = { autoOpen: true }
    const wrapper = mount(App, { attachTo: document.body })
    await vi.waitFor(() => expect(closeButton(wrapper).exists()).toBe(true))
    await closeButton(wrapper).trigger('click')
    await vi.waitFor(() => expect(launcher(wrapper)).toBeDefined())
    await new Promise((done) => setTimeout(done, 900))
    expect(closeButton(wrapper).exists()).toBe(false)

    history.pushState({}, '', '/o/r/pull/2/files')
    await vi.waitFor(() => expect(closeButton(wrapper).exists()).toBe(true), { timeout: 2000 })
    wrapper.unmount()
  })

  it('leaves the launcher plain when there is no update', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await vi.waitFor(() => expect(launcher(wrapper)).toBeDefined())
    expect(launcher(wrapper)!.attributes('title')).toBeUndefined()
    expect(launcher(wrapper)!.find('[data-update-dot]').exists()).toBe(false)
    wrapper.unmount()
  })
})
