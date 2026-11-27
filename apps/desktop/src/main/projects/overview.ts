import { readdir, readFile, stat } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import type { ProjectOverview } from '#shared/ipc'
import { git } from '../exec'

const ICON_EXT: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}
const ICON_NAME = /^(favicon|logo|icon|app-icon|apple-touch-icon|logo-mark|mark|brand)(?:[-_.@]?[\w-]*)?$/i
const SKIP = new Set([
  'node_modules',
  'vendor',
  '.git',
  'dist',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.output',
  'target',
  'tmp',
  'storage',
  '.cache',
  'Pods',
  '__pycache__',
  '.venv',
  'venv',
  'test',
  'tests',
  'fixtures',
  'node',
])
const MAX_ICON = 512 * 1024

// Higher is better: a favicon in a public folder near the top beats a random logo deep inside the source.
export function scoreIcon(rel: string): number {
  const parts = rel.split(/[\\/]/)
  const file = parts.at(-1)!
  const name = file.slice(0, file.length - extname(file).length).toLowerCase()
  const dirs = parts.slice(0, -1).map((d) => d.toLowerCase())
  let score = 100 - dirs.length * 8
  if (name.startsWith('favicon')) score += 30
  else if (name.startsWith('apple-touch-icon')) score += 28
  else if (name.startsWith('logo')) score += 22
  else if (name.startsWith('icon') || name.startsWith('app-icon')) score += 20
  if (/(^|[-_.])(white|light|dark|black|mono|text|wordmark|full)([-_.]|$)/.test(name)) score -= 6
  if (dirs.some((d) => ['public', 'static', 'assets', 'images', 'img', 'app', 'brand', 'resources', 'build', '.github'].includes(d)))
    score += 10
  if (dirs.some((d) => ['docs', 'example', 'examples', 'demo', 'stories', 'icons', 'ui'].includes(d))) score -= 15
  const ext = extname(file).toLowerCase()
  score += ext === '.svg' ? 6 : ext === '.png' ? 4 : ext === '.ico' ? 2 : 0
  return score
}

// Looks a few folders down for the project's own favicon or logo, and returns it as a data URL.
export async function findIcon(root: string, maxDepth = 4, budget = 3000): Promise<string | undefined> {
  const found: { path: string; score: number }[] = []
  let seen = 0
  async function walk(dir: string, depth: number) {
    if (depth > maxDepth || seen > budget) return
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (++seen > budget) return
      if (e.isDirectory()) {
        if (!SKIP.has(e.name) && !(e.name.startsWith('.') && e.name !== '.github')) await walk(join(dir, e.name), depth + 1)
      } else if (e.isFile()) {
        const ext = extname(e.name).toLowerCase()
        if (ICON_EXT[ext] && ICON_NAME.test(e.name.slice(0, e.name.length - ext.length))) {
          const path = join(dir, e.name)
          found.push({ path, score: scoreIcon(relative(root, path)) })
        }
      }
    }
  }
  await walk(root, 0)
  found.sort((a, b) => b.score - a.score)
  for (const { path } of found.slice(0, 5)) {
    try {
      const info = await stat(path)
      if (!info.size || info.size > MAX_ICON) continue
      const data = await readFile(path)
      return `data:${ICON_EXT[extname(path).toLowerCase()]};base64,${data.toString('base64')}`
    } catch {
      continue
    }
  }
  return undefined
}

async function readJson(path: string): Promise<Record<string, unknown> | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>
  } catch {
    return undefined
  }
}
async function readText(path: string, max = 200_000) {
  try {
    const text = await readFile(path, 'utf8')
    return text.slice(0, max)
  } catch {
    return undefined
  }
}

const JS_STACK: [string, string][] = [
  ['nuxt', 'Nuxt'],
  ['next', 'Next.js'],
  ['vue', 'Vue'],
  ['react', 'React'],
  ['svelte', 'Svelte'],
  ['@angular/core', 'Angular'],
  ['@nestjs/core', 'NestJS'],
  ['express', 'Express'],
  ['fastify', 'Fastify'],
  ['hono', 'Hono'],
  ['electron', 'Electron'],
  ['react-native', 'React Native'],
  ['astro', 'Astro'],
  ['vite', 'Vite'],
  ['tailwindcss', 'Tailwind'],
  ['prisma', 'Prisma'],
  ['typescript', 'TypeScript'],
]

