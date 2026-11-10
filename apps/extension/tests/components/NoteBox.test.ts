import { mount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import NoteBox from '../../src/content/components/NoteBox.vue'
import type { Note } from '../../src/lib/types'
import { notesContext, provideContext } from '../helpers/context'

const note: Note = { id: 'n1', file: 'a.php', side: 'new', line: 3, lineText: 'x', quote: 'x', text: 'Rename this', createdAt: 0 }

const mountBox = (context = notesContext(), value: Note = note) =>
  mount(NoteBox, { props: { note: value }, global: { provide: provideContext(context) } })

const post = (wrapper: ReturnType<typeof mountBox>) => wrapper.findAll('button').find((b) => /Post to GitHub|Click again/.test(b.text()))!

describe('NoteBox', () => {
  it('shows the note and the quoted code', () => {
    const wrapper = mountBox()
    expect(wrapper.text()).toContain('Rename this')
    expect(wrapper.text()).toContain('x')
  })

  it('needs a second click before posting to the team', async () => {
    const context = notesContext({ canPost: shallowRef(true) })
    const wrapper = mountBox(context)
    await post(wrapper).trigger('click')
    expect(context.post).not.toHaveBeenCalled()
    expect(post(wrapper).text()).toContain('Click again to post publicly')
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
    await post(wrapper).trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('422: Line could not be resolved'))
  })

  it('shows a link instead of the post button once posted', () => {
    const wrapper = mountBox(notesContext({ canPost: shallowRef(true) }), { ...note, postedUrl: 'https://github.com/o/r/pull/1#c1' })
    expect(wrapper.find('a[href="https://github.com/o/r/pull/1#c1"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Post to GitHub')
  })

  it('deletes the note', async () => {
    const context = notesContext()
    const wrapper = mountBox(context)
    await wrapper.find('[aria-label="Delete note"]').trigger('click')
    expect(context.remove).toHaveBeenCalledWith('n1')
  })
})
