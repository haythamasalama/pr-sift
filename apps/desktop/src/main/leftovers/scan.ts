import { lstat, readdir } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import type { Leftover } from '#shared/ipc'
import { git } from '../exec'
import { MEDIA_EXTENSIONS, MEDIA_MIN_BYTES, RULE_BY_NAME, toolCaches } from './rules'

export interface ScanOptions {
  roots: string[]
  depth: number
  platform: NodeJS.Platform
  home: string
  env: NodeJS.ProcessEnv
}

interface Candidate extends Leftover {
  repo?: string
}

const WALK_SKIP = new Set(['.git', '.hg', '.svn', '.Trash', 'Library', 'AppData'])

async function isDir(path: string) {
  try {
    return (await lstat(path)).isDirectory()
  } catch {
    return false
  }
}

// Keeps only what git does not track: inside a repository a folder must be ignored, a media file must be ignored or
// untracked. Outside a repository everything found counts.
async function untracked(candidates: Candidate[]): Promise<Leftover[]> {
  const byRepo = new Map<string, Candidate[]>()
  const kept: Leftover[] = []
  for (const c of candidates) {
    if (!c.repo) kept.push(strip(c))
    else byRepo.set(c.repo, [...(byRepo.get(c.repo) ?? []), c])
  }
  for (const [repo, list] of byRepo) {
    const rel = (c: Candidate) => relative(repo, c.path).split('\\').join('/')
    const ignoredRes = await git(repo, ['check-ignore', '--stdin', '-z'], list.map(rel).join('\0') + '\0')
    const ignored = new Set(ignoredRes.stdout.split('\0').filter(Boolean))
    const media = list.filter((c) => c.kind === 'media' && !ignored.has(rel(c)))
    let tracked = new Set<string>()
    if (media.length) {
      const res = await git(repo, ['ls-files', '-z', '--', ...media.map(rel)])
      tracked = new Set(res.stdout.split('\0').filter(Boolean))
    }
    for (const c of list) {
      const path = rel(c)
      if (ignored.has(path) || (c.kind === 'media' && !tracked.has(path))) kept.push(strip(c))
    }
  }
  return kept
}

function strip({ repo: _repo, ...leftover }: Candidate): Leftover {
  return leftover
}

export async function scanLeftovers(options: ScanOptions): Promise<Leftover[]> {
  const candidates: Candidate[] = []

  async function walk(dir: string, level: number, repo: string | undefined) {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    const here = entries.some((e) => e.name === '.git') ? dir : repo
    const names = new Set(entries.map((e) => e.name))
    const next: Promise<void>[] = []
    for (const entry of entries) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        const rule = RULE_BY_NAME.get(entry.name)
        if (rule && (!rule.beside || rule.beside.some((f) => names.has(f)))) {
          const st = await lstat(path).catch(() => null)
          candidates.push({ path, kind: rule.kind, label: rule.label, rebuild: rule.rebuild, modified: st?.mtimeMs, repo: here })
          continue
        }
        if (WALK_SKIP.has(entry.name) || level >= options.depth) continue
        next.push(walk(path, level + 1, here))
      } else if (entry.isFile() && MEDIA_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        const st = await lstat(path).catch(() => null)
        if (st && st.size >= MEDIA_MIN_BYTES) {
          candidates.push({
            path,
            kind: 'media',
            label: 'Large media file',
            rebuild: '',
            modified: st.mtimeMs,
            size: st.size,
            repo: here,
          })
        }
      }
    }
    await Promise.all(next)
  }

  for (const root of options.roots) if (await isDir(root)) await walk(root, 0, undefined)

  for (const cache of toolCaches(options.platform, options.home, options.env)) {
    if (await isDir(cache.path)) {
      const st = await lstat(cache.path).catch(() => null)
      candidates.push({ path: cache.path, kind: 'cache', label: cache.label, rebuild: cache.rebuild, modified: st?.mtimeMs })
    }
  }

  // A root inside another root would list the same folder twice.
  const unique = [...new Map(candidates.map((c) => [c.path, c])).values()]
  return untracked(unique)
}
