import { enableAutoUnmount, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsForm from '../../../src/features/settings/SettingsForm.vue'
import type { SettingsSectionId } from '../../../src/features/settings/sections'
import { SAVE_DELAY } from '../../../src/features/settings/useDraft'
import type { PrFile, Settings } from '../../../src/lib/types'
import { file } from '@pr-sift/core/testing'
import { installChrome } from '../../helpers/chrome'

type Wrapper = VueWrapper<InstanceType<typeof SettingsForm>>
type Responder = Parameters<typeof installChrome>[0]

let store: Record<string, unknown>

async function mountForm(
  stored: Record<string, unknown> = {},
  props: { section?: SettingsSectionId; files?: PrFile[]; layout?: 'tabs' | 'page' } = {},
  responder?: Responder,
) {
  store = installChrome(responder).store
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

async function addChip(wrapper: Wrapper, label: string, value: string) {
  const input = wrapper.find(`input[aria-label="Add to ${label}"]`)
  await input.setValue(value)
  await input.element.closest('form')!.dispatchEvent(new Event('submit'))
  await flushPromises()
}

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('SettingsForm', () => {
  it('groups settings by what you want to do, starts on GitHub and keeps About last', async () => {
    const wrapper = await mountForm()
    expect(wrapper.findAll('[role="tab"]').map((b) => b.text())).toEqual(['GitHub', 'Reviewing', 'Files', 'Appearance', 'About'])
    const visible = () =>
      wrapper
        .findAll('section[data-section]')
        .filter((s) => s.isVisible())
        .map((s) => s.attributes('data-section'))
    expect(visible()).toEqual(['github'])
    await wrapper.findAll('[role="tab"]')[1]!.trigger('click')
    expect(visible()).toEqual(['review'])
    expect(wrapper.findAll('[role="tab"]')[1]!.attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[data-slot="card"]').exists()).toBe(false)
  })

  it('marks new settings until each is used once', async () => {
    const wrapper = await mountForm()
    const marked = () => wrapper.findAll('[data-new-dot]').length
    expect(marked()).toBe(4)
    await wrapper.find('#settings-auto-open').trigger('click')
    await flushPromises()
    expect(marked()).toBe(3)
    expect(store.seenNew).toEqual(['auto-open'])

    const again = await mountForm({ seenNew: ['auto-open', 'co-authors'] })
    expect(again.findAll('[data-new-dot]').length).toBe(2)
  })

  it('saves switches, choices and checkboxes as soon as they change', async () => {
    const wrapper = await mountForm()
    await wrapper.find('#settings-auto-open').trigger('click')
    await wrapper.find('#settings-review-mode').trigger('click')
    await wrapper.find('#settings-diff-split').trigger('click')
    await wrapper.find('#settings-merge-rebase').trigger('click')
    await wrapper.find('#settings-show-resolved').trigger('click')
    await wrapper.find('#settings-tree-guides').trigger('click')
    await wrapper.find('#settings-status-removed').trigger('click')
    await flushPromises()
    expect(saved()).toMatchObject({
      autoOpen: true,
      reviewMode: false,
      diffView: 'split',
      mergeMethod: 'rebase',
      showResolved: true,
      treeGuides: false,
      hideStatuses: ['removed'],
    })
  })

  it('picks the theme from preview cards', async () => {
    const wrapper = await mountForm()
    expect(section(wrapper, 'appearance').findAll('.ps-root.dark')).toHaveLength(2)
    await wrapper.find('#settings-theme-dark').trigger('click')
    await flushPromises()
    expect(saved().theme).toBe('dark')
  })

  it('adds and removes hidden paths and co-authors as chips', async () => {
    const wrapper = await mountForm({ settings: { hide: ['**/*.lock'], removedCoAuthors: ['claude'] } })
    await addChip(wrapper, 'hidden paths', 'vendor/**')
    expect(saved().hide).toEqual(['**/*.lock', 'vendor/**'])
    await wrapper.find('button[aria-label="Remove **/*.lock"]').trigger('click')
    await flushPromises()
    expect(saved().hide).toEqual(['vendor/**'])
    await buttonIn(wrapper, 'merging', 'Edit the list')!.trigger('click')
    await flushPromises()
    await addChip(wrapper, 'co-authors to leave out', 'bot@example.com')
    expect(saved().removedCoAuthors).toEqual(['claude', 'bot@example.com'])
  })

  it('turns AI co-authors off with one switch, with the list closed below it', async () => {
    const wrapper = await mountForm()
    expect(section(wrapper, 'merging').text()).toContain('Claude, ChatGPT, Gemini, Copilot and other AI tools start unchecked')
    const listInput = () => wrapper.find('input[aria-label="Add to co-authors to leave out"]')
    expect(listInput().exists()).toBe(false)
    await buttonIn(wrapper, 'merging', 'Edit the list')!.trigger('click')
    await flushPromises()
    expect(listInput().exists()).toBe(true)
    await wrapper.find('#settings-leave-out').trigger('click')
    await flushPromises()
    expect(saved().leaveOutCoAuthors).toBe(false)
    expect(section(wrapper, 'merging').text()).not.toContain('Edit the list')
  })

  it('counts what the rules hide and what each saved filter matches in this pull request', async () => {
    const files = [file('composer.lock'), file('src/A.php'), file('src/B.php', { status: 'removed' }), file('web/app.ts')]
    const wrapper = await mountForm(
      { settings: { hide: ['**/*.lock'], hideStatuses: ['removed'], presets: [{ name: 'PHP', include: ['**/*.php'] }] } },
      { files },
    )
    expect(section(wrapper, 'hidden').text()).toContain('Hides 2 files in this pull request')
    expect(section(wrapper, 'filters').text()).toContain('Matches 2 files in this pull request')
  })

  it('previews the folder indentation in a small tree', async () => {
    const wrapper = await mountForm({ settings: { treeIndent: 14, treeGuides: false } })
    const levels = section(wrapper, 'tree').findAll('.ml-3')
    expect(levels).toHaveLength(3)
    expect(levels.every((l) => (l.element as HTMLElement).style.paddingLeft === '14px')).toBe(true)
    expect(levels[0]!.classes()).toContain('border-transparent')
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
  })
})

describe('SettingsForm connection', () => {
  const github: Responder = (message) =>
    message.path === '/user'
      ? { ok: true, status: 200, data: { login: 'sam', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' } }
      : { ok: false, status: 404, data: {} }

  it('connects with a trimmed token and says who you are', async () => {
    const wrapper = await mountForm({}, { layout: 'page' }, github)
    await wrapper.find('#settings-token').setValue('  github_pat_abc  ')
    expect('token' in store).toBe(false)
    await buttonIn(wrapper, 'token', 'Connect')!.trigger('click')
    await flushPromises()
    expect(store.token).toBe('github_pat_abc')
    expect(section(wrapper, 'token').text()).toContain('Connected as @sam')
    expect(wrapper.find('#settings-token').exists()).toBe(false)
  })

  it('says why GitHub refused the token', async () => {
    const wrapper = await mountForm({ token: 'github_pat_old' }, {}, () => ({
      ok: false,
      status: 401,
      data: { message: 'Bad credentials' },
    }))
    expect(section(wrapper, 'token').text()).toContain('GitHub didn’t accept this token')
    expect(section(wrapper, 'token').text()).toContain('Bad credentials')
  })

  it('sends you to PR Sift’s own page to type a token from inside the review', async () => {
    const wrapper = await mountForm({}, {}, github)
    expect(wrapper.find('#settings-token').exists()).toBe(false)
    await buttonIn(wrapper, 'token', 'Add a token')!.trigger('click')
    expect(vi.mocked(chrome.runtime.sendMessage).mock.calls.map(([message]) => message)).toContainEqual({
      type: 'options',
      section: 'token',
    })
  })

  it('removes a stored token', async () => {
    const wrapper = await mountForm({ token: 'github_pat_old' }, { layout: 'page' }, github)
    await buttonIn(wrapper, 'token', 'Remove')!.trigger('click')
    await flushPromises()
    expect('token' in store).toBe(false)
    expect(wrapper.find('#settings-token').exists()).toBe(true)
    expect(section(wrapper, 'token').text()).toContain('Token removed')
  })
})

describe('SettingsForm saved filters', () => {
  const rows = (wrapper: Wrapper) => section(wrapper, 'filters').findAll('[data-filter]')
  const example = (wrapper: Wrapper, name: string) => buttonIn(wrapper, 'filters', `Add the ${name} example`)

  it('edits the stored presets as a list, with no JSON', async () => {
    const wrapper = await mountForm({ settings: { presets: [{ name: 'API', include: ['api/**', 'routes/**'], includeHidden: true }] } })
    expect(section(wrapper, 'filters').find('h3').text()).toBe('Saved filters')
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

  enableAutoUnmount(afterEach)

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
    expect(document.activeElement).toBe(section(wrapper, 'merging').find('h3').element)
  })

  it('opens the co-author list when asked for the merging settings', async () => {
    const wrapper = await mountForm({}, { section: 'merging' })
    expect(wrapper.find('input[aria-label="Add to co-authors to leave out"]').exists()).toBe(true)
  })

  it('opens the tab of a section on request and scrolls to it', async () => {
    const wrapper = await mountForm()
    expect(scrolled).toEqual([])
    await wrapper.vm.scrollToSection('hidden')
    expect(section(wrapper, 'files').isVisible()).toBe(true)
    expect(section(wrapper, 'github').isVisible()).toBe(false)
    expect(scrolled).toEqual([section(wrapper, 'hidden').element])
    await wrapper.setProps({ section: 'tree' })
    await flushPromises()
    expect(section(wrapper, 'appearance').isVisible()).toBe(true)
    expect(scrolled.at(-1)).toBe(section(wrapper, 'tree').element)
  })
})
