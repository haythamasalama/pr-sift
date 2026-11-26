import { flushPromises, mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Toolbar from '../../../src/features/review/Toolbar.vue'
import { portalTargetKey } from '../../../src/lib/portal'
import { settingsOpenerKey } from '../../../src/features/settings/useSettingsOpener'
import { installChrome } from '../../helpers/chrome'

const props = {
  title: '#1 Title',
  done: 0,
  total: 3,
  inView: 3,
  noteCount: 0,
  compact: false,
  splitDisabled: false,
  diffMode: 'unified' as const,
}

function mountToolbar(provide: Record<symbol, unknown> = {}) {
  return mount(Toolbar, {
    props,
    global: { provide: { [portalTargetKey as symbol]: shallowRef(null), ...provide } },
    attachTo: document.body,
  })
}

describe('Toolbar settings button', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('opens the settings sheet straight away', async () => {
    installChrome()
    const openSettings = vi.fn()
    const wrapper = mountToolbar({ [settingsOpenerKey as symbol]: openSettings })
    await flushPromises()
    await wrapper.find('[aria-label="Settings"]').trigger('click')
    expect(openSettings).toHaveBeenCalledWith(undefined)
    expect(document.querySelector('[role="menu"]')).toBeNull()
  })

  it('marks the button and opens About once an update is ready', async () => {
    const { store } = installChrome()
    store.updateReady = '1.2.0'
    const openSettings = vi.fn()
    const wrapper = mountToolbar({ [settingsOpenerKey as symbol]: openSettings })
    await flushPromises()
    await wrapper.find('[aria-label="Settings, update ready"]').trigger('click')
    expect(openSettings).toHaveBeenCalledWith('about')
  })
})

describe('Toolbar while loading', () => {
  it('shows placeholders instead of the title and the progress', () => {
    installChrome()
    const wrapper = mount(Toolbar, {
      props: { ...props, loading: true },
      global: { provide: { [portalTargetKey as symbol]: shallowRef(null) } },
    })
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('0/3')
    expect(wrapper.findAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(2)
    expect(wrapper.find('[aria-label="Close"]').exists()).toBe(true)
  })
})
