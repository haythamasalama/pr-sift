import { describe, expect, it } from 'vitest'
import { fetchConversation } from '../../../src/features/review/conversation'
import { installChrome } from '../../helpers/chrome'
import { PR } from '@pr-sift/core/testing'

describe('fetchConversation', () => {
  it('counts the conversation and the code comments, per file', async () => {
    const { sent } = installChrome((message) => {
      const path = String(message.path)
      if (path.endsWith('/pulls/7')) return { ok: true, status: 200, data: { comments: 2, review_comments: 3 } }
      if (path.includes('/comments?')) return { ok: true, status: 200, data: [{ path: 'a.php' }, { path: 'b.ts' }, { path: 'a.php' }] }
      return { ok: false, status: 404, data: {} }
    })
    const result = await fetchConversation(PR)
    expect(result.conversation).toBe(2)
    expect(result.code).toBe(3)
    expect([...result.byFile]).toEqual([
      ['a.php', 2],
      ['b.ts', 1],
    ])
    expect(sent.map((m) => m.path)).toEqual(['/repos/o/r/pulls/7', '/repos/o/r/pulls/7/comments?per_page=100&page=1'])
  })

  it('does not ask for code comments when there are none', async () => {
    const { sent } = installChrome(() => ({ ok: true, status: 200, data: { comments: 0, review_comments: 0 } }))
    expect((await fetchConversation(PR)).byFile.size).toBe(0)
    expect(sent).toHaveLength(1)
  })
})
