import { describe, expect, it } from 'vitest'
import { highlighterReady, highlightRows, loadHighlighter, plainSnippet } from '../../../src/features/diff/highlight'
import { parsePatch } from '@pr-sift/core'

describe('highlight loader', () => {
  it('loads the highlighter once and keeps it for later calls', async () => {
    const first = loadHighlighter()
    expect(loadHighlighter()).toBe(first)
    const highlighter = await first
    expect(highlighterReady()).toBe(highlighter)
    expect(highlighter.languageFor('a.ts')).toBe('ts')
  })

  it('colours diff rows once loaded', async () => {
    const rows = parsePatch('@@ -0,0 +1 @@\n+const a = 1')
    const html = [...(await highlightRows(rows, 'a.ts')).values()].join('')
    expect(html).toContain('hljs-keyword')
  })

  it('escapes a snippet shown before the colours arrive', () => {
    expect(plainSnippet('<a> & b')).toBe('&lt;a&gt; &amp; b')
  })
})
