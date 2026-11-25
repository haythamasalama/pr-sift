import { randomUUID } from 'node:crypto'
import { cp, readFile, rm, stat } from 'node:fs/promises'
import { basename, isAbsolute, join, resolve } from 'node:path'
import type { Repo, UndoEntry, Worktree, WorktreeDetails } from '#shared/ipc'
import { git } from '../exec'
import { diskUsage, limiter } from '../size'
import type { Store } from '../store'
import { findRepos } from './discover'
import { parseGitFile, parseWorktreeList } from './porcelain'

interface StoredUndo extends UndoEntry {
  adminDir: string
  backup: string
}

const UNDO_KEY = 'worktreeUndo'
const UNDO_LIMIT = 50

export interface WorktreeDeps {
  store: Store
  undoDir: string
  trash: (path: string) => Promise<void>
  roots: () => Promise<{ roots: string[]; depth: number }>
}

const norm = (p: string) => resolve(p)

async function exists(path: string) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function mtime(path: string) {
  try {
    return (await stat(path)).mtimeMs
  } catch {
    return 0
  }
}

export class WorktreeService {
  // Only paths found by the last scan can be inspected or removed, so the window can't ask for an arbitrary folder.
  private known = new Map<string, { repo: string; worktree: Worktree }>()
  private sizes = limiter(4)

  constructor(private readonly deps: WorktreeDeps) {}

  async listRepo(repo: string): Promise<Repo> {
    const res = await git(repo, ['worktree', 'list', '--porcelain'])
    if (res.code !== 0) return { path: repo, name: basename(repo), worktrees: [], error: res.stderr.trim() || 'git failed' }
    const worktrees = parseWorktreeList(res.stdout).map((w) => ({ ...w, path: norm(w.path) }))
    for (const [path, entry] of this.known) if (entry.repo === repo) this.known.delete(path)
    for (const worktree of worktrees) this.known.set(worktree.path, { repo, worktree })
    return { path: repo, name: basename(repo), worktrees }
  }

  async scan(): Promise<Repo[]> {
    const { roots, depth } = await this.deps.roots()
    this.known.clear()
    const repos = await findRepos(roots, depth)
    return Promise.all(repos.map((repo) => this.listRepo(repo)))
  }

  private entry(path: string) {
    const found = this.known.get(norm(path))
    if (!found) throw new Error('This worktree is not in the last scan. Rescan and try again.')
    return found
  }

  private async adminDir(worktree: Worktree): Promise<string> {
    if (worktree.main) return join(worktree.path, '.git')
    const text = await readFile(join(worktree.path, '.git'), 'utf8')
    const dir = parseGitFile(text)
    if (!dir) throw new Error('This folder’s .git file does not point at a repository.')
    return isAbsolute(dir) ? dir : resolve(worktree.path, dir)
  }

  async details(path: string): Promise<WorktreeDetails> {
    const { worktree } = this.entry(path)
    if (worktree.prunable || !(await exists(worktree.path))) return { path: worktree.path, upstream: false }
    const [size, status, ahead, lastUsed] = await Promise.all([
      this.sizes(() => diskUsage(worktree.path)),
      git(worktree.path, ['status', '--porcelain']),
      git(worktree.path, ['rev-list', '--count', '@{upstream}..HEAD']),
      this.adminDir(worktree).then(
        async (dir) => Math.max(await mtime(join(dir, 'index')), await mtime(join(dir, 'HEAD')), await mtime(join(dir, 'logs', 'HEAD'))),
        () => 0,
      ),
    ])
    return {
      path: worktree.path,
      size,
      changed: status.code === 0 ? status.stdout.split('\n').filter(Boolean).length : undefined,
      upstream: ahead.code === 0,
      unpushed: ahead.code === 0 ? Number(ahead.stdout.trim()) || 0 : undefined,
      lastUsed: lastUsed || undefined,
    }
  }

  private async undoEntries(): Promise<StoredUndo[]> {
    return (await this.deps.store.getOne<StoredUndo[]>(UNDO_KEY)) ?? []
  }

  async undoList(): Promise<UndoEntry[]> {
    return (await this.undoEntries()).map(({ id, repo, path, branch, removedAt }) => ({ id, repo, path, branch, removedAt }))
  }

  // Moves the folder to the Trash and lets git forget it. Git's admin folder for the worktree is copied first, because
  // `git worktree prune` deletes it and without it a folder put back from the Trash would no longer be a worktree.
  async remove(path: string): Promise<UndoEntry> {
    const { repo, worktree } = this.entry(path)
    if (worktree.main) throw new Error('This is the repository’s main folder, not a worktree. PR Sift never removes it.')
    if (worktree.bare) throw new Error('Bare repositories are not removed.')
    if (worktree.locked)
      throw new Error(`This worktree is locked${worktree.lockReason ? `: ${worktree.lockReason}` : ''}. Unlock it with git first.`)
    if (worktree.prunable || !(await exists(worktree.path))) throw new Error('The folder is already gone. Use Clean up instead.')

    const adminDir = await this.adminDir(worktree)
    const id = randomUUID()
    const backup = join(this.deps.undoDir, id)
    await cp(adminDir, backup, { recursive: true, verbatimSymlinks: true })
    try {
      await this.deps.trash(worktree.path)
    } catch (e) {
      await rm(backup, { recursive: true, force: true })
      throw new Error(`Could not move the folder to the Trash: ${e instanceof Error ? e.message : String(e)}`, { cause: e })
    }
    await git(repo, ['worktree', 'prune'])
    this.known.delete(worktree.path)

    const entry: StoredUndo = { id, repo, path: worktree.path, branch: worktree.branch, removedAt: Date.now(), adminDir, backup }
    const entries = [entry, ...(await this.undoEntries())]
    for (const old of entries.slice(UNDO_LIMIT)) await rm(old.backup, { recursive: true, force: true })
    await this.deps.store.set({ [UNDO_KEY]: entries.slice(0, UNDO_LIMIT) })
    return { id, repo, path: entry.path, branch: entry.branch, removedAt: entry.removedAt }
  }

  async undo(id: string): Promise<{ ok: boolean; error?: string }> {
    const entries = await this.undoEntries()
    const entry = entries.find((e) => e.id === id)
    if (!entry) return { ok: false, error: 'Nothing to undo for this worktree any more.' }
    if (!(await exists(entry.path))) {
      return { ok: false, error: `Put the folder back from the Trash first, to ${entry.path}, then press Undo again.` }
    }
    if (!(await exists(entry.adminDir))) await cp(entry.backup, entry.adminDir, { recursive: true, verbatimSymlinks: true })
    const repaired = await git(entry.repo, ['worktree', 'repair', entry.path])
    if (repaired.code !== 0) return { ok: false, error: repaired.stderr.trim() || 'git worktree repair failed.' }
    await rm(entry.backup, { recursive: true, force: true })
    await this.deps.store.set({ [UNDO_KEY]: entries.filter((e) => e.id !== id) })
    return { ok: true }
  }

  async prune(repo: string): Promise<Repo> {
    const target = norm(repo)
    if (![...this.known.values()].some((e) => e.repo === target)) throw new Error('This repository is not in the last scan.')
    await git(target, ['worktree', 'prune'])
    return this.listRepo(target)
  }
}
