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
  headSha: string
  // Your latest review on it, such as APPROVED.
  myReview?: string
  // You can push to the repository, so GitHub may let you merge.
  canMerge: boolean
}

const PR_FIELDS = `
  number title url isDraft updatedAt reviewDecision headRefName headRefOid baseRefName additions deletions mergeable
  viewerLatestReview { state }
  repository { name viewerPermission owner { login } }
  author { login avatarUrl }
  labels(first: 6) { nodes { name color } }
  comments { totalCount }
  reviewRequests(first: 10) { nodes { requestedReviewer { ... on User { login } ... on Team { name } } } }
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
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
  headRefOid: string
  viewerLatestReview: { state: string } | null
  repository: { name: string; viewerPermission?: string | null; owner: { login: string } }
  author: Person | null
  labels: { nodes: Label[] }
  comments: { totalCount: number }
  reviewRequests: { nodes: { requestedReviewer: { login?: string; name?: string } | null }[] }
  commits: { nodes: { commit: { statusCheckRollup: { state: CheckState } | null } }[] }
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
  headSha: p.headRefOid,
  myReview: p.viewerLatestReview?.state,
  canMerge: ['ADMIN', 'MAINTAIN', 'WRITE'].includes(p.repository.viewerPermission ?? ''),
})

// Search results can hold nulls for items the token can't see; those are dropped.
const pulls = (nodes: (RawPull | null)[]) => nodes.filter((n): n is RawPull => !!n?.repository).map(toPull)

export interface Inbox {
  review: PullItem[]
  mine: PullItem[]
}

export async function loadInbox(): Promise<Inbox> {
  const data = await graphql<{
    review: { nodes: (RawPull | null)[] }
    mine: { nodes: (RawPull | null)[] }
  }>(`query {
    review: search(query: "is:open is:pr review-requested:@me archived:false sort:updated-desc", type: ISSUE, first: 50) { nodes { ... on PullRequest { ${PR_FIELDS} } } }
    mine: search(query: "is:open is:pr author:@me archived:false sort:updated-desc", type: ISSUE, first: 50) { nodes { ... on PullRequest { ${PR_FIELDS} } } }
  }`)
  return { review: pulls(data.review.nodes), mine: pulls(data.mine.nodes) }
}

export interface RepoInfo {
  description?: string
  homepage?: string
  stars: number
  forks: number
  language?: { name: string; color?: string }
  topics: string[]
  license?: string
  private: boolean
  pushedAt?: number
  ownerAvatar?: string
}

export interface RepoActivity {
  pulls: PullItem[]
  defaultBranch?: string
  info: RepoInfo
}

export async function loadRepo(owner: string, name: string): Promise<RepoActivity> {
  const data = await graphql<{
    repository: {
      defaultBranchRef: { name: string } | null
      description?: string | null
      homepageUrl?: string | null
      stargazerCount?: number
      forkCount?: number
      isPrivate?: boolean
      pushedAt?: string | null
      primaryLanguage?: { name: string; color: string | null } | null
      licenseInfo?: { spdxId: string | null; name: string } | null
      repositoryTopics?: { nodes: { topic: { name: string } }[] }
      owner?: { avatarUrl: string }
      pullRequests: { nodes: RawPull[] }
    } | null
  }>(
    `query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        defaultBranchRef { name }
        description homepageUrl stargazerCount forkCount isPrivate pushedAt
        primaryLanguage { name color }
        licenseInfo { spdxId name }
        repositoryTopics(first: 8) { nodes { topic { name } } }
        owner { avatarUrl }
        pullRequests(states: OPEN, first: 60, orderBy: { field: UPDATED_AT, direction: DESC }) { nodes { ${PR_FIELDS} } }
      }
    }`,
    { owner, name },
  )
  if (!data.repository) throw new ApiError('GitHub has no repository with that name, or your token can’t see it.', 404)
  const r = data.repository
  return {
    pulls: pulls(r.pullRequests.nodes),
    defaultBranch: r.defaultBranchRef?.name,
    info: {
      description: r.description ?? undefined,
      homepage: r.homepageUrl || undefined,
      stars: r.stargazerCount ?? 0,
      forks: r.forkCount ?? 0,
      language: r.primaryLanguage ? { name: r.primaryLanguage.name, color: r.primaryLanguage.color ?? undefined } : undefined,
      topics: r.repositoryTopics?.nodes.map((n) => n.topic.name) ?? [],
      license: r.licenseInfo
        ? r.licenseInfo.spdxId && r.licenseInfo.spdxId !== 'NOASSERTION'
          ? r.licenseInfo.spdxId
          : r.licenseInfo.name
        : undefined,
      private: r.isPrivate ?? false,
      pushedAt: r.pushedAt ? Date.parse(r.pushedAt) : undefined,
      ownerAvatar: r.owner?.avatarUrl,
    },
  }
}
