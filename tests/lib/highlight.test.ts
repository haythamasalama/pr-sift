import { describe, expect, it } from 'vitest'
import { parsePatch } from '../../src/lib/diff'
import { highlightRows, languageFor } from '../../src/lib/highlight'

describe('languageFor', () => {
  it.each([
    ['app/Foo.php', 'php'],
    ['views/show.blade.php', 'php-template'],
    ['src/a.ts', 'typescript'],
    ['src/App.vue', 'xml'],
    ['config.yaml', 'yaml'],
    ['Dockerfile', 'dockerfile'],
  ])('%s -> %s', (name, language) => {
    expect(languageFor(name)).toBe(language)
  })

  it('returns null for unknown types', () => {
    expect(languageFor('data.bin')).toBeNull()
  })
})

describe('highlightRows', () => {
  it('produces one highlighted line per code row', () => {
    const rows = parsePatch('@@ -1,2 +1,2 @@\n <?php\n-$a = 1;\n+$a = "x";\n')
    const html = highlightRows(rows, 'a.php')
    expect([...html.keys()].sort()).toEqual([1, 2, 3])
    expect(html.get(3)).toContain('hljs-string')
  })

  it('closes spans at line breaks inside multi-line tokens', () => {
    const rows = parsePatch('@@ -1,3 +1,3 @@\n /**\n  * doc\n  */\n')
    const html = highlightRows(rows, 'a.php')
    for (const line of html.values()) {
      expect((line.match(/<span/g) ?? []).length).toBe((line.match(/<\/span>/g) ?? []).length)
    }
  })

  it('escapes markup coming from the code', () => {
    const rows = parsePatch('@@ -0,0 +1 @@\n+<script>alert(1)</script>\n')
    const html = highlightRows(rows, 'a.php')
    expect(html.get(1)).not.toContain('<script>')
  })

  it('does nothing for unknown languages or huge patches', () => {
    expect(highlightRows(parsePatch('@@ -1 +1 @@\n+a'), 'a.bin').size).toBe(0)
    const huge = parsePatch('@@ -1,5000 +1,5000 @@\n' + Array.from({ length: 5000 }, () => '+x').join('\n'))
    expect(highlightRows(huge, 'a.php').size).toBe(0)
  })
})
