import { avatarUrl, parseDiff } from '@pr-sift/core'
import type { PrFile, PrRef } from '../../lib/types'
import { gh } from './github'
import { basePath, fetchDiff } from './pull'

export interface PrCommit {
  sha: string
  short: string
  message: string
  author: string
  avatar?: string
  date: string
  parent?: string
}

// A slice of the pull request's commits, by position in the list, oldest first.
export interface CommitRange {
  from: number
  to: number
}

interface ApiCommit {
  sha: string
  commit: { message: string; author: { name: string; date: string } | null; committer?: { date: string } | null }
  author: { login?: string; avatar_url?: string } | null
  parents: { sha: string }[]
}

export async function fetchCommits(pr: PrRef): Promise<PrCommit[]> {
  const list = await gh<ApiCommit[]>(`/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}/commits?per_page=100`)
  return list.map((c) => ({
    sha: c.sha,
    short: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0] ?? '',
    author: c.author?.login ?? c.commit.author?.name ?? '',
    avatar: avatarUrl(c.author?.avatar_url),
    date: c.commit.author?.date ?? c.commit.committer?.date ?? '',
    parent: c.parents[0]?.sha,
  }))
}

// The github.com path whose .diff holds exactly the changes of these commits.
export function rangePath(pr: PrRef, commits: PrCommit[], range: CommitRange): string {
  const first = commits[range.from]!
  const last = commits[range.to]!
  if (range.from === range.to) return `/${pr.owner}/${pr.repo}/commit/${last.sha}`
  return `/${pr.owner}/${pr.repo}/compare/${first.parent ?? `${first.sha}~1`}..${last.sha}`
}

export async function loadCommitFiles(pr: PrRef, commits: PrCommit[], range: CommitRange): Promise<PrFile[]> {
  return parseDiff(await fetchDiff(rangePath(pr, commits, range)), basePath(pr))
}

// Clicking picks one commit; shift-click stretches the pick into a range from the commit already picked.
export function pickRange(current: CommitRange | null, index: number, extend: boolean): CommitRange {
  if (!extend || !current) return { from: index, to: index }
  return { from: Math.min(current.from, index), to: Math.max(current.to, index) }
}
