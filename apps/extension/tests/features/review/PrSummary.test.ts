import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import PrSummary from '../../../src/features/review/PrSummary.vue'
import type { Conversation } from '../../../src/features/review/conversation'
import type { PrInfo } from '../../../src/lib/types'

const info: PrInfo = {
  title: 'Ship',
  author: 'sam',
  authorAvatar: 'https://avatars.githubusercontent.com/u/1?s=40',
  base: 'main',
  head: 'feat/ship',
  commits: 3,
  state: 'open',
}
const conversation: Conversation = {
  conversation: 2,
  code: 5,
  byFile: new Map(),
  threads: new Map(),
  discussion: [],
  reviews: { approvals: 0, changesRequested: 0, mine: null },
  readiness: 'ready',
}

describe('PrSummary', () => {
  it('reads like the GitHub pull request header', () => {
    const wrapper = mount(PrSummary, { props: { info, conversation: null } })
    expect(wrapper.text()).toContain('Open')
    expect(wrapper.text().replace(/\s+/g, ' ')).toContain('sam wants to merge 3 commits into main from feat/ship')
  })

  it('opens the conversation inside the review instead of linking to GitHub', async () => {
    const wrapper = mount(PrSummary, { props: { info, conversation } })
    const count = wrapper.get('button[aria-label^="7 comments"]')
    expect(count.text()).toBe('7')
    expect(wrapper.find('a').exists()).toBe(false)
    await count.trigger('click')
    expect(wrapper.emitted('update:panel')).toEqual([['conversation']])
  })

  it('toggles the description', async () => {
    const wrapper = mount(PrSummary, { props: { info: { ...info, state: 'merged' }, conversation: null, panel: 'description' } })
    expect(wrapper.text()).toContain('sam merged 3 commits')
    await wrapper.get('button[title="Show the pull request description"]').trigger('click')
    expect(wrapper.emitted('update:panel')).toEqual([[null]])
  })

  it('copies a branch name when you click it', async () => {
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const wrapper = mount(PrSummary, { props: { info, conversation: null } })
    await wrapper.get('button[aria-label="Copy feat/ship"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('button[aria-label="Copy feat/ship"]').attributes('title')).toBe('Copied'))
    expect(writeText).toHaveBeenCalledWith('feat/ship')
  })
})
