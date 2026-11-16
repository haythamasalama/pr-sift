import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import UpdateNotice from '../../../src/features/updates/UpdateNotice.vue'
import { CHANGELOG_URL } from '../../../src/lib/updates'
import { installChrome } from '../../helpers/chrome'

describe('UpdateNotice', () => {
  it('says which version was installed and links to what is new', async () => {
    const { store } = installChrome()
    store.updated = { version: '1.2.0', previous: '1.1.0' }
    const wrapper = mount(UpdateNotice)
    await flushPromises()
    expect(wrapper.text()).toContain('PR Sift was updated to 1.2.0.')
    const link = wrapper.find('a')
    expect(link.text()).toBe('What’s new')
    expect(link.attributes('href')).toBe(CHANGELOG_URL)
    expect(link.attributes('target')).toBe('_blank')
  })

  it('goes away for good once dismissed', async () => {
    const { store } = installChrome()
    store.updated = { version: '1.2.0', previous: '1.1.0' }
    const wrapper = mount(UpdateNotice)
    await flushPromises()
    await wrapper.find('[aria-label="Dismiss"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toBe('')
    expect('updated' in store).toBe(false)
  })

  it('shows nothing when no update was installed', async () => {
    installChrome()
    const wrapper = mount(UpdateNotice)
    await flushPromises()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})
