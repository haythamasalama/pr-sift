import type { PrInfo, PrState } from './types'

export function prState(state: string | undefined, flags: { merged?: boolean; draft?: boolean } = {}): PrState | undefined {
  const value = flags.merged ? 'merged' : state?.toLowerCase()
  if (value === 'merged' || value === 'closed') return value
  if (value === 'open' || value === 'draft') return flags.draft || value === 'draft' ? 'draft' : 'open'
  return undefined
}

interface PagePull {
  title?: unknown
  author?: { login?: unknown }
  baseBranch?: unknown
  headBranch?: unknown
  commitsCount?: unknown
  state?: unknown
  isDraft?: unknown
}

const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined)

export function infoFromPagePayload(data: unknown): Partial<PrInfo> {
  const pull = (data as { payload?: { pullRequestsLayoutRoute?: { pullRequest?: PagePull } } } | null)?.payload?.pullRequestsLayoutRoute
    ?.pullRequest
  if (!pull || typeof pull !== 'object') return {}
  const info: Partial<PrInfo> = {
    title: text(pull.title),
    author: text(pull.author?.login),
    base: text(pull.baseBranch),
    head: text(pull.headBranch),
    commits: typeof pull.commitsCount === 'number' ? pull.commitsCount : undefined,
    state: prState(text(pull.state), { draft: pull.isDraft === true }),
  }
  return Object.fromEntries(Object.entries(info).filter(([, value]) => value !== undefined))
}
