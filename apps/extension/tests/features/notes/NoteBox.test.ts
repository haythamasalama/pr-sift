import { mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import NoteBox from '../../../src/features/notes/NoteBox.vue'
import type { Note } from '../../../src/lib/types'
import { notesContext, provideContext } from '../../helpers/context'

const note: Note = { id: 'n1', file: 'a.php', side: 'new', line: 3, lineText: 'x', quote: 'x', text: 'Rename this', createdAt: 0 }

const mountBox = (context = notesContext(), value: Note = note) =>
  mount(NoteBox, { props: { note: value }, global: { provide: provideContext(context) } })

const post = (wrapper: ReturnType<typeof mountBox>) => wrapper.find('[aria-label="Post to GitHub"]')

describe('NoteBox', () => {
  it('shows the note and the quoted code', () => {
    const wrapper = mountBox()
    expect(wrapper.text()).toContain('Rename this')
    expect(wrapper.text()).toContain('x')
  })

  it('posts to the team in one click', async () => {
    const context = notesContext({ canPost: shallowRef(true) })
    const wrapper = mountBox(context)
    await post(wrapper).trigger('click')
    await vi.waitFor(() => expect(context.post).toHaveBeenCalledWith(note))
  })

  it('opens the line on GitHub instead when there is no token', async () => {
    const context = notesContext({ canPost: shallowRef(false) })
    const wrapper = mountBox(context)
    await post(wrapper).trigger('click')
    expect(context.openOnGithub).toHaveBeenCalledWith(note)
    expect(context.post).not.toHaveBeenCalled()
  })

  it('shows the API error when posting fails', async () => {
    const context = notesContext({
      canPost: shallowRef(true),
      post: vi.fn(async () => Promise.reject(new Error('422: Line could not be resolved'))),
    })
    const wrapper = mountBox(context)
    await post(wrapper).trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('422: Line could not be resolved'))
  })

  it('hides the post button once posted', () => {
    const wrapper = mountBox(notesContext({ canPost: shallowRef(true) }), { ...note, postedUrl: 'https://github.com/o/r/pull/1#c1' })
    expect(post(wrapper).exists()).toBe(false)
  })

  it('deletes the note', async () => {
    const context = notesContext()
    const wrapper = mountBox(context)
    await wrapper.find('[aria-label="Delete note"]').trigger('click')
    expect(context.remove).toHaveBeenCalledWith('n1')
  })
})
