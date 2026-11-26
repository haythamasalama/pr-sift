import { mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { describe, expect, it } from 'vitest'
import FileCard from '../../../src/features/diff/FileCard.vue'
import { fileContextKey } from '../../../src/features/diff/fileContext'
import { cardsExpandKey, type ExpandCommand } from '../../../src/features/tree/expandContext'
import { notesContext, provideContext } from '../../helpers/context'
import { file } from '@pr-sift/core/testing'

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

  it('follows expand all and collapse all, including cards mounted after the command', async () => {
    const command = shallowRef<ExpandCommand>({ open: true, n: 0 })
    const mountWith = () =>
      mount(FileCard, {
        props: { file: file('src/A.php', { additions: 1 }), viewed: false },
        global: { provide: { ...provideContext(notesContext()), [cardsExpandKey as symbol]: command } },
      })
    const wrapper = mountWith()
    command.value = { open: false, n: 1 }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[aria-label="Expand file"]').exists()).toBe(true)
    expect(mountWith().find('[aria-label="Expand file"]').exists()).toBe(true)
    command.value = { open: true, n: 2 }
    await wrapper.vm.$nextTick()
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

  it('shows how many GitHub comments a file has', async () => {
    const wrapper = mount(FileCard, {
      props: { file: file('src/A.php'), viewed: false },
      global: {
        provide: {
          ...provideContext(notesContext()),
          [fileContextKey as symbol]: {
            canExpand: shallowRef(false),
            loadLines: async () => [],
            githubUrl: async () => 'https://github.com/o/r/pull/7/files#a',
            comments: shallowRef(new Map([['src/A.php', 3]])),
          },
        },
      },
    })
    await wrapper.vm.$nextTick()
    const badge = wrapper.get('button[title^="3 comments on GitHub"]')
    expect(badge.text()).toBe('3')
  })
})
