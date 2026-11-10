import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import DiffTable from '../../../src/features/diff/DiffTable.vue'
import type { Note } from '../../../src/lib/types'
import { notesContext, provideContext } from '../../helpers/context'

const patch = '@@ -1,3 +1,3 @@\n ctx\n-old\n+new\n tail'

const mountTable = (mode: 'unified' | 'split', notes: Note[] = [], context = notesContext({}, notes)) => {
  const wrapper = mount(DiffTable, {
    props: { filename: 'a.php', patch, mode },
    global: { provide: provideContext(context, mode) },
    attachTo: document.body,
  })
  return { wrapper, context }
}

describe('DiffTable', () => {
  it('hides resolved notes unless asked to show them', async () => {
    const resolved = {
      id: 'r',
      file: 'a.php',
      side: 'new',
      line: 1,
      lineText: '',
      quote: '',
      text: 'done',
      createdAt: 0,
      resolved: true,
    } as Note
    const context = notesContext({}, [resolved])
    const { wrapper } = mountTable('unified', [resolved], context)
    expect(wrapper.text()).not.toContain('done')
    context.showResolved.value = true
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('done')
    expect(wrapper.find('[aria-label="Reopen note"]').exists()).toBe(true)
  })

  it('selects several lines by dragging from the gutter button', async () => {
    const { wrapper, context } = mountTable('unified')
    const buttons = wrapper.findAll('[aria-label="Add a private note"]')
    await buttons[0]!.trigger('mousedown')
    await wrapper.findAll('tbody tr')[3]!.trigger('mouseover')
    document.dispatchEvent(new MouseEvent('mouseup'))
    await vi.waitFor(() => expect(wrapper.find('textarea').exists()).toBe(true))
    expect(wrapper.text()).toContain('Lines 1–2')
    await wrapper.find('textarea').setValue('range note')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save note')!
      .trigger('click')
    await vi.waitFor(() => expect(context.add).toHaveBeenCalled())
    expect(context.add).toHaveBeenCalledWith(expect.objectContaining({ side: 'new', startLine: 1, line: 2, text: 'range note' }))
  })

  it('renders one row per patch line in unified mode', () => {
    const { wrapper } = mountTable('unified')
    expect(wrapper.findAll('tbody tr')).toHaveLength(5)
    expect(wrapper.find('table.table-fixed').exists()).toBe(false)
  })

  it('renders side-by-side rows in split mode', () => {
    const { wrapper } = mountTable('split')
    expect(wrapper.find('table.table-fixed').exists()).toBe(true)
    expect(wrapper.findAll('tbody tr')).toHaveLength(4)
  })

  it('numbers the lines', () => {
    const { wrapper } = mountTable('unified')
    const cells = wrapper.findAll('tbody tr')[2]!.findAll('td')
    expect(cells[1]!.text()).toBe('2')
    expect(cells[2]!.text()).toBe('')
  })

  it('opens an editor from the gutter button and saves a note against the line', async () => {
    const { wrapper, context } = mountTable('unified')
    await wrapper.findAll('[aria-label="Add a private note"]')[1]!.trigger('click')
    await wrapper.find('textarea').setValue('  Why was this removed?  ')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save note')!
      .trigger('click')
    await vi.waitFor(() => expect(context.add).toHaveBeenCalled())
    expect(context.add).toHaveBeenCalledWith({
      file: 'a.php',
      side: 'old',
      line: 2,
      lineText: 'old',
      quote: '',
      text: 'Why was this removed?',
    })
  })

  it('shows existing notes under the line they belong to', () => {
    const note: Note = { id: 'n', file: 'a.php', side: 'new', line: 2, lineText: 'new', quote: '', text: 'Looks risky', createdAt: 0 }
    const { wrapper } = mountTable('unified', [note])
    expect(wrapper.text()).toContain('Looks risky')
  })

  it('ignores notes that belong to other files', () => {
    const note: Note = { id: 'n', file: 'other.php', side: 'new', line: 2, lineText: '', quote: '', text: 'Not here', createdAt: 0 }
    expect(mountTable('unified', [note]).wrapper.text()).not.toContain('Not here')
  })

  it('collapses very long patches behind a show-all button', async () => {
    const long = '@@ -1,600 +1,600 @@\n' + Array.from({ length: 600 }, (_, i) => `+line ${i}`).join('\n')
    const wrapper = mount(DiffTable, {
      props: { filename: 'a.txt', patch: long, mode: 'unified' },
      global: { provide: provideContext(notesContext()) },
    })
    expect(wrapper.findAll('tbody tr')).toHaveLength(500)
    await wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('Show all'))!
      .trigger('click')
    expect(wrapper.findAll('tbody tr')).toHaveLength(601)
  })
})
