import { lstat, readdir } from 'node:fs/promises'
import { join } from 'node:path'

// Folders that never hold a repository worth listing, and are often huge.
const SKIP = new Set(['node_modules', 'vendor', 'Pods', 'Library', 'AppData', 'target', 'dist', 'build', 'venv', '__pycache__'])

export async function findRepos(roots: string[], depth: number): Promise<string[]> {
  const found = new Set<string>()
  async function walk(dir: string, level: number) {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    const git = entries.find((e) => e.name === '.git')
    if (git?.isDirectory()) {
      found.add(dir)
      return
    }
    // A `.git` file is a linked worktree or a submodule; its repository lists it.
    if (git) return
    if (level >= depth) return
    await Promise.all(
      entries.filter((e) => e.isDirectory() && !e.name.startsWith('.') && !SKIP.has(e.name)).map((e) => walk(join(dir, e.name), level + 1)),
    )
  }
  for (const root of roots) {
    try {
      if ((await lstat(root)).isDirectory()) await walk(root, 0)
    } catch {
      continue
    }
  }
  return [...found].sort((a, b) => a.localeCompare(b))
}
