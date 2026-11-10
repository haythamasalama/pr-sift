import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FileCard from '../../src/content/components/FileCard.vue'
import { notesContext, provideContext } from '../helpers/context'
import { file } from '../helpers/fixtures'

const mountCard = (props: { viewed?: boolean; stale?: boolean } = {}) =>
  mount(FileCard, {
    props: { file: file('src/Domain/Order/A.php', { additions: 4, deletions: 2 }), viewed: false, ...props },
    global: { provide: provideContext(notesContext()) },
  })

describe('FileCard', () => {
  it('shows the path, status and change counts', () => {
    const wrapper = mountCard()
    const text = wrapper.text()
    expect(text).toContain('src/Domain/Order/A.php')
    expect(text).toContain('+4')
    expect(text).toContain('−2')
    expect(wrapper.find('[aria-label="modified"]').exists()).toBe(true)
  })

  it('emits viewed when the checkbox is toggled', async () => {
    const wrapper = mountCard()
    await wrapper.find('[role=checkbox]').trigger('click')
    expect(wrapper.emitted('viewed')).toEqual([[true]])
  })

  it('reflects the viewed state', () => {
    expect(mountCard({ viewed: true }).find('[role=checkbox]').attributes('aria-checked')).toBe('true')
  })

  it('warns when the file changed after it was viewed', () => {
    expect(mountCard({ stale: true }).text()).toContain('Updated since viewed')
    expect(mountCard().text()).not.toContain('Updated since viewed')
  })

  it('collapses the body of a viewed file and restores it when unmarked', async () => {
    const wrapper = mountCard({ viewed: true })
    expect(wrapper.find('[aria-label="Expand file"]').exists()).toBe(true)
    await wrapper.setProps({ viewed: false })
    expect(wrapper.find('[aria-label="Collapse file"]').exists()).toBe(true)
  })

  it('offers copy actions and a per-file diff mode toggle', () => {
    const wrapper = mountCard()
    expect(wrapper.find('[aria-label="Copy"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Show this file as split"]').exists()).toBe(true)
  })

  it('does not offer a diff mode toggle for files without a patch', () => {
    const wrapper = mount(FileCard, {
      props: { file: file('img/logo.png', { patch: undefined }), viewed: false },
      global: { provide: provideContext(notesContext()) },
    })
    expect(wrapper.find('[aria-label="Show this file as split"]').exists()).toBe(false)
  })
})
