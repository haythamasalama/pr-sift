import { describe, expect, it } from 'vitest'
import { avatarUrl, infoFromPagePayload, prState } from '../src/overview'

describe('prState', () => {
  it('maps GitHub states, with merged and draft flags winning', () => {
    expect(prState('OPEN')).toBe('open')
    expect(prState('open', { draft: true })).toBe('draft')
    expect(prState('closed', { merged: true })).toBe('merged')
    expect(prState('CLOSED')).toBe('closed')
    expect(prState(undefined)).toBeUndefined()
  })
})

describe('infoFromPagePayload', () => {
  it('reads the author, branches, commit count and state from the page data', () => {
    const data = {
      payload: {
        pullRequestsLayoutRoute: {
          pullRequest: {
            title: 'feat: invoices',
            author: { login: 'haytham', avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4' },
            baseBranch: 'main',
            headBranch: 'feat/invoices',
            commitsCount: 4,
            state: 'OPEN',
          },
        },
      },
    }
    expect(infoFromPagePayload(data)).toEqual({
      title: 'feat: invoices',
      author: 'haytham',
      authorAvatar: 'https://avatars.githubusercontent.com/u/1?v=4&s=40',
      base: 'main',
      head: 'feat/invoices',
      commits: 4,
      state: 'open',
    })
  })

  it('returns nothing it cannot read', () => {
    expect(infoFromPagePayload(null)).toEqual({})
    expect(infoFromPagePayload({ payload: {} })).toEqual({})
    expect(infoFromPagePayload({ payload: { pullRequestsLayoutRoute: { pullRequest: { title: 5 } } } })).toEqual({})
  })
})

describe('avatarUrl', () => {
  it("only accepts GitHub's avatar hosts over https, at a small size", () => {
    expect(avatarUrl('https://avatars.githubusercontent.com/u/1?v=4', 20)).toBe('https://avatars.githubusercontent.com/u/1?v=4&s=20')
    expect(avatarUrl('http://avatars.githubusercontent.com/u/1')).toBeUndefined()
    expect(avatarUrl('https://evil.example/u/1')).toBeUndefined()
    expect(avatarUrl('javascript:alert(1)')).toBeUndefined()
    expect(avatarUrl(5)).toBeUndefined()
  })
})
