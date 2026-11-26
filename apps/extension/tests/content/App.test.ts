/**
 * @vitest-environment-options {"url": "https://github.com/"}
 */
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
    // Handing a pull request to the app moves happy-dom to the prsift:// address, so each test starts back on GitHub.
    ;(window as unknown as { happyDOM: { setURL: (url: string) => void } }).happyDOM.setURL('https://github.com/o/r/pull/1/files')
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

  it('marks the launcher with an amber dot while an update is ready to restart', async () => {
    const { store } = installChrome()
    store.updateReady = '1.2.0'
    const wrapper = mount(App, { attachTo: document.body })
    await vi.waitFor(() => expect(launcher(wrapper)?.attributes('title')).toBe('PR Sift 1.2.0 is ready'))
    const dot = launcher(wrapper)!.find('[data-update-dot]')
    expect(dot.classes()).toContain('bg-attention')
    expect(dot.text()).toBe('PR Sift 1.2.0 is ready')
    expect(launcher(wrapper)!.find('[data-update-badge]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows the new version as a green badge, not a dot, right after an update', async () => {
    const { store } = installChrome()
    store.updated = { version: '1.2.0', previous: '1.1.0' }
    const wrapper = mount(App, { attachTo: document.body })
    await vi.waitFor(() => expect(launcher(wrapper)?.attributes('title')).toBe('PR Sift was updated to 1.2.0'))
    const badge = launcher(wrapper)!.find('[data-update-badge]')
    expect(badge.classes()).toContain('text-success-fg')
    expect(badge.text()).toContain('1.2.0')
    expect(launcher(wrapper)!.find('[data-update-dot]').exists()).toBe(false)
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
    expect(launcher(wrapper)!.find('[data-update-badge]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('hands a pull request opened from outside GitHub to the desktop app when that setting is on', async () => {
    const { store, sent } = installChrome()
    store.settings = { desktopApp: true }
    const wrapper = mount(App, { attachTo: document.body })
    await vi.waitFor(() => expect(sent.some((m) => m.type === 'handoff')).toBe(true))
    wrapper.unmount()
  })

  it('leaves pull requests the desktop app opened in the browser, and drops the stay mark from the address', async () => {
    const { store, sent } = installChrome()
    store.settings = { desktopApp: true }
    history.replaceState({}, '', '/o/r/pull/1/files?prsift=web')
    const wrapper = mount(App, { attachTo: document.body })
    await vi.waitFor(() => expect(launcher(wrapper)).toBeDefined())
    expect(sent.some((m) => m.type === 'handoff')).toBe(false)
    expect(location.href).toBe('https://github.com/o/r/pull/1/files')
    wrapper.unmount()
  })

  it('leaves pull requests in the browser when that setting is off', async () => {
    const { sent } = installChrome()
    const wrapper = mount(App, { attachTo: document.body })
    await vi.waitFor(() => expect(launcher(wrapper)).toBeDefined())
    expect(sent.some((m) => m.type === 'handoff')).toBe(false)
    wrapper.unmount()
  })
})
