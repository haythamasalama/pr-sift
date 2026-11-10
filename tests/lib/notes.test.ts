import { describe, expect, it } from 'vitest'
import { anchorOf, buildClaudePrompt, githubLineUrl } from '../../src/lib/notes'
import { parsePatch } from '../../src/lib/diff'
import type { Note } from '../../src/lib/types'
import { PR, file } from '../helpers/fixtures'

const note = (overrides: Partial<Note> = {}): Note => ({
  id: '1',
  file: 'src/a.php',
  side: 'new',
  line: 2,
  lineText: 'use New;',
  quote: '',
  text: 'Why?',
  createdAt: 0,
  ...overrides,
})

describe('anchorOf', () => {
  const rows = parsePatch('@@ -5,2 +5,2 @@\n ctx\n-old\n+new')

  it('uses the new line number for context and added rows', () => {
    expect(anchorOf(rows[1]!)).toEqual({ side: 'new', line: 5 })
    expect(anchorOf(rows[3]!)).toEqual({ side: 'new', line: 6 })
  })

  it('uses the old line number for removed rows', () => {
    expect(anchorOf(rows[2]!)).toEqual({ side: 'old', line: 6 })
  })

  it('has no anchor for hunk headers', () => {
    expect(anchorOf(rows[0]!)).toBeNull()
  })
})

describe('buildClaudePrompt', () => {
  const patch = '@@ -1,3 +1,3 @@\n a\n-b\n+c\n d'
  const files = [file('src/a.php', { patch })]

  it('lists the pull request and every note with its code context', () => {
    const prompt = buildClaudePrompt(PR, 'My title', [note({ line: 2, quote: 'c', text: 'Rename this' })], files)
    expect(prompt).toContain('https://github.com/o/r/pull/7')
    expect(prompt).toContain('"My title"')
    expect(prompt).toContain('## src/a.php')
    expect(prompt).toContain('### Line 2 (new code)')
    expect(prompt).toContain('+c')
    expect(prompt).toContain('Selected: `c`')
    expect(prompt).toContain('Note: Rename this')
    expect(prompt).toContain('Do not post anything to GitHub')
  })

  it('orders notes by file and line', () => {
    const prompt = buildClaudePrompt(
      PR,
      't',
      [
        note({ file: 'z.php', line: 1, text: 'second' }),
        note({ id: '2', line: 3, text: 'third' }),
        note({ id: '3', line: 1, text: 'first' }),
      ],
      files,
    )
    expect(prompt.indexOf('first')).toBeLessThan(prompt.indexOf('third'))
    expect(prompt.indexOf('third')).toBeLessThan(prompt.indexOf('second'))
  })

  it('falls back to the stored line when the patch is unavailable', () => {
    const prompt = buildClaudePrompt(PR, 't', [note({ lineText: 'fallback code' })], [file('src/a.php', { patch: undefined })])
    expect(prompt).toContain('fallback code')
  })

  it('labels removed code', () => {
    const prompt = buildClaudePrompt(PR, 't', [note({ side: 'old', line: 2 })], files)
    expect(prompt).toContain('removed code')
    expect(prompt).toContain('-b')
  })
})

describe('githubLineUrl', () => {
  it('links to the changed file with a SHA-256 anchor', async () => {
    const url = await githubLineUrl(PR, { file: 'src/a.php', side: 'new', line: 12 })
    expect(url).toMatch(/^https:\/\/github\.com\/o\/r\/pull\/7\/files#diff-[0-9a-f]{64}R12$/)
  })

  it('uses L for removed lines', async () => {
    const url = await githubLineUrl(PR, { file: 'src/a.php', side: 'old', line: 3 })
    expect(url.endsWith('L3')).toBe(true)
  })

  it('is stable for the same path', async () => {
    const a = await githubLineUrl(PR, { file: 'x', side: 'new', line: 1 })
    const b = await githubLineUrl(PR, { file: 'x', side: 'new', line: 2 })
    expect(a.slice(0, -2)).toBe(b.slice(0, -2))
  })
})

describe('multi-line notes', () => {
  const patch = '@@ -1,5 +1,5 @@\n a\n b\n c\n d\n e'
  const files = [file('src/a.php', { patch })]

  it('labels the range and includes every selected line', () => {
    const prompt = buildClaudePrompt(PR, 'T', [note({ line: 4, startLine: 2 })], files)
    expect(prompt).toContain('### Lines 2–4 (new code)')
    expect(prompt).toContain(' b\n c\n d')
  })

  it('links to the range on GitHub', async () => {
    expect(await githubLineUrl(PR, { file: 'src/a.php', side: 'new', line: 4, startLine: 2 })).toMatch(/R2-R4$/)
  })
})
