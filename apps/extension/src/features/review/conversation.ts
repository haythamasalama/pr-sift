import {
  avatarUrl,
  groupThreads,
  mergeReadiness,
  summarizeReviews,
  type MergeReadiness,
  type ReviewSummary,
  type ReviewVerdict,
} from '@pr-sift/core'
import { gh } from './github'
import type { Note, PrRef } from '../../lib/types'
import { canBypassRules } from './actions'

export interface GithubComment {
  id: number
  author: string
  avatar?: string
  bodyHtml: string
  createdAt: string
  url: string
  verdict?: ReviewVerdict
}

export interface Thread {
  id: number
  path: string
  side: Note['side']
  line: number
  startLine?: number
  comments: GithubComment[]
}

export interface Conversation {
  conversation: number
  code: number
  byFile: ReadonlyMap<string, number>
  threads: ReadonlyMap<string, Thread[]>
  discussion: GithubComment[]
  viewer?: string
  reviews: ReviewSummary
  readiness: MergeReadiness
  // You can push to the repository, so a merge is yours to make.
  canMerge: boolean
  // You may merge before the branch rules are met (an admin or a ruleset bypass actor).
  canBypass: boolean
}

interface ApiRepo {
  archived?: boolean
  permissions?: { admin?: boolean; maintain?: boolean; push?: boolean }
}

// GitHub works out mergeability in the background and says "unknown" until it has; one more ask usually has the answer.
const SETTLE_MS = 1500

interface ApiUser {
  login: string
  avatar_url?: string
}

interface ApiReviewComment {
  id: number
  in_reply_to_id?: number
  path: string
  line: number | null
  start_line?: number | null
  side?: 'LEFT' | 'RIGHT'
  body_html?: string
  created_at: string
  html_url: string
  user: ApiUser | null
}

interface ApiIssueComment {
  id: number
  body_html?: string
  created_at: string
  html_url: string
  user: ApiUser | null
}

interface ApiReview {
  id: number
  state: string
  body_html?: string
  submitted_at?: string
  html_url: string
  user: ApiUser | null
}

const HTML = 'application/vnd.github.html+json'
const MAX_PAGES = 10

function comment(c: ApiIssueComment | ApiReviewComment): GithubComment {
  return {
    id: c.id,
    author: c.user?.login ?? 'ghost',
    avatar: avatarUrl(c.user?.avatar_url),
    bodyHtml: c.body_html ?? '',
    createdAt: c.created_at,
    url: c.html_url,
  }
}

const VERDICTS: Record<string, ReviewVerdict> = { APPROVED: 'approved', CHANGES_REQUESTED: 'changes_requested' }

export async function fetchConversation(pr: PrRef): Promise<Conversation> {
  const base = `/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}`
  const [pull, viewer, reviews, issueComments, repo, canBypass] = await Promise.all([
    gh<{ comments: number; review_comments: number; mergeable_state?: string }>(base),
    gh<ApiUser>('/user')
      .then((u) => u.login)
      .catch(() => undefined),
    gh<ApiReview[]>(`${base}/reviews?per_page=100`, undefined, undefined, HTML).catch((): ApiReview[] => []),
    gh<ApiIssueComment[]>(`/repos/${pr.owner}/${pr.repo}/issues/${pr.number}/comments?per_page=100`, undefined, undefined, HTML).catch(
      (): ApiIssueComment[] => [],
    ),
    gh<ApiRepo>(`/repos/${pr.owner}/${pr.repo}`).catch((): ApiRepo => ({})),
    canBypassRules(pr),
  ])
  let mergeableState = pull.mergeable_state
  if (mergeableState === 'unknown') {
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS))
    mergeableState = await gh<{ mergeable_state?: string }>(base)
      .then((p) => p.mergeable_state)
      .catch(() => mergeableState)
  }
  const pages = Math.min(MAX_PAGES, Math.ceil(pull.review_comments / 100))
  const lists = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      gh<ApiReviewComment[]>(`${base}/comments?per_page=100&page=${i + 1}`, undefined, undefined, HTML),
    ),
  )

  const threads = new Map<string, Thread[]>()
  const byFile = new Map<string, number>()
  for (const { root, comments } of groupThreads(lists.flat().map((c) => ({ ...c, inReplyTo: c.in_reply_to_id })))) {
    const thread: Thread = {
      id: root.id,
      path: root.path,
      side: root.side === 'LEFT' ? 'old' : 'new',
      line: root.line!,
      startLine: root.start_line ?? undefined,
      comments: comments.map(comment),
    }
    threads.set(root.path, [...(threads.get(root.path) ?? []), thread])
    byFile.set(root.path, (byFile.get(root.path) ?? 0) + comments.length)
  }

  const reviewNotes = reviews
    .filter((r) => r.body_html?.trim() && r.submitted_at)
    .map((r) => ({
      id: r.id,
      author: r.user?.login ?? 'ghost',
      avatar: avatarUrl(r.user?.avatar_url),
      bodyHtml: r.body_html!,
      createdAt: r.submitted_at!,
      url: r.html_url,
      verdict: VERDICTS[r.state],
    }))
  const discussion = [...issueComments.map(comment), ...reviewNotes].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return {
    conversation: pull.comments,
    code: pull.review_comments,
    byFile,
    threads,
    discussion,
    viewer,
    reviews: summarizeReviews(
      reviews.map((r) => ({ login: r.user?.login ?? '', state: r.state })),
      viewer,
    ),
    readiness: mergeReadiness(mergeableState),
    canMerge: !repo.archived && Boolean(repo.permissions?.push || repo.permissions?.maintain || repo.permissions?.admin),
    canBypass,
  }
}
