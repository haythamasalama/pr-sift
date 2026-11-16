import { describe, expect, it } from 'vitest'
import { infoFromPagePayload, prState } from '../src/overview'

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
            author: { login: 'haytham' },
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
