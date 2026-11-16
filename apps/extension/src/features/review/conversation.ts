import { gh } from './github'
import type { PrRef } from '../../lib/types'

export interface Conversation {
  conversation: number
  code: number
  byFile: ReadonlyMap<string, number>
}

const MAX_PAGES = 10

export async function fetchConversation(pr: PrRef): Promise<Conversation> {
  const base = `/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}`
  const pull = await gh<{ comments: number; review_comments: number }>(base)
  const pages = Math.min(MAX_PAGES, Math.ceil(pull.review_comments / 100))
  const lists = await Promise.all(
    Array.from({ length: pages }, (_, i) => gh<{ path: string }[]>(`${base}/comments?per_page=100&page=${i + 1}`)),
  )
  const byFile = new Map<string, number>()
  for (const comment of lists.flat()) byFile.set(comment.path, (byFile.get(comment.path) ?? 0) + 1)
  return { conversation: pull.comments, code: pull.review_comments, byFile }
}
