import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsForm from '../../../src/features/settings/SettingsForm.vue'
import type { SettingsSectionId } from '../../../src/features/settings/sections'
import { SAVE_DELAY } from '../../../src/features/settings/useDraft'
import { DEFAULTS } from '../../../src/lib/settings'
import type { Settings } from '../../../src/lib/types'
import { installChrome } from '../../helpers/chrome'

type Wrapper = VueWrapper<InstanceType<typeof SettingsForm>>

let store: Record<string, unknown>

async function mountForm(stored: Record<string, unknown> = {}, props: { section?: SettingsSectionId } = {}) {
  store = installChrome().store
  Object.assign(store, stored)
  const wrapper = mount(SettingsForm, { props, attachTo: document.body }) as Wrapper
  await flushPromises()
  return wrapper
}

const saved = () => (store.settings ?? {}) as Partial<Settings>
const section = (wrapper: Wrapper, id: string) => wrapper.find(`[data-section="${id}"]`)
const buttonIn = (wrapper: Wrapper, id: string, label: string) =>
  section(wrapper, id)
    .findAll('button')
    .find((b) => b.text().includes(label) || b.attributes('aria-label') === label)

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('SettingsForm', () => {
  it('lays sections out as a header with rows, not cards', async () => {
    const wrapper = await mountForm()
    const theme = section(wrapper, 'theme')
    expect(theme.find('h2').text()).toBe('Theme')
    expect(theme.find('svg[data-area="all"]').exists()).toBe(true)
    expect(section(wrapper, 'filters').find('svg[data-area="toolbar"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="card"]').exists()).toBe(false)
  })

  it('saves switches, toggles and checkboxes as soon as they change', async () => {
    const wrapper = await mountForm()
    await section(wrapper, 'defaults').find('#settings-review-mode').trigger('click')
    await buttonIn(wrapper, 'defaults', 'Split')!.trigger('click')
    await buttonIn(wrapper, 'merging', 'Rebase')!.trigger('click')
    await section(wrapper, 'tree').find('#settings-tree-guides').trigger('click')
    await section(wrapper, 'hidden').find('#settings-status-removed').trigger('click')
    await flushPromises()
    expect(saved()).toMatchObject({
      reviewMode: false,
      diffView: 'split',
      mergeMethod: 'rebase',
      treeGuides: false,
      hideStatuses: ['removed'],
    })
  })

  it('saves the theme from its toggle', async () => {
    const wrapper = await mountForm()
    await buttonIn(wrapper, 'theme', 'Dark')!.trigger('click')
    await flushPromises()
    expect(saved().theme).toBe('dark')
  })

  it('saves path patterns after a pause in typing, one per line', async () => {
    const wrapper = await mountForm()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await wrapper.find('#settings-hide').setValue('**/*.lock\n\n  dist/**  \n')
    await flushPromises()
    expect(saved().hide).toBeUndefined()
    await vi.advanceTimersByTimeAsync(SAVE_DELAY)
    await flushPromises()
    expect(saved().hide).toEqual(['**/*.lock', 'dist/**'])
  })

  it('saves a text area right away when it loses focus', async () => {
    const wrapper = await mountForm()
    const field = wrapper.find('#settings-removed-co-authors')
    await field.setValue('bot@example.com')
    await field.trigger('blur')
    await flushPromises()
    expect(saved().removedCoAuthors).toEqual(['bot@example.com'])
  })

  it('saves text that is still waiting when the form closes', async () => {
    const wrapper = await mountForm()
    await wrapper.find('#settings-hide').setValue('build/**')
    wrapper.unmount()
    await flushPromises()
    expect(saved().hide).toEqual(['build/**'])
  })

  it('shows the stored settings', async () => {
    const wrapper = await mountForm({ settings: { hide: ['vendor/**'], reviewMode: false, mergeMethod: 'merge' } })
    expect((wrapper.find('#settings-hide').element as HTMLTextAreaElement).value).toBe('vendor/**')
    expect(wrapper.find('#settings-review-mode').attributes('data-state')).toBe('unchecked')
    expect(buttonIn(wrapper, 'merging', 'Merge')!.attributes('data-state')).toBe('on')
  })

  it('resets every setting only on the second click', async () => {
    const wrapper = await mountForm({ settings: { reviewMode: false, hide: [] } })
    const reset = () => wrapper.findAll('button').find((b) => /reset/i.test(b.text()))!
    await reset().trigger('click')
    expect(reset().text()).toContain('Click again to reset')
    expect('settings' in store).toBe(true)
    await reset().trigger('click')
    await flushPromises()
    expect('settings' in store).toBe(false)
    expect(wrapper.text()).toContain('Settings reset to defaults')
    expect(wrapper.find('#settings-review-mode').attributes('data-state')).toBe('checked')
    expect((wrapper.find('#settings-hide').element as HTMLTextAreaElement).value).toBe(DEFAULTS.hide.join('\n'))
  })
})

describe('SettingsForm token', () => {
  it('saves a trimmed token only when Save is pressed', async () => {
    const wrapper = await mountForm()
    const save = () => buttonIn(wrapper, 'token', 'Save')!
    expect(save().attributes('disabled')).toBeDefined()
    await wrapper.find('#settings-token').setValue('  github_pat_abc  ')
    expect('token' in store).toBe(false)
    await save().trigger('click')
    await flushPromises()
    expect(store.token).toBe('github_pat_abc')
    expect(section(wrapper, 'token').text()).toContain('Token saved')
    expect(save().attributes('disabled')).toBeDefined()
  })

  it('removes a stored token', async () => {
    const wrapper = await mountForm({ token: 'github_pat_old' })
    expect((wrapper.find('#settings-token').element as HTMLInputElement).value).toBe('github_pat_old')
    expect(wrapper.find('#settings-token').attributes('type')).toBe('password')
    await buttonIn(wrapper, 'token', 'Remove')!.trigger('click')
    await flushPromises()
    expect('token' in store).toBe(false)
    expect((wrapper.find('#settings-token').element as HTMLInputElement).value).toBe('')
    expect(buttonIn(wrapper, 'token', 'Remove')).toBeUndefined()
    expect(section(wrapper, 'token').text()).toContain('Token removed')
  })
})

describe('SettingsForm sections', () => {
  let scrolled: Element[]

  beforeEach(() => {
    scrolled = []
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (this: Element) {
      scrolled.push(this)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('scrolls to the section it opens on and focuses its title', async () => {
    const wrapper = await mountForm({}, { section: 'merging' })
    expect(scrolled).toEqual([section(wrapper, 'merging').element])
    expect(document.activeElement).toBe(section(wrapper, 'merging').find('h2').element)
  })

  it('scrolls to a section on request', async () => {
    const wrapper = await mountForm()
    expect(scrolled).toEqual([])
    wrapper.vm.scrollToSection('help')
    expect(scrolled).toEqual([section(wrapper, 'help').element])
    await wrapper.setProps({ section: 'token' })
    expect(scrolled.at(-1)).toBe(section(wrapper, 'token').element)
  })
})
