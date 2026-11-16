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

describe('SettingsForm saved filters', () => {
  const rows = (wrapper: Wrapper) => section(wrapper, 'filters').findAll('[data-filter]')
  const example = (wrapper: Wrapper, name: string) => buttonIn(wrapper, 'filters', `Add the ${name} example`)

  it('edits the stored presets as a list, with no JSON', async () => {
    const wrapper = await mountForm({ settings: { presets: [{ name: 'API', include: ['api/**', 'routes/**'], includeHidden: true }] } })
    expect(section(wrapper, 'filters').find('h2').text()).toBe('Saved filters')
    expect(section(wrapper, 'filters').text()).not.toContain('JSON')
    const [row] = rows(wrapper)
    expect((row!.find('input').element as HTMLInputElement).value).toBe('API')
    expect((row!.find('textarea').element as HTMLTextAreaElement).value).toBe('api/**\nroutes/**')
    expect(row!.find('[role="switch"]').attributes('data-state')).toBe('checked')
  })

  it('adds a filter once it has a name and a path', async () => {
    const wrapper = await mountForm()
    await buttonIn(wrapper, 'filters', 'Add filter')!.trigger('click')
    await flushPromises()
    const [row] = rows(wrapper)
    expect(document.activeElement).toBe(row!.find('input').element)

    await row!.find('input').setValue('Go')
    await row!.find('input').trigger('blur')
    await flushPromises()
    expect(saved().presets).toBeUndefined()
    expect(row!.text()).toContain('Needs a name and at least one path')

    await row!.find('textarea').setValue('**/*.go\n\ncmd/**')
    await row!.find('textarea').trigger('blur')
    await flushPromises()
    expect(saved().presets).toEqual([{ name: 'Go', include: ['**/*.go', 'cmd/**'], includeHidden: false }])
  })

  it('saves edits after a pause, and the hidden files switch right away', async () => {
    const wrapper = await mountForm({ settings: { presets: [{ name: 'API', include: ['api/**'] }] } })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await rows(wrapper)[0]!.find('input').setValue('Server')
    await vi.advanceTimersByTimeAsync(SAVE_DELAY)
    await flushPromises()
    expect(saved().presets).toEqual([{ name: 'Server', include: ['api/**'], includeHidden: false }])

    await rows(wrapper)[0]!.find('[role="switch"]').trigger('click')
    await flushPromises()
    expect(saved().presets).toEqual([{ name: 'Server', include: ['api/**'], includeHidden: true }])
  })

  it('deletes a filter', async () => {
    const wrapper = await mountForm({
      settings: {
        presets: [
          { name: 'API', include: ['api/**'] },
          { name: 'Web', include: ['web/**'] },
        ],
      },
    })
    await buttonIn(wrapper, 'filters', 'Delete API')!.trigger('click')
    await flushPromises()
    expect(rows(wrapper)).toHaveLength(1)
    expect(saved().presets).toEqual([{ name: 'Web', include: ['web/**'], includeHidden: false }])
  })

  it('adds an example in one click and stops offering it', async () => {
    const wrapper = await mountForm()
    for (const name of ['Backend', 'Frontend', 'Tests', 'Docs', 'AI']) expect(example(wrapper, name)).toBeDefined()
    await example(wrapper, 'AI')!.trigger('click')
    await flushPromises()
    expect(saved().presets).toEqual([
      {
        name: 'AI',
        include: ['**/CLAUDE.md', '**/AGENTS.md', '.claude/**', '.cursor/**', '.github/copilot-instructions.md', '**/*.mdc'],
        includeHidden: false,
      },
    ])
    expect(example(wrapper, 'AI')).toBeUndefined()
    expect(example(wrapper, 'Backend')).toBeDefined()
  })

  it('does not offer an example whose name is already used', async () => {
    const wrapper = await mountForm({ settings: { presets: [{ name: 'docs', include: ['handbook/**'] }] } })
    expect(example(wrapper, 'Docs')).toBeUndefined()
    expect(example(wrapper, 'Tests')).toBeDefined()
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
