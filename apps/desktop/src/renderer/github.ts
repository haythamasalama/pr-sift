import { bridge } from './bridge'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export async function graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await bridge.invoke('gh:request', { type: 'gh', path: '/graphql', method: 'POST', body: { query, variables } })
  const data = res.data as { data?: T; errors?: { message: string }[]; message?: string } | null
  if (!res.ok) throw new ApiError(data?.message ?? `GitHub answered ${res.status}.`, res.status)
  if (data?.errors?.length && !data.data) throw new ApiError(data.errors[0]!.message, res.status)
  return data!.data as T
}

export type CheckState = 'SUCCESS' | 'FAILURE' | 'ERROR' | 'PENDING' | 'EXPECTED'
export type ReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null

export interface Person {
  login: string
  avatarUrl?: string
}

export interface Label {
  name: string
  color: string
}

export interface PullItem {
  owner: string
  repo: string
  number: number
  title: string
  url: string
  draft: boolean
  updatedAt: number
  author?: Person
  branch: string
  base: string
  decision: ReviewDecision
  checks?: CheckState
  labels: Label[]
  comments: number
  additions: number
  deletions: number
  reviewers: string[]
  mergeable?: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'
}

export interface IssueItem {
  owner: string
  repo: string
  number: number
  title: string
  url: string
  updatedAt: number
  author?: Person
  labels: Label[]
  comments: number
  assignees: Person[]
}

const PR_FIELDS = `
  number title url isDraft updatedAt reviewDecision headRefName baseRefName additions deletions mergeable
  repository { name owner { login } }
  author { login avatarUrl }
  labels(first: 6) { nodes { name color } }
  comments { totalCount }
  reviewRequests(first: 10) { nodes { requestedReviewer { ... on User { login } ... on Team { name } } } }
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
`
const ISSUE_FIELDS = `
  number title url updatedAt
  repository { name owner { login } }
  author { login avatarUrl }
  labels(first: 6) { nodes { name color } }
  comments { totalCount }
  assignees(first: 5) { nodes { login avatarUrl } }
`

interface RawPull {
  number: number
  title: string
  url: string
  isDraft: boolean
  updatedAt: string
  reviewDecision: ReviewDecision
  headRefName: string
  baseRefName: string
  additions: number
  deletions: number
  mergeable?: PullItem['mergeable']
  repository: { name: string; owner: { login: string } }
  author: Person | null
  labels: { nodes: Label[] }
  comments: { totalCount: number }
  reviewRequests: { nodes: { requestedReviewer: { login?: string; name?: string } | null }[] }
  commits: { nodes: { commit: { statusCheckRollup: { state: CheckState } | null } }[] }
}

interface RawIssue {
  number: number
  title: string
  url: string
  updatedAt: string
  repository: { name: string; owner: { login: string } }
  author: Person | null
  labels: { nodes: Label[] }
  comments: { totalCount: number }
  assignees: { nodes: Person[] }
}

const toPull = (p: RawPull): PullItem => ({
  owner: p.repository.owner.login,
  repo: p.repository.name,
  number: p.number,
  title: p.title,
  url: p.url,
  draft: p.isDraft,
  updatedAt: Date.parse(p.updatedAt),
  author: p.author ?? undefined,
  branch: p.headRefName,
  base: p.baseRefName,
  decision: p.reviewDecision,
  checks: p.commits.nodes[0]?.commit.statusCheckRollup?.state,
  labels: p.labels.nodes,
  comments: p.comments.totalCount,
  additions: p.additions,
  deletions: p.deletions,
  reviewers: p.reviewRequests.nodes.map((n) => n.requestedReviewer?.login ?? n.requestedReviewer?.name ?? '').filter(Boolean),
  mergeable: p.mergeable,
})

const toIssue = (i: RawIssue): IssueItem => ({
  owner: i.repository.owner.login,
  repo: i.repository.name,
  number: i.number,
  title: i.title,
  url: i.url,
  updatedAt: Date.parse(i.updatedAt),
  author: i.author ?? undefined,
  labels: i.labels.nodes,
  comments: i.comments.totalCount,
  assignees: i.assignees.nodes,
})

// Search results can hold nulls for items the token can't see; those are dropped.
const pulls = (nodes: (RawPull | null)[]) => nodes.filter((n): n is RawPull => !!n?.repository).map(toPull)
const issues = (nodes: (RawIssue | null)[]) => nodes.filter((n): n is RawIssue => !!n?.repository).map(toIssue)

export interface Inbox {
  review: PullItem[]
  mine: PullItem[]
  assigned: IssueItem[]
}

export async function loadInbox(): Promise<Inbox> {
  const data = await graphql<{
    review: { nodes: (RawPull | null)[] }
    mine: { nodes: (RawPull | null)[] }
    assigned: { nodes: (RawIssue | null)[] }
  }>(`query {
    review: search(query: "is:open is:pr review-requested:@me archived:false sort:updated-desc", type: ISSUE, first: 50) { nodes { ... on PullRequest { ${PR_FIELDS} } } }
    mine: search(query: "is:open is:pr author:@me archived:false sort:updated-desc", type: ISSUE, first: 50) { nodes { ... on PullRequest { ${PR_FIELDS} } } }
    assigned: search(query: "is:open is:issue assignee:@me archived:false sort:updated-desc", type: ISSUE, first: 30) { nodes { ... on Issue { ${ISSUE_FIELDS} } } }
  }`)
  return { review: pulls(data.review.nodes), mine: pulls(data.mine.nodes), assigned: issues(data.assigned.nodes) }
}

export interface RepoActivity {
  pulls: PullItem[]
  issues: IssueItem[]
  defaultBranch?: string
}

export async function loadRepo(owner: string, name: string): Promise<RepoActivity> {
  const data = await graphql<{
    repository: {
      defaultBranchRef: { name: string } | null
      pullRequests: { nodes: RawPull[] }
      issues: { nodes: RawIssue[] }
    } | null
  }>(
    `query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        defaultBranchRef { name }
        pullRequests(states: OPEN, first: 60, orderBy: { field: UPDATED_AT, direction: DESC }) { nodes { ${PR_FIELDS} } }
        issues(states: OPEN, first: 60, orderBy: { field: UPDATED_AT, direction: DESC }) { nodes { ${ISSUE_FIELDS} } }
      }
    }`,
    { owner, name },
  )
  if (!data.repository) throw new ApiError('GitHub has no repository with that name, or your token can’t see it.', 404)
  return {
    pulls: pulls(data.repository.pullRequests.nodes),
    issues: issues(data.repository.issues.nodes),
    defaultBranch: data.repository.defaultBranchRef?.name,
  }
}
