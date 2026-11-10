import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { shallowRef } from 'vue'
import { useNotes } from '../../../src/features/notes/useNotes'
import { installChrome } from '../../helpers/chrome'

const draft = { file: 'a.php', side: 'new' as const, line: 3, lineText: 'x', quote: '', text: 'check' }

describe('useNotes', () => {
  it('adds notes with an id and timestamp and stores them per pull request', async () => {
    const { store } = installChrome()
    const notes = useNotes(shallowRef('o/r#1'))
    await notes.add(draft)
    expect(notes.notes.value).toHaveLength(1)
    expect(notes.notes.value[0]).toMatchObject({ ...draft, text: 'check' })
    expect(notes.notes.value[0]!.id).toBeTruthy()
    expect(store['notes:o/r#1']).toHaveLength(1)
  })

  it('updates, marks as posted and removes a note', async () => {
    installChrome()
    const notes = useNotes(shallowRef('o/r#1'))
    await notes.add(draft)
    const id = notes.notes.value[0]!.id
    await notes.update(id, { text: 'changed' })
    expect(notes.notes.value[0]!.text).toBe('changed')
    await notes.update(id, { line: 9, startLine: 7 })
    expect(notes.notes.value[0]).toMatchObject({ text: 'changed', line: 9, startLine: 7 })
    await notes.markPosted(id, 'https://github.com/x')
    expect(notes.notes.value[0]!.postedUrl).toBe('https://github.com/x')
    await notes.remove(id)
    expect(notes.notes.value).toEqual([])
  })

  it('loads saved notes for the current pull request', async () => {
    const { store } = installChrome()
    store['notes:o/r#2'] = [{ ...draft, id: 'n1', createdAt: 1 }]
    const notes = useNotes(shallowRef('o/r#2'))
    await flushPromises()
    expect(notes.notes.value.map((n) => n.id)).toEqual(['n1'])
  })

  it('clears all notes', async () => {
    installChrome()
    const notes = useNotes(shallowRef('o/r#1'))
    await notes.add(draft)
    await notes.add(draft)
    await notes.clear()
    expect(notes.notes.value).toEqual([])
  })

  it('keeps notes written from two tabs on the same pull request', async () => {
    const { store } = installChrome()
    const first = useNotes(shallowRef('o/r#1'))
    const second = useNotes(shallowRef('o/r#1'))
    await flushPromises()
    await first.add({ ...draft, text: 'from tab one' })
    await second.add({ ...draft, text: 'from tab two' })
    expect((store['notes:o/r#1'] as { text: string }[]).map((n) => n.text)).toEqual(['from tab one', 'from tab two'])
  })
})
