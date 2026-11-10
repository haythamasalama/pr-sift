import { buildTree } from './tree'
import type { PrFile, TreeNode } from './types'

export interface ScopeItem {
  key: string
  label: string
  count: number
  hint?: string
}

export interface ScopeGroup {
  parent: string
  total: number
  items: ScopeItem[]
}

export interface SmartScopes {
  categories: ScopeItem[]
  recurring: ScopeItem[]
  groups: ScopeGroup[]
}

const segments = (filename: string) => filename.split('/').slice(0, -1)
const base = (filename: string) => filename.split('/').pop() ?? filename

const CATEGORIES: { id: string; label: string; test: (filename: string) => boolean }[] = [
  {
    id: 'tests',
    label: 'Tests',
    test: (f) =>
      segments(f).some((s) => /^(tests?|__tests__|specs?|e2e|cypress)$/i.test(s)) ||
      /([._-])(test|spec)\.[a-z]+$/i.test(base(f)) ||
      /Tests?\.[a-z]+$/.test(base(f)),
  },
  {
    id: 'docs',
    label: 'Docs',
    test: (f) => /\.(md|mdx|rst|txt)$/i.test(f) || segments(f).some((s) => /^(docs?|documentation)$/i.test(s)),
  },
  {
    id: 'migrations',
    label: 'Migrations',
    test: (f) => segments(f).some((s) => /^(migrations?|migrate)$/i.test(s)),
  },
  {
    id: 'translations',
    label: 'Translations',
    test: (f) => segments(f).some((s) => /^(lang|locales?|i18n|l10n|translations?)$/i.test(s)),
  },
  {
    id: 'config',
    label: 'Config',
    test: (f) => segments(f).some((s) => /^configs?$/i.test(s)) || /\.config\.[a-z]+$/i.test(base(f)),
  },
  {
    id: 'ci',
    label: 'CI / Docker',
    test: (f) => f.startsWith('.github/') || /^(Dockerfile|docker-compose)/i.test(base(f)) || segments(f).includes('docker'),
  },
]

export function matchesScope(filename: string, key: string): boolean {
  const sep = key.indexOf(':')
  const kind = key.slice(0, sep)
  const value = key.slice(sep + 1)
  if (kind === 'path') return filename === value || filename.startsWith(value + '/')
  if (kind === 'name') return segments(filename).includes(value)
  return CATEGORIES.find((c) => c.id === value)?.test(filename) ?? false
}

export function scopeLabel(key: string): string {
  const sep = key.indexOf(':')
  const kind = key.slice(0, sep)
  const value = key.slice(sep + 1)
  if (kind === 'cat') return CATEGORIES.find((c) => c.id === value)?.label ?? value
  return kind === 'name' ? `${value}/` : value
}

function collectGroups(node: TreeNode, out: ScopeGroup[], depth = 0) {
  if (node.dirs.length >= 2) {
    out.push({
      parent: node.path,
      total: node.count,
      items: [...node.dirs].sort((a, b) => b.count - a.count).map((d) => ({ key: 'path:' + d.path, label: d.name, count: d.count })),
    })
  }
  if (depth < 5) node.dirs.forEach((d) => collectGroups(d, out, depth + 1))
}

export function buildSmartScopes(files: PrFile[]): SmartScopes {
  const categories = CATEGORIES.map((c) => ({
    key: 'cat:' + c.id,
    label: c.label,
    count: files.filter((f) => c.test(f.filename)).length,
  })).filter((c) => c.count > 0)

  const byName = new Map<string, { paths: Set<string>; files: number }>()
  for (const f of files) {
    const parts = segments(f.filename)
    const seen = new Set<string>()
    parts.forEach((name, i) => {
      if (seen.has(name)) return
      seen.add(name)
      const entry = byName.get(name) ?? { paths: new Set<string>(), files: 0 }
      entry.paths.add(parts.slice(0, i + 1).join('/'))
      entry.files++
      byName.set(name, entry)
    })
  }
  const recurring = [...byName]
    .filter(([, v]) => v.paths.size >= 2 && v.files >= 2)
    .sort((a, b) => b[1].files - a[1].files)
    .slice(0, 16)
    .map(([name, v]) => ({ key: 'name:' + name, label: name, count: v.files, hint: `${v.paths.size} places` }))

  const groups: ScopeGroup[] = []
  collectGroups(buildTree(files), groups)
  groups.sort((a, b) => b.total - a.total)

  return { categories, recurring, groups }
}
