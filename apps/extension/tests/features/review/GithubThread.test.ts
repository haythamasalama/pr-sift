import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GithubThread from '../../../src/features/review/GithubThread.vue'
import type { Thread } from '../../../src/features/review/conversation'

const comment = (id: number, author: string, text: string) => ({
  id,
  author,
  bodyHtml: `<p>${text}</p>`,
  createdAt: '2026-11-01T00:00:00Z',
  url: `https://github.com/o/r/pull/7#discussion_r${id}`,
})

const thread: Thread = {
  id: 1,
  path: 'a.php',
  side: 'new',
  line: 22,
  startLine: 20,
  comments: [comment(1, 'sam', 'Why the rename?'), comment(2, 'lee', 'Clearer name'), comment(3, 'sam', 'Fair')],
}

describe('GithubThread', () => {
  it('puts the replies under the first comment', () => {
    const wrapper = mount(GithubThread, { props: { thread } })
    expect(wrapper.text()).toContain('Lines 20–22')
    expect(wrapper.text()).toContain('3 comments on GitHub')
    const replies = wrapper.get('[data-replies]')
    expect(replies.text()).toContain('Clearer name')
    expect(replies.text()).toContain('Fair')
    expect(replies.text()).not.toContain('Why the rename?')
  })

  it('folds the thread away', async () => {
    const wrapper = mount(GithubThread, { props: { thread } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.text()).not.toContain('Why the rename?')
    expect(wrapper.find('a').attributes('href')).toBe('https://github.com/o/r/pull/7#discussion_r1')
  })
})
