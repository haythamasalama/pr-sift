import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import FilterBar from '../../src/content/components/FilterBar.vue'
import type { ExtChip } from '../../src/lib/types'

const chips: ExtChip[] = [
  { ext: '.php', label: '.php', count: 3, custom: false },
  { ext: '.ts', label: '.ts', count: 2, state: 'include', custom: false },
  { ext: '.stub', label: '.stub', count: 0, custom: true },
  { ext: 'status:removed', label: 'deleted', count: 1, custom: false },
]

const mountBar = () =>
  mount(FilterBar, {
    props: { chips, listedCount: 4, viewedInViewCount: 2, hiddenCount: 1, filtersActive: false, reviewMode: true, showHidden: false },
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
      props: { chips, listedCount: 4, viewedInViewCount: 2, hiddenCount: 1, filtersActive: true, reviewMode: true, showHidden: false },
    })
    await active
      .findAll('button')
      .find((b) => b.text().includes('Reset filters'))!
      .trigger('click')
    expect(active.emitted('resetFilters')).toHaveLength(1)
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

  it('asks twice before clearing every viewed mark', async () => {
    vi.useFakeTimers()
    const wrapper = mountBar()
    await button(wrapper, 'Clear viewed').trigger('click')
    expect(wrapper.emitted('clearAll')).toBeUndefined()
    await button(wrapper, 'Click again').trigger('click')
    expect(wrapper.emitted('clearAll')).toHaveLength(1)
    vi.useRealTimers()
  })

  it('disables bulk actions when there is nothing to act on', () => {
    const wrapper = mount(FilterBar, {
      props: { chips, listedCount: 0, viewedInViewCount: 0, hiddenCount: 0, filtersActive: false, reviewMode: true, showHidden: false },
    })
    expect(button(wrapper, 'Mark all').attributes('disabled')).toBeDefined()
    expect(button(wrapper, 'Restore').attributes('disabled')).toBeDefined()
  })

  it('emits expand and collapse commands for the file cards', async () => {
    const wrapper = mountBar()
    await wrapper.find('[aria-label="Expand all files"]').trigger('click')
    await wrapper.find('[aria-label="Collapse all files"]').trigger('click')
    expect(wrapper.emitted('expandCards')).toHaveLength(1)
    expect(wrapper.emitted('collapseCards')).toHaveLength(1)
  })
})
