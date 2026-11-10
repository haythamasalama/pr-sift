import { gh } from './github'
import type { Note, PrRef } from './types'

export function commentBody(note: Pick<Note, 'quote' | 'text'>): string {
  const quote = note.quote.trim()
  return quote ? `> ${quote.replace(/\n/g, '\n> ')}\n\n${note.text}` : note.text
}

export async function postReviewComment(pr: PrRef, note: Note): Promise<string> {
  const base = `/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}`
  const pull = await gh<{ head: { sha: string } }>(base)
  const created = await gh<{ html_url: string }>(`${base}/comments`, 'POST', {
    body: commentBody(note),
    commit_id: pull.head.sha,
    path: note.file,
    line: note.line,
    side: note.side === 'new' ? 'RIGHT' : 'LEFT',
    ...(note.startLine !== undefined && note.startLine < note.line
      ? { start_line: note.startLine, start_side: note.side === 'new' ? 'RIGHT' : 'LEFT' }
      : {}),
  })
  return created.html_url
}
