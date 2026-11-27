import hljs, { type LanguageFn, type Mode } from 'highlight.js'
import javascript from 'highlight.js/lib/languages/javascript'
import php from 'highlight.js/lib/languages/php'
import typescript from 'highlight.js/lib/languages/typescript'
import type { DiffRow } from '../../lib/types'

const TEXT_SCOPES = new Set(['string', 'comment', 'regexp', 'doctag'])

// Nested code, like call arguments, has its own list of modes, so the extra modes go into every list that reuses the
// language's own top-level modes, skipping strings and comments.
const withModes =
  (base: LanguageFn, modes: Mode[]): LanguageFn =>
  (api) => {
    const language = base(api)
    const topLevel = new Set(language.contains ?? [])
    const seen = new Set<object>()
    const visit = (mode: Mode) => {
      if (seen.has(mode)) return
      seen.add(mode)
      const scope = mode.scope ?? mode.className
      if (typeof scope === 'string' && TEXT_SCOPES.has(scope)) return
      const contains = mode.contains ?? []
      for (const child of contains) if (typeof child === 'object') visit(child)
      if (mode === language || contains.some((child) => topLevel.has(child))) mode.contains = [...modes, ...contains]
    }
    visit(language as Mode)
    return language
  }

// GitHub colors operators like keywords. A lone `<` or `/` is left out, and so is an operator right before one: the
// grammar needs to see those to find JSX tags, regexes and comments.
const OPERATOR: Mode = {
  match: /(?:=>|[=!]=?=?|<=|>=|&&|\|\||\?\?=?|\*\*=?|[-+*%&|^]=?|\?(?![.?>])|>)(?!\s*[</])/,
  scope: 'operator',
}

const PHP_NAME = /[a-zA-Z_\x7f-\xff][\w\x7f-\xff]*/

