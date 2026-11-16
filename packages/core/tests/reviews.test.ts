import { describe, expect, it } from 'vitest'
import { summarizeReviews } from '../src/reviews'

describe('summarizeReviews', () => {
  it("counts each reviewer's latest verdict, as GitHub does", () => {
    const reviews = [
      { login: 'sam', state: 'CHANGES_REQUESTED' },
      { login: 'lee', state: 'APPROVED' },
      { login: 'sam', state: 'COMMENTED' },
      { login: 'sam', state: 'APPROVED' },
      { login: 'kim', state: 'CHANGES_REQUESTED' },
    ]
    expect(summarizeReviews(reviews, 'Sam')).toEqual({ approvals: 2, changesRequested: 1, mine: 'approved' })
  })

  it('forgets a dismissed review and ignores comments', () => {
    const reviews = [
      { login: 'lee', state: 'APPROVED' },
      { login: 'lee', state: 'DISMISSED' },
      { login: 'kim', state: 'COMMENTED' },
    ]
    expect(summarizeReviews(reviews, 'kim')).toEqual({ approvals: 0, changesRequested: 0, mine: null })
  })

  it('has no verdict of its own without a viewer', () => {
    expect(summarizeReviews([{ login: 'lee', state: 'APPROVED' }]).mine).toBeNull()
  })
})