// What the project is built with, read from the files at its top level.
export async function detectStack(root: string): Promise<{ stack: string[]; description?: string; packageManager?: string }> {
  const stack: string[] = []
  let description: string | undefined
  let packageManager: string | undefined
  let names: string[] = []
  try {
    names = await readdir(root)
  } catch {
    return { stack }
  }
  const has = (n: string) => names.includes(n)
  const pkg = has('package.json') ? await readJson(join(root, 'package.json')) : undefined
  if (pkg) {
    const deps = { ...(pkg.dependencies as object), ...(pkg.devDependencies as object) } as Record<string, string>
    for (const [dep, label] of JS_STACK) if (dep in deps) stack.push(label)
    if (!stack.length) stack.push('Node.js')
    if (typeof pkg.description === 'string') description = pkg.description
    packageManager = has('pnpm-lock.yaml') ? 'pnpm' : has('yarn.lock') ? 'yarn' : has('bun.lockb') || has('bun.lock') ? 'bun' : 'npm'
  }
  const composer = has('composer.json') ? await readJson(join(root, 'composer.json')) : undefined
  if (composer) {
    const req = { ...(composer.require as object) } as Record<string, string>
    if ('laravel/framework' in req) stack.unshift('Laravel')
    else if (Object.keys(req).some((k) => k.startsWith('symfony/'))) stack.unshift('Symfony')
    stack.push('PHP')
    if (!description && typeof composer.description === 'string') description = composer.description
  }
  if (has('go.mod')) stack.push('Go')
  if (has('Cargo.toml')) stack.push('Rust')
  if (has('pyproject.toml') || has('requirements.txt') || has('setup.py')) {
    const text = ((await readText(join(root, 'pyproject.toml'))) ?? '') + ((await readText(join(root, 'requirements.txt'))) ?? '')
    if (/django/i.test(text)) stack.push('Django')
    else if (/fastapi/i.test(text)) stack.push('FastAPI')
    else if (/flask/i.test(text)) stack.push('Flask')
    stack.push('Python')
  }
  if (has('Gemfile')) stack.push((await readText(join(root, 'Gemfile')))?.includes('rails') ? 'Rails' : 'Ruby')
  if (has('pom.xml') || has('build.gradle') || has('build.gradle.kts')) stack.push(has('build.gradle.kts') ? 'Kotlin' : 'Java')
  if (has('pubspec.yaml')) stack.push('Flutter')
  if (names.some((n) => n.endsWith('.csproj') || n.endsWith('.sln'))) stack.push('.NET')
  if (has('Package.swift') || names.some((n) => n.endsWith('.xcodeproj'))) stack.push('Swift')
  if (has('pnpm-workspace.yaml') || has('turbo.json') || has('nx.json') || has('lerna.json')) stack.push('Monorepo')
  if (has('Dockerfile') || has('docker-compose.yml') || has('docker-compose.yaml') || has('compose.yaml')) stack.push('Docker')
  return { stack: [...new Set(stack)], description, packageManager }
}

// The first real paragraph of the README: no headings, badges, images or HTML.
export function readmeIntro(text: string): string | undefined {
  const blocks = text
    .replace(/\r/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(/\n\s*\n/)
  for (const block of blocks) {
    const b = block.trim()
    if (!b || /^(#|<|!\[|\[!\[|```|---|===|\||>|\* |- |\d+\. )/.test(b)) continue
    const plain = b
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (plain.length < 20) continue
    return plain.length > 320 ? `${plain.slice(0, 317).trimEnd()}…` : plain
  }
  return undefined
}

export async function overview(root: string): Promise<ProjectOverview> {
  const [detected, names, last, count, first, authors] = await Promise.all([
    detectStack(root),
    readdir(root).catch(() => [] as string[]),
    git(root, ['log', '-1', '--format=%ct%x1f%s%x1f%an']),
    git(root, ['rev-list', '--count', 'HEAD']),
    git(root, ['log', '--reverse', '--format=%ct', '--max-parents=0', 'HEAD']),
    git(root, ['shortlog', '-sn', '--no-merges', 'HEAD']),
  ])
  const readme = names.find((n) => /^readme(\.md|\.markdown|\.txt)?$/i.test(n))
  const intro = readme ? readmeIntro((await readText(join(root, readme), 40_000)) ?? '') : undefined
  const [at, subject, author] = last.stdout.trim().split('\u001f')
  return {
    ...detected,
    readme: intro,
    commits: count.code === 0 ? Number(count.stdout.trim()) || undefined : undefined,
    firstCommit: first.code === 0 && first.stdout.trim() ? Number(first.stdout.trim().split('\n')[0]) * 1000 : undefined,
    lastCommit: last.code === 0 && at ? { at: Number(at) * 1000, subject: subject ?? '', author: author ?? '' } : undefined,
    contributors: authors.code === 0 ? authors.stdout.split('\n').filter((l) => l.trim()).length || undefined : undefined,
  }
}
