import { describe, expect, it } from 'vitest'
import { fetchConversation } from '../../../src/features/review/conversation'
import { installChrome } from '../../helpers/chrome'
import { PR } from '@pr-sift/core/testing'

const user = (login: string) => ({ login, avatar_url: `https://avatars.githubusercontent.com/u/${login.length}?v=4` })

function github() {
  return installChrome((message) => {
    const path = String(message.path)
    if (path === '/user') return { ok: true, status: 200, data: user('lee') }
    if (/^\/repos\/[^/]+\/[^/]+$/.test(path)) return { ok: true, status: 200, data: { permissions: { push: true } } }
    if (path.endsWith('/pulls/7')) return { ok: true, status: 200, data: { comments: 1, review_comments: 4, mergeable_state: 'unstable' } }
    if (path.includes('/reviews'))
      return {
        ok: true,
        status: 200,
        data: [
          {
            id: 50,
            state: 'APPROVED',
            body_html: '<p>Ship it</p>',
            submitted_at: '2026-11-02T00:00:00Z',
            html_url: 'r',
            user: user('lee'),
          },
          { id: 51, state: 'COMMENTED', body_html: '', submitted_at: '2026-11-03T00:00:00Z', html_url: 'r', user: user('kim') },
        ],
      }
    if (path.includes('/issues/7/comments'))
      return {
        ok: true,
        status: 200,
        data: [{ id: 60, body_html: '<p>First</p>', created_at: '2026-11-01T00:00:00Z', html_url: 'i', user: user('sam') }],
      }
    if (path.includes('/pulls/7/comments'))
      return {
        ok: true,
        status: 200,
        data: [
          { id: 1, path: 'a.php', line: 10, side: 'RIGHT', body_html: '<p>Why?</p>', created_at: 't', html_url: 'c1', user: user('sam') },
          {
            id: 2,
            in_reply_to_id: 1,
            path: 'a.php',
            line: 10,
            side: 'RIGHT',
            body_html: '<p>Because</p>',
            created_at: 't',
            html_url: 'c2',
            user: user('lee'),
          },
          {
            id: 3,
            path: 'b.ts',
            line: 4,
            start_line: 2,
            side: 'LEFT',
            body_html: '<p>Old</p>',
            created_at: 't',
            html_url: 'c3',
            user: user('kim'),
          },
          {
            id: 4,
            path: 'b.ts',
            line: null,
            side: 'RIGHT',
            body_html: '<p>Outdated</p>',
            created_at: 't',
            html_url: 'c4',
            user: user('kim'),
          },
        ],
      }
    return { ok: false, status: 404, data: {} }
  })
}

describe('fetchConversation', () => {
  it('groups code comments into threads on their lines, without outdated ones', async () => {
    github()
    const result = await fetchConversation(PR)
    const a = result.threads.get('a.php')!
    expect(a).toHaveLength(1)
    expect(a[0]).toMatchObject({ id: 1, side: 'new', line: 10 })
    expect(a[0]!.comments.map((c) => c.author)).toEqual(['sam', 'lee'])
    expect(result.threads.get('b.ts')![0]).toMatchObject({ side: 'old', line: 4, startLine: 2 })
    expect([...result.byFile]).toEqual([
      ['a.php', 2],
      ['b.ts', 1],
    ])
  })

  it('lists the conversation and reviews with a message, oldest first', async () => {
    github()
    const result = await fetchConversation(PR)
    expect(result.discussion.map((c) => [c.author, c.verdict])).toEqual([
      ['sam', undefined],
      ['lee', 'approved'],
    ])
    expect(result.discussion[0]!.avatar).toBe('https://avatars.githubusercontent.com/u/3?v=4&s=40')
  })

  it('knows who you are, how the reviews stand and whether it can merge', async () => {
    const { sent } = github()
    const result = await fetchConversation(PR)
    expect(result.viewer).toBe('lee')
    expect(result.reviews).toEqual({ approvals: 1, changesRequested: 0, mine: 'approved' })
    expect(result.readiness).toBe('checks')
    expect(result.canMerge).toBe(true)
    expect(result.conversation + result.code).toBe(5)
    expect(sent.filter((m) => String(m.path).includes('/comments')).every((m) => m.accept === 'application/vnd.github.html+json')).toBe(
      true,
    )
  })

  it('still works when the optional calls fail', async () => {
    installChrome((message) =>
      String(message.path).endsWith('/pulls/7')
        ? { ok: true, status: 200, data: { comments: 0, review_comments: 0 } }
        : { ok: false, status: 403, data: { message: 'nope' } },
    )
    const result = await fetchConversation(PR)
    expect(result.viewer).toBeUndefined()
    expect(result.discussion).toEqual([])
    expect(result.readiness).toBe('unknown')
    expect(result.canMerge).toBe(false)
  })

  it('asks again while GitHub is still working out whether it can merge', async () => {
    let asked = 0
    installChrome((message) => {
      const path = String(message.path)
      if (path.endsWith('/pulls/7')) {
        asked++
        return { ok: true, status: 200, data: { comments: 0, review_comments: 0, mergeable_state: asked === 1 ? 'unknown' : 'blocked' } }
      }
      if (/^\/repos\/[^/]+\/[^/]+$/.test(path)) return { ok: true, status: 200, data: { archived: true, permissions: { admin: true } } }
      return { ok: false, status: 404, data: {} }
    })
    const result = await fetchConversation(PR)
    expect(asked).toBe(2)
    expect(result.readiness).toBe('blocked')
    expect(result.canMerge).toBe(false)
  })
})