// highlight.js colors a member named like a keyword ($table->string(), ->and()) as that keyword, and leaves the
// `function` of a closure uncolored.
hljs.registerLanguage(
  'php',
  withModes(php, [
    { match: [/\?->|->|::/, /\s*/, new RegExp(`${PHP_NAME.source}(?=\\s*\\()`)], scope: { 3: 'title.function.invoke' } },
    { match: [/\?->|->/, /\s*/, PHP_NAME], scope: { 3: 'property' } },
    { match: /\bfunction\b(?=\s*(?:use\b|\())/, scope: 'keyword' },
    OPERATOR,
  ]),
)

const TYPE_ARGUMENTS_AHEAD = /(?=<[^<>()]*(?:<[^<>()]*>[^<>()]*)*>\s*\()/

const TYPE_ARGUMENTS: Mode = {
  begin: /</,
  end: />/,
  beginScope: 'operator',
  endScope: 'operator',
  contains: [
    'self',
    { match: /\b(?:null|undefined|true|false)\b/, scope: 'literal' },
    { match: /\b(?:string|number|boolean|bigint|symbol|object|any|unknown|never|void)\b/, scope: 'built_in' },
    { match: /[|&]/, scope: 'operator' },
  ],
}

// Without these, the type arguments of a call like ref<Point | null>(null) are read as a JSX tag, and every line
// after it loses its colors.
const SCRIPT_MODES: Mode[] = [
  { match: new RegExp(`\\b[A-Za-z_$][\\w$]*${TYPE_ARGUMENTS_AHEAD.source}`), scope: 'title.function' },
  { ...TYPE_ARGUMENTS, begin: new RegExp(`(?<=[\\w$])${TYPE_ARGUMENTS_AHEAD.source}<`) },
  { match: [/\bMath\b/, /\./, /[A-Za-z_$][\w$]*/], scope: { 1: 'variable.constant', 3: 'variable.constant' } },
  OPERATOR,
]

// The `=>` of an arrow function is swallowed by the mode that finds its parameters, so it is colored there.
const withArrows =
  (base: LanguageFn): LanguageFn =>
  (api) => {
    const language = base(api)
    const seen = new Set<object>()
    const visit = (mode: Mode) => {
      if (seen.has(mode)) return
      seen.add(mode)
      if (mode.end === '\\s*=>') mode.endScope = 'operator'
      for (const child of [...(mode.contains ?? []), ...(mode.variants ?? [])]) if (typeof child === 'object') visit(child)
    }
    visit(language as Mode)
    return language
  }

hljs.registerLanguage('typescript', withModes(withArrows(typescript), SCRIPT_MODES))
hljs.registerLanguage('javascript', withModes(withArrows(javascript), SCRIPT_MODES))

const SFC = 'sfc'
const SFC_EXTENSIONS = new Set(['vue', 'svelte', 'astro'])

export function languageFor(filename: string): string | null {
  const base = filename.toLowerCase().split('/').pop()!
  if (base.endsWith('.blade.php')) return 'php-template'
  const extension = base.slice(base.lastIndexOf('.') + 1)
  if (SFC_EXTENSIONS.has(extension)) return SFC
  if (hljs.getLanguage(extension)) return extension
  const name = base.split('.')[0]!
  return name && hljs.getLanguage(name) ? name : null
}

const DETECT_SAMPLE = 4000
const MIN_RELEVANCE = 8
// Guessing among every language picks rare ones for ordinary code (TypeScript came out as Dart), so guesses stay
// within the languages most code is written in.
const GUESSABLE = [
  'bash',
  'c',
  'cpp',
  'csharp',
  'css',
  'dockerfile',
  'go',
  'graphql',
  'ini',
  'java',
  'javascript',
  'json',
  'kotlin',
  'less',
  'lua',
  'makefile',
  'markdown',
  'objectivec',
  'perl',
  'php',
  'python',
  'r',
  'ruby',
  'rust',
  'scss',
  'sql',
  'swift',
  'typescript',
  'xml',
  'yaml',
]

const INTERPRETER_LANGUAGE: Record<string, string> = { node: 'javascript', deno: 'typescript', bun: 'typescript' }

function shebangLanguage(code: string): string | null {
  const first = code.trimStart().split('\n', 1)[0]!
  if (!first.startsWith('#!')) return null
  const [program = '', ...args] = first.slice(2).trim().split(/\s+/)
  const name = program.split('/').pop()!
  const interpreter = name === 'env' ? (args.find((arg) => !arg.startsWith('-')) ?? '') : name
  const bare = interpreter.replace(/[\d.]+$/, '')
  const language = INTERPRETER_LANGUAGE[bare] ?? bare
  return hljs.getLanguage(language) ? language : null
}

// Files whose name says nothing (README, Gemfile, .bashrc, an unknown extension) are colored by their shebang or by
// the language the code looks like, and left plain when nothing matches well enough to trust.
function detectLanguage(code: string): string | null {
  if (!code.trim()) return null
  const fromShebang = shebangLanguage(code)
  if (fromShebang) return fromShebang
  const guess = hljs.highlightAuto(code.slice(0, DETECT_SAMPLE), GUESSABLE)
  return guess.language && guess.relevance >= MIN_RELEVANCE ? guess.language : null
}

const resolveLanguage = (filename: string, code: () => string) => languageFor(filename) ?? detectLanguage(code())

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

const escape = (text: string) => text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

function highlightBlock(texts: string[], language: string): string[] {
  if (language === SFC) return highlightSfc(texts)
  try {
    return splitLines(hljs.highlight(texts.join('\n'), { language, ignoreIllegals: true }).value)
  } catch {
    return texts.map(escape)
  }
}

type Section = 'markup' | 'script' | 'style'

const SECTION_TAG = /^<(\/?)(script|style|template)\b/

const styleLanguage = (tag: string) => {
  const lang = tag.match(/\blang=["']?(\w+)/)?.[1]
  if (lang === 'sass') return 'scss'
  return lang && hljs.getLanguage(lang) ? lang : 'css'
}

// A hunk often starts inside <script> or <style> without the tag itself, so the section is guessed from the first
// top-level tag in the hunk, or from the code when the hunk has none.
function startingSection(texts: string[]): Section {
  for (const text of texts) {
    const tag = text.match(SECTION_TAG)
    if (!tag) continue
    if (!tag[1] || tag[2] === 'template') return 'markup'
    return tag[2] as Section
  }
  const guess = hljs.highlightAuto(texts.join('\n'), ['typescript', 'xml', 'css', 'scss']).language
  if (guess === 'typescript') return 'script'
  return guess === 'css' || guess === 'scss' ? 'style' : 'markup'
}

function highlightSfc(texts: string[]): string[] {
  let section = startingSection(texts)
  let style = 'css'
  const out: string[] = []
  let segment: string[] = []
  let segmentLanguage = ''
  for (const text of texts) {
    const tag = text.match(SECTION_TAG)
    let language: string
    if (tag) {
      language = 'xml'
      if (tag[1] || tag[2] === 'template') section = 'markup'
      else if (tag[2] === 'script') section = text.includes('</script>') ? 'markup' : 'script'
      else {
        style = styleLanguage(text)
        section = text.includes('</style>') ? 'markup' : 'style'
      }
    } else language = section === 'script' ? 'typescript' : section === 'style' ? style : 'xml'
    if (language !== segmentLanguage && segment.length) {
      out.push(...highlightBlock(segment, segmentLanguage))
      segment = []
    }
    segmentLanguage = language
    segment.push(text)
  }
  if (segment.length) out.push(...highlightBlock(segment, segmentLanguage))
  return out
}

export function highlightSnippet(code: string, filename: string): string {
  const language = resolveLanguage(filename, () => code)
  return language ? highlightBlock(code.split('\n'), language).join('\n') : escape(code)
}

const MAX_ROWS = 3000

export function highlightRows(rows: DiffRow[], filename: string): Map<number, string> {
  const result = new Map<number, string>()
  if (rows.length > MAX_ROWS) return result
  const language = resolveLanguage(filename, () =>
    rows
      .filter((row) => row.kind !== 'hunk')
      .map((row) => row.text)
      .join('\n'),
  )
  if (!language) return result

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
