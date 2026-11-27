import type { PullItem } from '~/github'

// Filters on a list of pull requests. Inside one kind any choice matches; across kinds all must match.
export type PullFilterKind = 'author' | 'label' | 'review' | 'ci'
export type PullFilters = Record<PullFilterKind, string[]>

export const NO_FILTERS: PullFilters = { author: [], label: [], review: [], ci: [] }

export const REVIEW_STATES = [
  { value: 'needs', label: 'Needs review' },
  { value: 'approved', label: 'Approved' },
  { value: 'changes', label: 'Changes asked' },
  { value: 'draft', label: 'Draft' },
] as const

export const CI_STATES = [
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'running', label: 'Running' },
  { value: 'none', label: 'No checks' },
] as const

export function reviewState(p: PullItem): string {
  if (p.draft) return 'draft'
  if (p.decision === 'APPROVED') return 'approved'
  if (p.decision === 'CHANGES_REQUESTED') return 'changes'
  return 'needs'
}

export function ciState(p: PullItem): string {
  if (p.checks === 'SUCCESS') return 'passed'
  if (p.checks === 'FAILURE' || p.checks === 'ERROR') return 'failed'
  if (p.checks === 'PENDING' || p.checks === 'EXPECTED') return 'running'
  return 'none'
}

export function matchesFilters(p: PullItem, f: PullFilters): boolean {
  if (f.author.length && !f.author.includes(p.author?.login ?? '')) return false
  if (f.label.length && !p.labels.some((l) => f.label.includes(l.name))) return false
  if (f.review.length && !f.review.includes(reviewState(p))) return false
  if (f.ci.length && !f.ci.includes(ciState(p))) return false
  return true
}

export const filterCount = (f: PullFilters) => f.author.length + f.label.length + f.review.length + f.ci.length

// The authors and labels the pulls carry, most used first, for the menus.
export function filterChoices(pulls: PullItem[]) {
  const authors = new Map<string, { login: string; avatarUrl?: string; count: number }>()
  const labels = new Map<string, { name: string; color: string; count: number }>()
  for (const p of pulls) {
    if (p.author) {
      const a = authors.get(p.author.login) ?? { login: p.author.login, avatarUrl: p.author.avatarUrl, count: 0 }
      a.count++
      authors.set(p.author.login, a)
    }
    for (const l of p.labels) {
      const e = labels.get(l.name) ?? { name: l.name, color: l.color, count: 0 }
      e.count++
      labels.set(l.name, e)
    }
  }
  const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count
  return { authors: [...authors.values()].sort(byCount), labels: [...labels.values()].sort(byCount) }
}
