import { describe, expect, it } from 'vitest'
import { commentBody, postReviewComment } from '../../src/lib/review'
import type { Note } from '../../src/lib/types'
import { installChrome } from '../helpers/chrome'
import { PR } from '@pr-sift/core/testing'

const note: Note = { id: '1', file: 'src/a.php', side: 'new', line: 4, lineText: '', quote: '', text: 'Please rename', createdAt: 0 }

describe('commentBody', () => {
  it('uses the note text as is', () => {
    expect(commentBody(note)).toBe('Please rename')
  })

  it('quotes the selected code above the note', () => {
    expect(commentBody({ ...note, quote: 'a\nb' })).toBe('> a\n> b\n\nPlease rename')
  })
})

describe('postReviewComment', () => {
  it('posts a line comment on the head commit and returns its URL', async () => {
    const { sent } = installChrome((message) => {
      const { path, method } = message as unknown as { path: string; method?: string }
      if (path.endsWith('/comments') && method === 'POST')
        return { ok: true, status: 201, data: { html_url: 'https://github.com/o/r/pull/7#discussion_r1' } }
      return { ok: true, status: 200, data: { head: { sha: 'abc123' } } }
    })

    const url = await postReviewComment(PR, note)

    expect(url).toBe('https://github.com/o/r/pull/7#discussion_r1')
    const post = sent.find((m) => m.method === 'POST')!
    expect(post.path).toBe('/repos/o/r/pulls/7/comments')
    expect(post.body).toEqual({ body: 'Please rename', commit_id: 'abc123', path: 'src/a.php', line: 4, side: 'RIGHT' })
  })

  it('sends a start line for multi-line notes', async () => {
    const { sent } = installChrome(() => ({ ok: true, status: 200, data: { head: { sha: 's' }, html_url: 'u' } }))
    await postReviewComment(PR, { ...note, startLine: 2 })
    expect(sent.find((m) => m.method === 'POST')!.body).toMatchObject({ line: 4, start_line: 2, start_side: 'RIGHT', side: 'RIGHT' })
  })

  it('uses the left side for removed lines', async () => {
    const { sent } = installChrome(() => ({ ok: true, status: 200, data: { head: { sha: 's' }, html_url: 'u' } }))
    await postReviewComment(PR, { ...note, side: 'old' })
    expect(sent.find((m) => m.method === 'POST')!.body).toMatchObject({ side: 'LEFT' })
  })

  it('surfaces the API error message', async () => {
    installChrome(() => ({ ok: false, status: 422, data: { message: 'Line could not be resolved' } }))
    await expect(postReviewComment(PR, note)).rejects.toThrow('422: Line could not be resolved')
  })

  it('fails with a clear message when no token is configured', async () => {
    installChrome()
    await expect(postReviewComment(PR, note)).rejects.toThrow('401')
  })
})
