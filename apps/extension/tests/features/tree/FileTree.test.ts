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
    expect(root.element.parentElement!.querySelector('[role=checkbox]')).not.toBeNull()
  })

  it('expands every folder at once and collapses them again', async () => {
    const wrapper = mountTree()
    await wrapper.find('[aria-label="Expand all folders"]').trigger('click')
    expect(fileRows(wrapper)).toHaveLength(4)
    await wrapper.find('[aria-label="Collapse all folders"]').trigger('click')
    expect(fileRows(wrapper)).toHaveLength(1)
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
    const folder = wrapper.findAll('button').find((b) => b.text().startsWith('src'))!
    await folder.trigger('click')
    expect(wrapper.emitted('jumpFolder')).toEqual([['src']])
    expect(wrapper.text()).toContain('Domain')
  })

  it('opens a folder from its chevron without marking it viewed', async () => {
    const wrapper = mountTree()
    await wrapper.find('[aria-label="Collapse all folders"]').trigger('click')
    const row = wrapper.findAll('button').find((b) => b.text().startsWith('src'))!.element.parentElement!
    const checkbox = row.querySelector('[role=checkbox]')!
    expect(wrapper.text()).not.toContain('Domain')

    row.querySelector<HTMLElement>('[aria-label="Expand"]')!.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Domain')
    expect(wrapper.emitted('toggleViewed')).toBeUndefined()
    expect(checkbox.getAttribute('aria-checked')).toBe('false')
  })

  it('keeps every tree checkbox hit area inside its own box', () => {
    const boxes = mountTree().findAll('[role=checkbox]')
    expect(boxes.length).toBeGreaterThan(1)
    for (const box of boxes) {
      expect(box.classes()).toContain('after:inset-0')
      expect(box.classes()).not.toContain('after:-inset-x-3')
    }
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
    await wrapper.find('[title="package.json"]').element.parentElement!.querySelector<HTMLElement>('[role=checkbox]')!.click()
    expect(wrapper.emitted('toggleFile')![0]![1]).toBe(true)
  })

  it('shows the folder as fully viewed once every file in it is', () => {
    const wrapper = mountTree(['src/Domain/Core/C.php'])
    const core = wrapper.findAll('button').find((b) => b.text().startsWith('Core'))!
    const row = core.element.parentElement!
    expect(row.querySelector('[role=checkbox]')!.getAttribute('aria-checked')).toBe('true')
  })
})
