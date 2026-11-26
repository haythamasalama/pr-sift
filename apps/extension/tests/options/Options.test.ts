import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import Options from '../../src/options/Options.vue'
import { CHANGELOG_URL, REVIEWS_URL } from '../../src/lib/updates'
import { installChrome } from '../helpers/chrome'

type Wrapper = ReturnType<typeof mount>

const about = (wrapper: Wrapper) => wrapper.find('[data-section="about"]')
const button = (wrapper: Wrapper, label: string) =>
  about(wrapper)
    .findAll('button')
    .find((b) => b.text().includes(label))

async function checkWith(answer: unknown) {
  installChrome(() => answer)
  const wrapper = mount(Options, { attachTo: document.body })
  await flushPromises()
  await button(wrapper, 'Check for updates')!.trigger('click')
  await flushPromises()
  return wrapper
}

describe('Options page', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows the settings grouped by what you want to do, with one save button for the token', async () => {
    installChrome()
    const wrapper = mount(Options, { attachTo: document.body })
    await flushPromises()
    const sections = wrapper.findAll('section[data-section]').map((s) => s.attributes('data-section'))
    expect(sections).toEqual(['about', 'github', 'review', 'files', 'appearance'])
    expect(wrapper.findAll('section[data-section]').every((s) => s.isVisible())).toBe(true)
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    expect(
      wrapper
        .find('nav')
        .findAll('button')
        .map((b) => b.text()),
    ).toEqual(['About', 'GitHub', 'Reviewing', 'Files', 'Appearance'])
    expect(wrapper.find('[data-slot="card"]').exists()).toBe(false)
    const connect = wrapper.findAll('button').filter((b) => b.text() === 'Connect')
    expect(connect).toHaveLength(1)
    expect(wrapper.find('[data-section="token"]').element.contains(connect[0]!.element)).toBe(true)
  })

  it('shows the installed version and links to the changelog and the store reviews', async () => {
    installChrome()
    const wrapper = mount(Options, { attachTo: document.body })
    await flushPromises()
    const card = about(wrapper)
    expect(card.text()).toContain('Version 1.1.0')
    expect(card.text()).toContain('Chrome updates it on its own.')
    const links = Object.fromEntries(card.findAll('a').map((a) => [a.find('[data-slot="item-title"]').text(), a.attributes('href')]))
    expect(links).toEqual({ 'What’s new': CHANGELOG_URL, 'Rate PR Sift': REVIEWS_URL })
    expect(button(wrapper, 'Restart to update')).toBeUndefined()
  })

  it.each([
    [{ status: 'no_update' }, 'You have the latest version'],
    [{ status: 'update_available', version: '1.2.0' }, 'Downloading 1.2.0…'],
    [{ status: 'throttled' }, 'Chrome limits this check. It updates PR Sift on its own within a few hours.'],
    [{ status: 'error' }, 'Could not check for updates'],
  ])('reports %o from a check', async (answer, text) => {
    const wrapper = await checkWith(answer)
    expect(about(wrapper).text()).toContain(text)
  })

  it('offers the Chrome extensions page when Chrome limits the check', async () => {
    const { sent } = installChrome(() => ({ status: 'throttled' }))
    const wrapper = mount(Options, { attachTo: document.body })
    await flushPromises()
    await button(wrapper, 'Check for updates')!.trigger('click')
    await flushPromises()
    expect(button(wrapper, 'Check for updates')).toBeUndefined()
    const update = button(wrapper, 'Update in Chrome')!
    expect(update.attributes('title')).toBe('Turn on Developer mode there, then press Update')
    await update.trigger('click')
    expect(sent.at(-1)).toEqual({ type: 'extensions-page' })
  })

  it('offers a restart once the update is downloaded, and restarts on click', async () => {
    const { store, sent } = installChrome()
    store.updateReady = '1.2.0'
    const wrapper = mount(Options, { attachTo: document.body })
    await flushPromises()
    expect(about(wrapper).text()).toContain('Update ready')
    expect(about(wrapper).text()).toContain('Reload open GitHub tabs afterwards.')
    expect(button(wrapper, 'Check for updates')).toBeUndefined()
    await button(wrapper, 'Restart to update to 1.2.0')!.trigger('click')
    expect(sent).toContainEqual({ type: 'apply-update' })
  })
})
