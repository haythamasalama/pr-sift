import { describe, expect, it } from 'vitest'
import { groupThreads, timeAgo } from '../src/comments'

describe('groupThreads', () => {
  it('puts replies under the comment that started the thread, in order', () => {
    const comments = [
      { id: 3, inReplyTo: 1, line: 10 },
      { id: 1, line: 10 },
      { id: 2, line: 22 },
      { id: 4, inReplyTo: 3, line: 10 },
    ]
    expect(groupThreads(comments).map((t) => t.comments.map((c) => c.id))).toEqual([[1, 3, 4], [2]])
  })

  it('leaves out outdated threads', () => {
    expect(
      groupThreads([
        { id: 1, line: null },
        { id: 2, inReplyTo: 1, line: null },
        { id: 3, line: 4 },
      ]).map((t) => t.root.id),
    ).toEqual([3])
  })
})

describe('timeAgo', () => {
  const now = Date.parse('2026-11-16T12:00:00Z')

  it('reads like GitHub', () => {
    expect(timeAgo('2026-11-16T11:59:30Z', now)).toBe('just now')
    expect(timeAgo('2026-11-16T11:55:00Z', now)).toBe('5 minutes ago')
    expect(timeAgo('2026-11-16T09:00:00Z', now)).toBe('3 hours ago')
    expect(timeAgo('2026-11-15T12:00:00Z', now)).toBe('yesterday')
    expect(timeAgo('2026-11-02T12:00:00Z', now)).toBe('2 weeks ago')
    expect(timeAgo('2025-11-01T12:00:00Z', now)).toBe('last year')
  })

  it('shortens the words with the narrow style', () => {
    expect(timeAgo('2026-11-16T11:41:00Z', now, 'narrow')).toBe('19m ago')
    expect(timeAgo('2026-11-16T09:00:00Z', now, 'narrow')).toBe('3h ago')
    expect(timeAgo('2026-11-16T11:59:30Z', now, 'narrow')).toBe('just now')
  })

  it('returns nothing for a bad date', () => {
    expect(timeAgo('soon', now)).toBe('')
  })
})
