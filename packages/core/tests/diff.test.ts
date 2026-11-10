import { describe, expect, it } from 'vitest'
import { buildSplitRows, parseDiff, parsePatch } from '../src/diff'
import { SAMPLE_DIFF } from '../src/testing'

describe('parseDiff', () => {
  const files = parseDiff(SAMPLE_DIFF, '/o/r/pull/1')
  const byName = Object.fromEntries(files.map((f) => [f.filename, f]))

  it('splits a unified diff into files', () => {
    expect(files.map((f) => f.filename)).toEqual([
      'src/Domain/Order/Actions/GetOrder.php',
      'resources/js/new.ts',
      'docs/old.md',
      'img/logo.png',
      'docs/README.md',
    ])
  })

  it('counts additions and deletions', () => {
    expect(byName['src/Domain/Order/Actions/GetOrder.php']).toMatchObject({ additions: 2, deletions: 1, status: 'modified' })
  })

  it('detects added, removed and renamed files', () => {
    expect(byName['resources/js/new.ts']!.status).toBe('added')
    expect(byName['docs/old.md']!.status).toBe('removed')
    expect(byName['docs/README.md']!.status).toBe('renamed')
  })

  it('leaves binary files without a patch', () => {
    expect(byName['img/logo.png']!.patch).toBeUndefined()
  })

  it('computes a content hash that changes with the patch', () => {
    const changed = parseDiff(SAMPLE_DIFF.replace('+use New', '+use Newer'), '/o/r/pull/1')
    expect(changed[0]!.hash).not.toBe(files[0]!.hash)
    expect(changed[1]!.hash).toBe(files[1]!.hash)
  })

  it('returns nothing for text that is not a diff', () => {
    expect(parseDiff('hello', '/x')).toEqual([])
  })
})

describe('parsePatch', () => {
  it('numbers old and new lines from the hunk header', () => {
    const rows = parsePatch('@@ -10,3 +20,3 @@ fn\n ctx\n-old\n+new\n')
    expect(rows[0]).toMatchObject({ kind: 'hunk' })
    expect(rows[1]).toMatchObject({ kind: 'ctx', oldNo: 10, newNo: 20, text: 'ctx' })
    expect(rows[2]).toMatchObject({ kind: 'del', oldNo: 11, newNo: '', text: 'old' })
    expect(rows[3]).toMatchObject({ kind: 'add', oldNo: '', newNo: 21, text: 'new' })
  })

  it('keeps the no-newline marker as a note', () => {
    const rows = parsePatch('@@ -1 +1 @@\n-a\n\\ No newline at end of file\n+b')
    expect(rows.map((r) => r.kind)).toEqual(['hunk', 'del', 'note', 'add'])
  })
})

describe('buildSplitRows', () => {
  it('pairs deletions with additions side by side', () => {
    const rows = parsePatch('@@ -1,3 +1,3 @@\n ctx\n-a\n-b\n+c\n+d\n tail')
    const split = buildSplitRows(rows)
    expect(split).toEqual([
      { full: 0, left: null, right: null },
      { full: null, left: 1, right: 1 },
      { full: null, left: 2, right: 4 },
      { full: null, left: 3, right: 5 },
      { full: null, left: 6, right: 6 },
    ])
  })

  it('leaves the other side empty for unbalanced blocks', () => {
    const rows = parsePatch('@@ -1,2 +1,1 @@\n-a\n-b\n+c')
    const split = buildSplitRows(rows)
    expect(split[2]).toEqual({ full: null, left: 2, right: null })
  })

  it('shows pure additions on the right only', () => {
    const rows = parsePatch('@@ -0,0 +1,1 @@\n+a')
    expect(buildSplitRows(rows)[1]).toEqual({ full: null, left: null, right: 1 })
  })
})
