import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AutoOpenTip from '../../../src/features/review/AutoOpenTip.vue'
import { installChrome } from '../../helpers/chrome'

const button = (wrapper: ReturnType<typeof mount>, text: string) => wrapper.findAll('button').find((b) => b.text() === text)

describe('AutoOpenTip', () => {
  it('offers to open PR Sift on its own while that is off', async () => {
    installChrome()
    const wrapper = mount(AutoOpenTip, { props: { enabled: false } })
    await flushPromises()
    expect(wrapper.text()).toContain('Open PR Sift on its own each time you open a pull request?')
    expect(button(wrapper, 'Always open')).toBeDefined()
  })

  it('turns the setting on and says where to change it', async () => {
    const { store } = installChrome()
    const wrapper = mount(AutoOpenTip, { props: { enabled: false } })
    await flushPromises()
    await button(wrapper, 'Always open')!.trigger('click')
    await flushPromises()
    expect(store.settings).toMatchObject({ autoOpen: true })
    expect(store.autoOpenTipDismissed).toBe(true)
    expect(wrapper.text()).toContain('PR Sift will open on its own on every pull request.')
    expect(button(wrapper, 'Settings')).toBeDefined()
  })

  it('goes away for good once dismissed', async () => {
    const { store } = installChrome()
    const wrapper = mount(AutoOpenTip, { props: { enabled: false } })
    await flushPromises()
    await wrapper.find('[aria-label="Dismiss"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toBe('')
    expect(store.autoOpenTipDismissed).toBe(true)
    expect(store.settings).toBeUndefined()
  })

  it.each([
    ['the setting is already on', true, false],
    ['the tip was dismissed before', false, true],
  ])('stays hidden when %s', async (_case, enabled, dismissed) => {
    const { store } = installChrome()
    if (dismissed) store.autoOpenTipDismissed = true
    const wrapper = mount(AutoOpenTip, { props: { enabled } })
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})
