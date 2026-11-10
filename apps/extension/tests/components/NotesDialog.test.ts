import { mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import NotesDialog from '../../src/content/components/NotesDialog.vue'
import { portalTargetKey } from '../../src/lib/portal'
import type { Note } from '../../src/lib/types'
import { PR } from '@pr-sift/core/testing'

const note: Note = { id: 'n1', file: 'a.php', side: 'new', line: 3, lineText: '', quote: '', text: 'old text', createdAt: 0 }

describe('NotesDialog', () => {
  it('edits a note text in place', async () => {
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
})
