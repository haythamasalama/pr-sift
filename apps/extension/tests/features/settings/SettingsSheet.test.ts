import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsSheet from '../../../src/features/settings/SettingsSheet.vue'
import { installChrome } from '../../helpers/chrome'

const content = () => document.querySelector<HTMLElement>('[data-slot="sheet-content"]')
const sectionIn = (id: string) => content()?.querySelector<HTMLElement>(`[data-section="${id}"]`)

describe('SettingsSheet', () => {
  let scrolled: Element[]

  beforeEach(() => {
    installChrome()
    scrolled = []
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (this: Element) {
      scrolled.push(this)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('renders nothing while closed', async () => {
    mount(SettingsSheet, { props: { open: false }, attachTo: document.body })
    await flushPromises()
    expect(content()).toBeNull()
  })

  it('opens on the right with the settings form', async () => {
    const wrapper = mount(SettingsSheet, { props: { open: false }, attachTo: document.body })
    await wrapper.setProps({ open: true })
    await flushPromises()
    expect(content()?.getAttribute('data-side')).toBe('right')
    expect(content()?.getAttribute('role')).toBe('dialog')
    expect(content()?.querySelector('[data-slot="sheet-title"]')?.textContent).toBe('Settings')
    expect(sectionIn('about')).not.toBeNull()
    expect(scrolled).toEqual([])
    wrapper.unmount()
  })

  it('scrolls to the requested section when it opens', async () => {
    const wrapper = mount(SettingsSheet, { props: { open: true, section: 'filters' }, attachTo: document.body })
    await flushPromises()
    expect(scrolled).toEqual([sectionIn('filters')])
    expect(document.activeElement).toBe(sectionIn('filters')?.querySelector('h3'))
    wrapper.unmount()
  })

  it('closes from its close button', async () => {
    const wrapper = mount(SettingsSheet, { props: { open: true }, attachTo: document.body })
    await flushPromises()
    content()!.querySelector<HTMLButtonElement>('[data-slot="sheet-close"]')!.click()
    await flushPromises()
    expect(wrapper.emitted('update:open')).toEqual([[false]])
    wrapper.unmount()
  })
})
