import type { CommitSummary, MergeMethod, ReviewEvent, SquashMessageMode, SquashTitleMode } from '@pr-sift/core'
import { GhError, gh } from './github'
import type { PrRef } from '../../lib/types'

export interface MergeContext {
  title: string
  body: string
  author?: string
  headSha: string
  headLabel: string
  commits: CommitSummary[]
  allowed: Record<MergeMethod, boolean>
  squashTitle?: SquashTitleMode
  squashMessage?: SquashMessageMode
  mergeableState?: string
}

interface ApiPull {
  title: string
  body: string | null
  commits: number
  mergeable_state?: string
  user?: { login?: string } | null
  head: { sha: string; label?: string }
}

interface ApiRepo {
  allow_squash_merge?: boolean
  allow_merge_commit?: boolean
  allow_rebase_merge?: boolean
  squash_merge_commit_title?: SquashTitleMode
  squash_merge_commit_message?: SquashMessageMode
}

interface ApiCommit {
  commit: { message: string; author: { name: string; email: string } | null }
  author: { login?: string } | null
}

const MAX_COMMIT_PAGES = 3

const repoPath = (pr: PrRef) => `/repos/${pr.owner}/${pr.repo}`
const pullPath = (pr: PrRef) => `${repoPath(pr)}/pulls/${pr.number}`

export async function loadMergeContext(pr: PrRef): Promise<MergeContext> {
  const [pull, repo] = await Promise.all([gh<ApiPull>(pullPath(pr)), gh<ApiRepo>(repoPath(pr)).catch((): ApiRepo => ({}))])
  const pages = Math.min(MAX_COMMIT_PAGES, Math.max(1, Math.ceil(pull.commits / 100)))
  const lists = await Promise.all(
    Array.from({ length: pages }, (_, i) => gh<ApiCommit[]>(`${pullPath(pr)}/commits?per_page=100&page=${i + 1}`)),
  )
  return {
    title: pull.title,
    body: pull.body ?? '',
    author: pull.user?.login,
    headSha: pull.head.sha,
    headLabel: (pull.head.label ?? '').replace(':', '/'),
    commits: lists.flat().map((c) => ({
      message: c.commit.message,
      author: { name: c.commit.author?.name ?? '', email: c.commit.author?.email ?? '', login: c.author?.login },
    })),
    allowed: {
      squash: repo.allow_squash_merge !== false,
      merge: repo.allow_merge_commit !== false,
      rebase: repo.allow_rebase_merge !== false,
    },
    squashTitle: repo.squash_merge_commit_title,
    squashMessage: repo.squash_merge_commit_message,
    mergeableState: pull.mergeable_state,
  }
}

export function submitReview(pr: PrRef, sha: string, event: ReviewEvent, comment: string) {
  return gh(`${pullPath(pr)}/reviews`, 'POST', {
    event,
    ...(sha ? { commit_id: sha } : {}),
    ...(comment.trim() ? { body: comment.trim() } : {}),
  })
}

export interface MergeRequest {
  method: MergeMethod
  sha: string
  title: string
  message: string
}

export async function merge(pr: PrRef, request: MergeRequest): Promise<string> {
  const result = await gh<{ sha: string }>(`${pullPath(pr)}/merge`, 'PUT', {
    merge_method: request.method,
    sha: request.sha,
    ...(request.method === 'rebase' ? {} : { commit_title: request.title, commit_message: request.message }),
  })
  return result.sha
}

export function explain(error: unknown, action: 'review' | 'merge'): string {
  if (error instanceof GhError && (error.status === 403 || error.status === 404)) {
    return action === 'merge'
      ? 'Your token can’t merge here. Give it Contents and Pull requests set to read and write, and access to this repository.'
      : 'Your token can’t review here. Give it Pull requests set to read and write, and access to this repository.'
  }
  if (error instanceof GhError && error.status === 409) return 'New commits were pushed. Refresh the review and try again.'
  return error instanceof Error ? error.message.replace(/^\d+: /, '') : String(error)
}
