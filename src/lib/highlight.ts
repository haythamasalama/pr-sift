import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import go from 'highlight.js/lib/languages/go'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import php from 'highlight.js/lib/languages/php'
import phpTemplate from 'highlight.js/lib/languages/php-template'
import python from 'highlight.js/lib/languages/python'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import scss from 'highlight.js/lib/languages/scss'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import type { DiffRow } from './types'

const languages = {
  bash,
  css,
  dockerfile,
  go,
  ini,
  java,
  javascript,
  json,
  markdown,
  php,
  'php-template': phpTemplate,
  python,
  ruby,
  rust,
  scss,
  sql,
  typescript,
  xml,
  yaml,
}
for (const [name, definition] of Object.entries(languages)) hljs.registerLanguage(name, definition)

const BY_SUFFIX: [string, string][] = [
  ['.blade.php', 'php-template'],
  ['.php', 'php'],
  ['.tsx', 'typescript'],
  ['.ts', 'typescript'],
  ['.jsx', 'javascript'],
  ['.mjs', 'javascript'],
  ['.cjs', 'javascript'],
  ['.js', 'javascript'],
  ['.vue', 'xml'],
  ['.html', 'xml'],
  ['.xml', 'xml'],
  ['.svg', 'xml'],
  ['.scss', 'scss'],
  ['.css', 'css'],
  ['.json', 'json'],
  ['.md', 'markdown'],
  ['.mdx', 'markdown'],
  ['.yml', 'yaml'],
  ['.yaml', 'yaml'],
  ['.sh', 'bash'],
  ['.sql', 'sql'],
  ['.py', 'python'],
  ['.rb', 'ruby'],
  ['.go', 'go'],
  ['.java', 'java'],
  ['.rs', 'rust'],
  ['.ini', 'ini'],
  ['.env', 'ini'],
]

export function languageFor(filename: string): string | null {
  const lower = filename.toLowerCase()
  if (lower.endsWith('dockerfile')) return 'dockerfile'
  return BY_SUFFIX.find(([suffix]) => lower.endsWith(suffix))?.[1] ?? null
}

function splitLines(html: string): string[] {
  const lines: string[] = []
  const open: string[] = []
  let current = ''
  for (const token of html.split(/(<span[^>]*>|<\/span>|\n)/)) {
    if (token === '\n') {
      lines.push(current + '</span>'.repeat(open.length))
      current = open.join('')
    } else if (token.startsWith('<span')) {
      open.push(token)
      current += token
    } else if (token === '</span>') {
      open.pop()
      current += token
    } else {
      current += token
    }
  }
  lines.push(current + '</span>'.repeat(open.length))
  return lines
}

function highlightBlock(texts: string[], language: string): string[] {
  try {
    return splitLines(hljs.highlight(texts.join('\n'), { language, ignoreIllegals: true }).value)
  } catch {
    return texts.map((t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!))
  }
}

const MAX_ROWS = 3000

export function highlightRows(rows: DiffRow[], filename: string): Map<number, string> {
  const language = languageFor(filename)
  const result = new Map<number, string>()
  if (!language || rows.length > MAX_ROWS) return result

  let start = 0
  const flush = (end: number) => {
    const oldSide: number[] = []
    const newSide: number[] = []
    for (let i = start; i < end; i++) {
      const kind = rows[i]!.kind
      if (kind === 'ctx' || kind === 'del') oldSide.push(i)
      if (kind === 'ctx' || kind === 'add') newSide.push(i)
    }
    const oldHtml = highlightBlock(
      oldSide.map((i) => rows[i]!.text),
      language,
    )
    const newHtml = highlightBlock(
      newSide.map((i) => rows[i]!.text),
      language,
    )
    oldSide.forEach((rowIndex, k) => {
      if (rows[rowIndex]!.kind === 'del') result.set(rowIndex, oldHtml[k] ?? '')
    })
    newSide.forEach((rowIndex, k) => result.set(rowIndex, newHtml[k] ?? ''))
  }

  rows.forEach((row, i) => {
    if (row.kind === 'hunk') {
      flush(i)
      start = i + 1
    }
  })
  flush(rows.length)
  return result
}
