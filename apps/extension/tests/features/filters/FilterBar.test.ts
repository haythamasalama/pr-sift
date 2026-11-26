import { flushPromises, mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import FilterBar from '../../../src/features/filters/FilterBar.vue'
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
      diffMode: 'unified' as const,
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
        diffMode: 'unified' as const,
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
        diffMode: 'unified' as const,
      },
    })
    const labels = wrapper.findAll('button').map((b) => b.text())
    const reset = labels.findIndex((t) => t.includes('Reset filters'))
    const lastChip = labels.findIndex((t) => t.includes('deleted'))
    expect(reset).toBeGreaterThan(lastChip)
  })

  it('shows the include state with the primary variant', () => {
    expect(button(mountBar(), '.ts').attributes('data-variant')).toBe('default')
    expect(button(mountBar(), '.php').attributes('data-variant')).toBe('outline')
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

  it('lists saved filters after the types and hides one on right-click', async () => {
    const wrapper = mount(FilterBar, {
      props: {
        chips,
        listedCount: 4,
        viewedInView: [],
        hiddenCount: 0,
        filtersActive: false,
        reviewMode: false,
        showHidden: false,
        diffMode: 'unified' as const,
        presets: [{ name: 'Tests', include: ['tests/**'] }],
        hiddenPresets: ['Tests'],
      },
      global: { provide: { [portalTargetKey as symbol]: shallowRef(document.createElement('div')) } },
    })
    const texts = wrapper.findAll('button').map((b) => b.text())
    expect(texts.findIndex((t) => t.startsWith('.php'))).toBeLessThan(texts.indexOf('Tests'))
    const button = wrapper.findAll('button').find((b) => b.text() === 'Tests')!
    expect(button.classes()).toContain('line-through')
    await button.trigger('contextmenu')
    expect(wrapper.emitted('hidePreset')).toEqual([['Tests']])
    await button.trigger('click')
    expect(wrapper.emitted('selectPreset')).toEqual([['Tests']])
  })

  it('shows the hidden count only when files are hidden', async () => {
    const none = mountBar()
    await none.setProps({ hiddenCount: 0 })
    expect(none.text()).not.toContain('hidden')
    await none.setProps({ hiddenCount: 2 })
    const button = none.findAll('button').find((b) => b.text().includes('2 hidden'))!
    await button.trigger('click')
    expect(none.emitted('update:showHidden')).toEqual([[true]])
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
        diffMode: 'unified' as const,
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

  it('folds types after the first six behind "+N more" and keeps a chosen one visible', async () => {
    const many: ExtChip[] = ['.a', '.b', '.c', '.d', '.e', '.f', '.g', '.h'].map((ext, i) => ({
      ext,
      label: ext,
      count: 10 - i,
      custom: false,
      ...(ext === '.h' ? { state: 'include' as const } : {}),
    }))
    const wrapper = mount(FilterBar, {
      props: {
        chips: many,
        listedCount: 8,
        viewedInView: [],
        hiddenCount: 0,
        filtersActive: false,
        reviewMode: false,
        showHidden: false,
        diffMode: 'unified' as const,
      },
    })
    expect(wrapper.text()).not.toContain('.g')
    expect(wrapper.text()).toContain('.h')
    await button(wrapper, '+1 more').trigger('click')
    expect(wrapper.text()).toContain('.g')
    expect(wrapper.text()).toContain('Show less')
  })

  it('offers the viewed list only while viewed files are hidden', async () => {
    const wrapper = mountBar()
    expect(wrapper.text()).toContain('Viewed')
    await wrapper.setProps({ reviewMode: false })
    expect(wrapper.findAll('button').some((b) => /^Viewed/.test(b.text()))).toBe(false)
  })
})
