import { enableAutoUnmount, mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import NotesDialog from '../../../src/features/notes/NotesDialog.vue'
import { portalTargetKey } from '../../../src/lib/portal'
import type { Note } from '../../../src/lib/types'
import { PR } from '@pr-sift/core/testing'
import { installChrome } from '../../helpers/chrome'

const note: Note = { id: 'n1', file: 'a.php', side: 'new', line: 3, lineText: '', quote: '', text: 'old text', createdAt: 0 }

enableAutoUnmount(afterEach)

describe('NotesDialog', () => {
  it('edits a note text in place', async () => {
    installChrome()
    const target = document.createElement('div')
    document.body.appendChild(target)
    const wrapper = mount(NotesDialog, {
      props: { pr: PR, title: 'T', notes: [note], files: [] },
      global: { provide: { [portalTargetKey as symbol]: shallowRef(target) } },
      attachTo: document.body,
    })
    await vi.waitFor(() => expect(document.querySelector('[aria-label="Edit note"]')).not.toBeNull())
    document.querySelector<HTMLElement>('[aria-label="Edit note"]')!.click()
    await wrapper.vm.$nextTick()
    const area = document.querySelector<HTMLTextAreaElement>('textarea')!
    area.value = 'new text'
    area.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()
    ;[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Save')!.click()
    expect(wrapper.emitted('update')).toEqual([['n1', { text: 'new text' }]])
  })

  it('turns resolved notes on in the diff from the switch', async () => {
    installChrome()
    const target = document.createElement('div')
    document.body.appendChild(target)
    const wrapper = mount(NotesDialog, {
      props: { pr: PR, title: 'T', notes: [{ ...note, resolved: true }], files: [], showResolved: false },
      global: { provide: { [portalTargetKey as symbol]: shallowRef(target) } },
      attachTo: document.body,
    })
    await vi.waitFor(() => expect(document.querySelector('#show-resolved')).not.toBeNull())
    document.querySelector<HTMLElement>('#show-resolved')!.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:showResolved')).toEqual([[true]])
  })

  it('shows the noted code in color, and the line when nothing was quoted', async () => {
    installChrome()
    const target = document.createElement('div')
    document.body.appendChild(target)
    const quoted = { ...note, id: 'n2', quote: "can('billing')" }
    const lineOnly = { ...note, lineText: '$total = 0;' }
    mount(NotesDialog, {
      props: { pr: PR, title: 'T', notes: [lineOnly, quoted], files: [] },
      global: { provide: { [portalTargetKey as symbol]: shallowRef(target) } },
      attachTo: document.body,
    })
    await vi.waitFor(() => expect(document.querySelectorAll('code').length).toBe(2))
    // highlight.js loads on first use, so the colours come a moment after the text.
    await vi.waitFor(() => {
      const codes = [...document.querySelectorAll('code')].map((c) => c.innerHTML)
      expect(codes.some((html) => html.includes('hljs-string'))).toBe(true)
      expect(codes.some((html) => html.includes('hljs-variable'))).toBe(true)
    })
  })

  it('says what the resolved switch does once it is on', async () => {
    installChrome()
    const target = document.createElement('div')
    document.body.appendChild(target)
    const wrapper = mount(NotesDialog, {
      props: { pr: PR, title: 'T', notes: [{ ...note, resolved: true }], files: [], showResolved: false },
      global: { provide: { [portalTargetKey as symbol]: shallowRef(target) } },
      attachTo: document.body,
    })
    await vi.waitFor(() => expect(document.body.textContent).toContain('Show resolved in the diff (1)'))
    await wrapper.setProps({ showResolved: true })
    expect(document.body.textContent).toContain('Showing 1 resolved in the diff, dimmed')
  })

  it('says when there are no resolved notes to show', async () => {
    installChrome()
    const target = document.createElement('div')
    document.body.appendChild(target)
    mount(NotesDialog, {
      props: { pr: PR, title: 'T', notes: [note], files: [] },
      global: { provide: { [portalTargetKey as symbol]: shallowRef(target) } },
      attachTo: document.body,
    })
    await vi.waitFor(() => expect(document.querySelector('#show-resolved')).not.toBeNull())
    expect(document.querySelector('#show-resolved')!.hasAttribute('disabled')).toBe(true)
    expect(document.body.textContent).toContain('none yet')
  })
})
