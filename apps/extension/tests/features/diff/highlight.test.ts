import { describe, expect, it } from 'vitest'
import { parsePatch } from '@pr-sift/core'
import { highlightRows, languageFor, highlightSnippet } from '../../../src/features/diff/highlight'

describe('languageFor', () => {
  it.each([
    ['app/Foo.php', 'php'],
    ['views/show.blade.php', 'php-template'],
    ['src/a.ts', 'ts'],
    ['src/App.vue', 'sfc'],
    ['config.yaml', 'yaml'],
    ['Dockerfile', 'dockerfile'],
    ['app/Main.kt', 'kt'],
    ['Sources/App.swift', 'swift'],
    ['src/Program.cs', 'cs'],
    ['lib/main.dart', 'dart'],
    ['schema.graphql', 'graphql'],
    ['Makefile', 'makefile'],
    ['notes.txt', 'txt'],
  ])('%s -> %s', (name, language) => {
    expect(languageFor(name)).toBe(language)
  })

  it('returns null for unknown types', () => {
    expect(languageFor('data.bin')).toBeNull()
    expect(languageFor('README')).toBeNull()
    expect(languageFor('Gemfile')).toBeNull()
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

describe('highlightRows in single-file components', () => {
  it('colors a hunk that starts inside <script> as TypeScript', () => {
    const rows = parsePatch(
      '@@ -19,3 +19,3 @@\n const fit = ref(1);\n-const props = defineProps<{ images: string[] }>();\n+const props = defineProps<{ images: Image[] }>();\n',
    )
    const html = highlightRows(rows, 'resources/js/ImageViewer.vue')
    expect(html.get(1)).toContain('hljs-keyword')
    expect(html.get(3)).toContain('hljs-keyword')
  })

  it('switches language at the section tags', () => {
    const rows = parsePatch(
      '@@ -1,6 +1,6 @@\n <script setup lang="ts">\n const a = 1\n </script>\n <template>\n   <div :class="a" />\n </template>\n',
    )
    const html = highlightRows(rows, 'App.vue')
    expect(html.get(2)).toContain('hljs-keyword')
    expect(html.get(5)).toContain('hljs-tag')
  })

  it('colors a style hunk with the lang it declares', () => {
    const rows = parsePatch('@@ -1,3 +1,3 @@\n <style lang="scss">\n .a { color: red; }\n </style>\n')
    expect(highlightRows(rows, 'App.vue').get(2)).toContain('hljs-selector-class')
  })
})

describe('highlightRows for files whose name says nothing', () => {
  it.each([
    ['#!/usr/bin/env python3', 'import os', 'hljs-keyword'],
    ['#!/usr/bin/env -S node --no-warnings', 'import os from "node:os"', 'hljs-keyword'],
    ['#!/bin/bash', 'echo "$HOME"', 'hljs-built_in'],
  ])('follows the shebang %s', (shebang, code, token) => {
    const rows = parsePatch(`@@ -0,0 +1,2 @@\n+${shebang}\n+${code}\n`)
    expect(highlightRows(rows, 'bin/run').get(2)).toContain(token)
  })

  it('guesses the language from the code', () => {
    const rows = parsePatch(
      "@@ -0,0 +1,6 @@\n+source 'https://rubygems.org'\n+gem 'rails', '~> 7.1'\n+gem 'pg'\n+group :development do\n+  gem 'pry'\n+end\n",
    )
    expect(highlightRows(rows, 'Gemfile').get(6)).toContain('hljs-keyword')
  })

  it('leaves prose plain', () => {
    const rows = parsePatch('@@ -0,0 +1,2 @@\n+This project helps review large pull requests.\n+It works offline.\n')
    expect(highlightRows(rows, 'NOTICE').size).toBe(0)
  })
})

describe('member and call coloring', () => {
  const html = (code: string, file: string) => highlightSnippet(code, file)

  it('colors php members named like keywords as members', () => {
    const out = html("$table->string('metric');\nexpect($a)->and($b);\n$invoice->lines;", 'a.php')
    expect(out).toContain('<span class="hljs-title function_ invoke__">string</span>')
    expect(out).toContain('<span class="hljs-title function_ invoke__">and</span>')
    expect(out).toContain('<span class="hljs-property">lines</span>')
    expect(out).toContain('<span class="hljs-variable">$table</span>')
  })

  it('colors the function keyword of a php closure', () => {
    expect(html("it('bills', function () {});", 'a.php')).toContain('<span class="hljs-keyword">function</span>')
  })

  it('colors typescript calls with type arguments', () => {
    const out = html('defineProps<{ a?: boolean }>()\nref<number | null>(null)', 'a.ts')
    expect(out).toContain('<span class="hljs-title function_">defineProps</span>')
    expect(out).toContain('<span class="hljs-title function_">ref</span>')
  })

  it('keeps coloring the lines after a call with a union type argument', () => {
    const out = html('const a = ref<Point | null>(null);\nconst b = computed(() => 1);', 'a.ts').split('\n')[1]!
    expect(out).toContain('<span class="hljs-keyword">const</span>')
    expect(out).toContain('<span class="hljs-title function_">computed</span>')
    expect(out).not.toContain('language-xml')
  })

  it('colors operators and arrows like GitHub', () => {
    const out = html('const a = b === null || !c ? d ?? 0 : x.y?.z;\nconst f = () => 1;', 'a.ts')
    for (const op of ['=', '===', '||', '!', '?', '??', '=&gt;']) expect(out).toContain(`<span class="hljs-operator">${op}</span>`)
    expect(out).not.toContain('<span class="hljs-operator">?.</span>')
  })

  it('leaves jsx tags and comments alone', () => {
    const out = html('const el = <div>{a > 1}</div>; // note', 'a.tsx')
    expect(out).toContain('<span class="hljs-name">div</span>')
    expect(out).toContain('<span class="hljs-comment">// note</span>')
  })

  it('colors php operators', () => {
    const out = html('$x = !$a && $b ?? [1 => 2];', 'a.php')
    for (const op of ['=', '!', '&amp;&amp;', '??', '=&gt;']) expect(out).toContain(`<span class="hljs-operator">${op}</span>`)
  })
})

describe('highlightSnippet', () => {
  it('colors code by the file it comes from', () => {
    expect(highlightSnippet("auth()->user()->can('billing')", 'src/A.php')).toContain('hljs-string')
  })

  it('escapes code it cannot color', () => {
    expect(highlightSnippet('<b>& more</b>', 'notes.unknown')).toBe('&lt;b&gt;&amp; more&lt;/b&gt;')
  })
})
