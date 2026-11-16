export type ReviewEvent = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'
export type ReviewVerdict = 'approved' | 'changes_requested'

export interface ReviewEntry {
  login: string
  state: string
}

export interface ReviewSummary {
  approvals: number
  changesRequested: number
  mine: ReviewVerdict | null
}

export function summarizeReviews(reviews: ReviewEntry[], viewer?: string): ReviewSummary {
  const latest = new Map<string, ReviewVerdict | null>()
  for (const review of reviews) {
    const login = review.login.toLowerCase()
    if (review.state === 'APPROVED') latest.set(login, 'approved')
    else if (review.state === 'CHANGES_REQUESTED') latest.set(login, 'changes_requested')
    else if (review.state === 'DISMISSED') latest.set(login, null)
  }
  const verdicts = [...latest.values()]
  return {
    approvals: verdicts.filter((v) => v === 'approved').length,
    changesRequested: verdicts.filter((v) => v === 'changes_requested').length,
    mine: viewer ? (latest.get(viewer.toLowerCase()) ?? null) : null,
  }
}
