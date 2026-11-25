import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FileTree from '../../../src/features/tree/FileTree.vue'
import { buildTree } from '@pr-sift/core'
import { file } from '@pr-sift/core/testing'

const files = [file('src/Domain/Order/A.php'), file('src/Domain/Order/B.php'), file('src/Domain/Core/C.php'), file('package.json')]

const mountTree = (viewed: string[] = []) =>
  mount(FileTree, {
    props: { tree: buildTree(files), selected: '', isViewed: (f) => viewed.includes(f.filename) },
    attachTo: document.body,
  })

const fileRows = (wrapper: ReturnType<typeof mountTree>) => wrapper.findAll('[title$=".php"], [title="package.json"]')

describe('FileTree', () => {
  it('shows root files with the same row as nested files', () => {
    const wrapper = mountTree()
    const root = wrapper.find('[title="package.json"]')
    expect(root.exists()).toBe(true)
    expect(root.find('svg').exists()).toBe(true)
    expect(root.element.parentElement!.querySelector('[aria-label="Mark as viewed"]')).not.toBeNull()
  })

  it('expands every folder at once and collapses them again', async () => {
    const wrapper = mountTree()
    await wrapper.find('[aria-label="Expand all folders"]').trigger('click')
    expect(fileRows(wrapper)).toHaveLength(4)
    await wrapper.find('[aria-label="Collapse all folders"]').trigger('click')
    expect(fileRows(wrapper)).toHaveLength(1)
  })

  it('highlights the file that was opened from the tree', async () => {
    const wrapper = mountTree()
    const row = wrapper.find('[title="package.json"]')
    await row.trigger('click')
    expect(row.element.parentElement!.className).toContain('bg-accent font-semibold')
  })

  it('expands and collapses a single folder with everything inside it', async () => {
    const wrapper = mountTree()
    await wrapper.find('[aria-label="Collapse all folders"]').trigger('click')
    await wrapper.find('[aria-label="Expand folder tree"]').trigger('click')
    expect(fileRows(wrapper).map((r) => r.attributes('title'))).toEqual(
      expect.arrayContaining(['src/Domain/Order/A.php', 'src/Domain/Core/C.php']),
    )
    await wrapper.find('[aria-label="Collapse folder tree"]').trigger('click')
    expect(fileRows(wrapper)).toHaveLength(1)
  })

  it('opens every folder while a search is active', async () => {
    const wrapper = mountTree()
    await wrapper.find('[aria-label="Collapse all folders"]').trigger('click')
    expect(fileRows(wrapper)).toHaveLength(1)
    await wrapper.setProps({ search: 'A.php' })
    expect(fileRows(wrapper)).toHaveLength(4)
  })

  it('opens a folder and asks to jump to it when its name is clicked', async () => {
    const wrapper = mountTree()
    await wrapper.find('[aria-label="Collapse all folders"]').trigger('click')
    const folder = wrapper.findAll('button').find((b) => b.text().startsWith('src/Domain'))!
    await folder.trigger('click')
    expect(wrapper.emitted('jumpFolder')).toEqual([['src/Domain']])
    expect(wrapper.text()).toContain('Order')
  })

  it('opens a folder from its chevron without marking it viewed', async () => {
    const wrapper = mountTree()
    await wrapper.find('[aria-label="Collapse all folders"]').trigger('click')
    const row = wrapper.findAll('button').find((b) => b.text().startsWith('src/Domain'))!.element.parentElement!
    expect(wrapper.text()).not.toContain('Order')

    row.querySelector<HTMLElement>('[aria-label="Expand"]')!.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Order')
    expect(wrapper.emitted('toggleViewed')).toBeUndefined()
  })

  it('marks a whole folder as viewed from its row, with no checkbox taking up space', async () => {
    const wrapper = mountTree()
    expect(wrapper.find('[role=checkbox]').exists()).toBe(false)
    await wrapper.find('[aria-label="Mark the whole folder as viewed"]').trigger('click')
    expect(wrapper.emitted('toggleViewed')).toEqual([['src/Domain', true]])
  })

  it('does not offer a folder filter button any more', () => {
    expect(mountTree().find('[aria-label="Show only this folder"]').exists()).toBe(false)
  })

  it('emits the file when a file row is clicked', async () => {
    const wrapper = mountTree()
    await wrapper.find('[title="package.json"]').trigger('click')
    expect(wrapper.emitted('selectFile')).toEqual([['package.json']])
  })

  it('toggles a single file as viewed from the tree', async () => {
    const wrapper = mountTree()
    await wrapper.find('[title="package.json"]').element.parentElement!.querySelector<HTMLElement>('[aria-label="Mark as viewed"]')!.click()
    expect(wrapper.emitted('toggleFile')![0]![1]).toBe(true)
  })

  it('shows a viewed file with a check that unmarks it', async () => {
    const wrapper = mountTree(['package.json'])
    const check = wrapper.find('[title="package.json"]').element.parentElement!.querySelector<HTMLElement>('[aria-label="Viewed"]')!
    check.click()
    expect(wrapper.emitted('toggleFile')![0]![1]).toBe(false)
  })

  it('shows the folder as fully viewed once every file in it is', () => {
    const wrapper = mountTree(['src/Domain/Core/C.php'])
    const core = wrapper.findAll('button').find((b) => b.text().startsWith('Core'))!
    const row = core.element.parentElement!
    expect(row.querySelector('[aria-label="All viewed"]')).not.toBeNull()
    expect(row.querySelector('[aria-label="Mark the whole folder as not viewed"]')).not.toBeNull()
  })

  it('asks to hide a folder on right-click', async () => {
    const wrapper = mountTree()
    const order = wrapper.findAll('button').find((b) => b.text().startsWith('Order'))!
    await order.trigger('contextmenu')
    expect(wrapper.emitted('hideFolder')).toEqual([['src/Domain/Order']])
  })

  it('hides a folder from its hide button too', async () => {
    const wrapper = mountTree()
    await wrapper.find('[aria-label="Hide folder"]').trigger('click')
    expect(wrapper.emitted('hideFolder')).toEqual([['src/Domain']])
  })

  it('joins a folder that holds only one folder into one row, as GitHub does', () => {
    const rows = mountTree()
      .findAll('button')
      .map((b) => b.text())
    expect(rows.some((t) => t.startsWith('src/Domain'))).toBe(true)
    expect(rows.some((t) => t === 'src' || t.startsWith('src3'))).toBe(false)
  })
})
