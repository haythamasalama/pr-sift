import { flushPromises, mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import FilterBar from '../../../src/features/filters/FilterBar.vue'
import { settingsOpenerKey } from '../../../src/features/settings/useSettingsOpener'
import { portalTargetKey } from '../../../src/lib/portal'
import type { ExtChip } from '../../../src/lib/types'
import { file } from '@pr-sift/core/testing'

const chips: ExtChip[] = [
  { ext: '.php', label: '.php', count: 3, custom: false },
  { ext: '.ts', label: '.ts', count: 2, state: 'include', custom: false },
  { ext: '.stub', label: '.stub', count: 0, custom: true },
  { ext: 'status:removed', label: 'deleted', count: 1, custom: false },
]

const mountBar = () =>
  mount(FilterBar, {
    props: {
      chips,
      listedCount: 4,
      viewedInView: [file('a.php'), file('b.php')],
      hiddenCount: 1,
      filtersActive: false,
      reviewMode: true,
      showHidden: false,
    },
  })

const button = (wrapper: ReturnType<typeof mountBar>, text: string) => wrapper.findAll('button').find((b) => b.text().includes(text))!

describe('FilterBar', () => {
  it('renders extension chips and the separate status group', () => {
    const wrapper = mountBar()
    expect(wrapper.text()).toContain('.php')
    expect(wrapper.text()).toContain('deleted')
    expect(wrapper.find('[data-slot=separator]').exists()).toBe(true)
  })

  it('emits the chip key when a chip is clicked', async () => {
    const wrapper = mountBar()
    await button(wrapper, '.php').trigger('click')
    await button(wrapper, 'deleted').trigger('click')
    expect(wrapper.emitted('toggleExtension')).toEqual([
      ['.php', false],
      ['status:removed', false],
    ])
  })

  it('asks to always hide a type on shift-click and right-click', async () => {
    const wrapper = mountBar()
    await button(wrapper, '.php').trigger('click', { shiftKey: true })
    await button(wrapper, '.php').trigger('contextmenu')
    expect(wrapper.emitted('toggleExtension')).toEqual([
      ['.php', true],
      ['.php', true],
    ])
  })

  it('offers to reset filters only when some filter is active', async () => {
    const idle = mountBar()
    expect(idle.text()).not.toContain('Reset filters')
    const active = mount(FilterBar, {
      props: {
        chips,
        listedCount: 4,
        viewedInView: [file('a.php'), file('b.php')],
        hiddenCount: 1,
        filtersActive: true,
        reviewMode: true,
        showHidden: false,
      },
    })
    await active
      .findAll('button')
      .find((b) => b.text().includes('Reset filters'))!
      .trigger('click')
    expect(active.emitted('resetFilters')).toHaveLength(1)
  })

  it('shows reset filters after every chip, so the chips do not move when it appears', () => {
    const wrapper = mount(FilterBar, {
      props: {
        chips,
        listedCount: 4,
        viewedInView: [file('a.php')],
        hiddenCount: 1,
        filtersActive: true,
        reviewMode: true,
        showHidden: false,
      },
    })
    const labels = wrapper.findAll('button').map((b) => b.text())
    const reset = labels.findIndex((t) => t.includes('Reset filters'))
    const lastChip = labels.findIndex((t) => t.includes('deleted'))
    expect(reset).toBeGreaterThan(lastChip)
  })

  it('shows the include state with the primary variant', () => {
    expect(button(mountBar(), '.ts').attributes('data-variant')).toBe('default')
    expect(button(mountBar(), '.php').attributes('data-variant')).toBe('secondary')
  })

  it('lets custom types be removed', async () => {
    const wrapper = mountBar()
    await wrapper.find('[aria-label="Remove custom type"]').trigger('click')
    expect(wrapper.emitted('removeExtension')).toEqual([['.stub']])
  })

  it('adds a new type from the inline input', async () => {
    const wrapper = mountBar()
    await button(wrapper, 'type').trigger('click')
    const input = wrapper.find('input')
    await input.setValue('.blade.php')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('addExtension')).toEqual([['.blade.php']])
  })

  it('shows how many files in the view are viewed', () => {
    expect(button(mountBar(), 'Viewed').text()).toContain('2')
  })

  it('disables mark all when there is nothing to act on', () => {
    const wrapper = mount(FilterBar, {
      props: { chips, listedCount: 0, viewedInView: [], hiddenCount: 0, filtersActive: false, reviewMode: true, showHidden: false },
    })
    expect(button(wrapper, 'Mark all').attributes('disabled')).toBeDefined()
  })

  it('emits expand and collapse commands for the file cards', async () => {
    const wrapper = mountBar()
    await wrapper.find('[aria-label="Expand all files"]').trigger('click')
    await wrapper.find('[aria-label="Collapse all files"]').trigger('click')
    expect(wrapper.emitted('expandCards')).toHaveLength(1)
    expect(wrapper.emitted('collapseCards')).toHaveLength(1)
  })

  it('opens the hidden files settings from the Hidden switch', async () => {
    const openSettings = vi.fn()
    const wrapper = mount(FilterBar, {
      props: { chips, listedCount: 4, viewedInView: [], hiddenCount: 1, filtersActive: false, reviewMode: true, showHidden: false },
      global: { provide: { [settingsOpenerKey as symbol]: openSettings } },
    })
    await wrapper.get('button[aria-label="Edit hidden files"]').trigger('click')
    expect(openSettings).toHaveBeenCalledWith('hidden')
  })

  it('saves the current types and folders as a named filter', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    const wrapper = mount(FilterBar, {
      props: {
        chips,
        listedCount: 4,
        viewedInView: [],
        hiddenCount: 1,
        filtersActive: true,
        reviewMode: true,
        showHidden: false,
        viewPatterns: ['src/**/*.ts'],
      },
      global: { provide: { [portalTargetKey as symbol]: shallowRef(target) } },
      attachTo: document.body,
    })
    await button(wrapper, 'Save view').trigger('click')
    await vi.waitFor(() => expect(document.querySelector('input[aria-label="Filter name"]')).not.toBeNull())
    expect(document.body.textContent).toContain('src/**/*.ts')
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Filter name"]')!
    input.value = 'Frontend'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    input.closest('form')!.dispatchEvent(new Event('submit'))
    expect(wrapper.emitted('saveView')).toEqual([['Frontend']])
    wrapper.unmount()
  })

  it('offers Save view only when types or folders are chosen', () => {
    expect(mountBar().text()).not.toContain('Save view')
  })
})
