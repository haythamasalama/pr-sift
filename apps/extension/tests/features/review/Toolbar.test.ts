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

async function openMenu(provide: Record<symbol, unknown> = {}) {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const wrapper = mount(Toolbar, {
    props,
    global: { provide: { [portalTargetKey as symbol]: shallowRef(target), ...provide } },
    attachTo: document.body,
  })
  await flushPromises()
  await wrapper.find('[aria-label^="Options"]').trigger('keydown', { key: 'Enter' })
  await vi.waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeNull())
  return wrapper
}

const item = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) => el.textContent?.includes(label))

describe('Toolbar settings menu', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('sends help and feedback to the About settings', async () => {
    installChrome()
    const openSettings = vi.fn()
    const wrapper = await openMenu({ [settingsOpenerKey as symbol]: openSettings })
    expect(wrapper.find('[aria-label="Options"]').exists()).toBe(true)
    expect(item('Restart to update')).toBeUndefined()
    expect(item('Report a problem')).toBeUndefined()
    item('Help and feedback')!.click()
    expect(openSettings).toHaveBeenCalledWith('about')
  })

  it('marks the settings button and offers a restart once an update is ready', async () => {
    const { store, sent } = installChrome()
    store.updateReady = '1.2.0'
    const wrapper = await openMenu()
    expect(wrapper.find('[aria-label="Options, update ready"]').exists()).toBe(true)
    item('Restart to update to 1.2.0')!.click()
    expect(sent).toContainEqual({ type: 'apply-update' })
  })
})
