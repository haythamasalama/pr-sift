import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PrSummary from '../../../src/features/review/PrSummary.vue'
import type { PrInfo } from '../../../src/lib/types'

const info: PrInfo = { title: 'Ship', author: 'sam', base: 'main', head: 'feat/ship', commits: 3, state: 'open' }
const conversation = { conversation: 2, code: 5, byFile: new Map() }

describe('PrSummary', () => {
  it('reads like the GitHub pull request header', () => {
    const wrapper = mount(PrSummary, { props: { info, conversation: null, conversationUrl: 'u' } })
    expect(wrapper.text()).toContain('Open')
    expect(wrapper.text().replace(/\s+/g, ' ')).toContain('sam wants to merge 3 commits into main from feat/ship')
  })

  it('counts every comment and splits them in the tooltip', () => {
    const wrapper = mount(PrSummary, { props: { info, conversation, conversationUrl: 'https://github.com/o/r/pull/7' } })
    const link = wrapper.get('a')
    expect(link.text()).toBe('7')
    expect(link.attributes('href')).toBe('https://github.com/o/r/pull/7')
    expect(link.attributes('title')).toBe('7 comments on GitHub: 2 in the conversation, 5 on the code')
  })

  it('toggles the description', async () => {
    const wrapper = mount(PrSummary, { props: { info: { ...info, state: 'merged' }, conversation: null, conversationUrl: 'u' } })
    expect(wrapper.text()).toContain('sam merged 3 commits')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('update:descriptionOpen')).toEqual([[true]])
  })
})
