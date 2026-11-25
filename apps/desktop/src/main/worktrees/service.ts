import { readFile, rm, stat } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import type {
  ChangedFile,
  PatchFile,
  PatchMode,
  Repo,
  RemovedWorktree,
  Worktree,
  WorktreeChanges,
  WorktreeDetails,
  WorktreePatch,
} from '#shared/ipc'
import { defaultBranch, validBranchName } from '../projects/branches'
import { pickGithubRemote } from '../projects/remote'
import { git } from '../exec'
import { diskUsage, limiter } from '../size'
import type { Store } from '../store'
import { findRepos } from './discover'
import { parseGitFile, parseWorktreeList } from './porcelain'
import { splitPatch } from './patch'

export interface WorktreeDeps {
  store: Store
  trash: (path: string) => Promise<void>
  roots: () => Promise<{ roots: string[]; depth: number }>
}

const norm = (p: string) => resolve(p)
const SEP = '\u001f'
const DIFF_LIMIT = 2 * 1024 * 1024
// New files are diffed one by one; past this many the rest are listed without their content.
const UNTRACKED_LIMIT = 200
const FOLDER_NAME = /^(?!\.)[A-Za-z0-9._-]{1,120}$/

// `git status --porcelain=v1 -z`: `XY path\0`, with the old path after renames and copies.
export function parseStatus(out: string): ChangedFile[] {
  const parts = out.split('\0')
  const files: ChangedFile[] = []
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i]!
    if (entry.length < 4) continue
    const status = entry.slice(0, 2)
    files.push({ path: entry.slice(3), status })
    if (status[0] === 'R' || status[0] === 'C') i++
  }
  return files
}

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
  // The changed files last listed per worktree; only these can be diffed.
  private changed = new Map<string, Set<string>>()

  constructor(private readonly deps: WorktreeDeps) {}

  async listRepo(repo: string): Promise<Repo> {
    const [res, remotes] = await Promise.all([git(repo, ['worktree', 'list', '--porcelain']), git(repo, ['remote', '-v'])])
    const github = remotes.code === 0 ? pickGithubRemote(remotes.stdout) : undefined
    if (res.code !== 0) return { path: repo, name: basename(repo), worktrees: [], error: res.stderr.trim() || 'git failed' }
    const worktrees = parseWorktreeList(res.stdout).map((w) => ({ ...w, path: norm(w.path) }))
    for (const [path, entry] of this.known) if (entry.repo === repo) this.known.delete(path)
    for (const worktree of worktrees) this.known.set(worktree.path, { repo, worktree })
    return { path: repo, name: basename(repo), worktrees, github }
  }

  async scan(): Promise<Repo[]> {
    const { roots, depth } = await this.deps.roots()
    const repos = await findRepos(roots, depth)
    return Promise.all(repos.map((repo) => this.listRepo(repo)))
  }

  // The normalised path when it is a known worktree folder that exists in the last listing.
  knows(path: string): string | undefined {
    const found = this.known.get(norm(path))
    return found && !found.worktree.prunable ? found.worktree.path : undefined
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
    const { repo, worktree } = this.entry(path)
    if (worktree.prunable || !(await exists(worktree.path))) return { path: worktree.path, upstream: false }
    const [size, status, ahead, lastUsed, merged] = await Promise.all([
      this.sizes(() => diskUsage(worktree.path)),
      git(worktree.path, ['status', '--porcelain']),
      git(worktree.path, ['rev-list', '--count', '@{upstream}..HEAD']),
      this.adminDir(worktree).then(
        async (dir) => Math.max(await mtime(join(dir, 'index')), await mtime(join(dir, 'HEAD')), await mtime(join(dir, 'logs', 'HEAD'))),
        () => 0,
      ),
      this.mergedIntoDefault(repo, worktree),
    ])
    return {
      path: worktree.path,
      merged,
      size,
      changed: status.code === 0 ? status.stdout.split('\n').filter(Boolean).length : undefined,
      upstream: ahead.code === 0,
      unpushed: ahead.code === 0 ? Number(ahead.stdout.trim()) || 0 : undefined,
      lastUsed: lastUsed || undefined,
    }
  }

  // Whether the worktree's branch is already in the default branch, so removing the worktree loses no commits.
  private async mergedIntoDefault(repo: string, worktree: Worktree): Promise<boolean | undefined> {
    if (worktree.main || !worktree.branch) return undefined
    const base = await defaultBranch(repo)
    if (!base || base === worktree.branch || base.endsWith(`/${worktree.branch}`)) return undefined
    return (await git(repo, ['merge-base', '--is-ancestor', worktree.head, base])).code === 0
  }

  // Deletes the worktree folder for good, uncommitted changes included, and lets git forget it. The branch is kept.
  async remove(path: string): Promise<RemovedWorktree> {
    const { repo, worktree } = this.entry(path)
    if (worktree.main) throw new Error('This is the repository’s main folder, not a worktree. PR Sift never removes it.')
    if (worktree.bare) throw new Error('Bare repositories are not removed.')
    if (worktree.locked)
      throw new Error(`This worktree is locked${worktree.lockReason ? `: ${worktree.lockReason}` : ''}. Unlock it with git first.`)
    if (worktree.prunable || !(await exists(worktree.path))) throw new Error('The folder is already gone. Use Clean up instead.')

    // Twice --force also removes a worktree git considers busy. Whatever git leaves behind, such as ignored files, goes too.
    const removed = await git(repo, ['worktree', 'remove', '--force', '--force', worktree.path])
    if (await exists(worktree.path)) {
      try {
        await rm(worktree.path, { recursive: true, force: true })
      } catch (e) {
        const why = removed.stderr.trim() || (e instanceof Error ? e.message : String(e))
        throw new Error(`Could not delete the folder: ${why}`, { cause: e })
      }
    }
    await git(repo, ['worktree', 'prune'])
    this.known.delete(worktree.path)
    return { repo, path: worktree.path, branch: worktree.branch }
  }

  // Files with changes, and the latest commits, so the person can see what a worktree holds before deciding.
  async changes(path: string): Promise<WorktreeChanges> {
    const { worktree } = this.entry(path)
    if (worktree.prunable || !(await exists(worktree.path))) return { files: [], commits: [] }
    const [status, log] = await Promise.all([
      git(worktree.path, ['status', '--porcelain=v1', '-z', '--untracked-files=all']),
      git(worktree.path, ['log', '-15', `--format=%H${SEP}%s${SEP}%an${SEP}%ct`]),
    ])
    const files = status.code === 0 ? parseStatus(status.stdout) : []
    this.changed.set(worktree.path, new Set(files.map((f) => f.path)))
    const commits =
      log.code === 0
        ? log.stdout
            .split('\n')
            .filter(Boolean)
            .map((line) => {
              const [sha = '', subject = '', author = '', date] = line.split(SEP)
              return { sha, subject, author, date: Number(date) * 1000 || 0 }
            })
        : []
    return { files, commits }
  }

  async diff(path: string, file: string): Promise<string> {
    const { worktree } = this.entry(path)
    if (!this.changed.get(worktree.path)?.has(file)) throw new Error('This file is not in the list of changes. Refresh and try again.')
    const status = await git(worktree.path, ['status', '--porcelain=v1', '-z', '--', file])
    const untracked = status.stdout.startsWith('??')
    const res = untracked
      ? await git(worktree.path, ['diff', '--no-color', '--no-index', '--', '/dev/null', file])
      : await git(worktree.path, ['diff', '--no-color', 'HEAD', '--', file])
    const text = res.stdout
    return text.length > DIFF_LIMIT ? text.slice(0, DIFF_LIMIT) : text
  }

  // Every changed file with its diff, either what is not committed yet or everything since the branch left its base.
  async patch(path: string, mode: PatchMode): Promise<WorktreePatch> {
    const { repo, worktree } = this.entry(path)
    const remotes = await git(repo, ['remote', '-v'])
    const github = remotes.code === 0 ? pickGithubRemote(remotes.stdout) : undefined
    const empty = { repo, worktree, github, mode, files: [], counts: { uncommitted: 0, branch: 0 }, truncated: false }
    if (worktree.prunable || !(await exists(worktree.path))) return empty
    const cwd = worktree.path
    const base = worktree.main ? undefined : await defaultBranch(repo)
    const since = base ? (await git(cwd, ['merge-base', 'HEAD', base])).stdout.trim() : ''
    const untracked = (await git(cwd, ['ls-files', '--others', '--exclude-standard', '-z'])).stdout.split('\0').filter(Boolean)
    const names = async (from: string) =>
      (await git(cwd, ['diff', '--name-only', '-z', '-M', from])).stdout.split('\0').filter(Boolean).length + untracked.length
    const [uncommitted, branch] = await Promise.all([names('HEAD'), since ? names(since) : Promise.resolve(0)])
    const from = mode === 'branch' && since ? since : 'HEAD'
    const tracked = await git(cwd, ['diff', '--no-color', '--no-ext-diff', '-M', from])
    let text = tracked.stdout
    let truncated = text.length > DIFF_LIMIT * 4
    if (truncated) text = text.slice(0, text.lastIndexOf('\ndiff --git ', DIFF_LIMIT * 4) + 1)
    const files: PatchFile[] = splitPatch(text)
    for (const [i, name] of untracked.entries()) {
      if (i >= UNTRACKED_LIMIT) {
        files.push({ filename: name, status: 'added', additions: 0, deletions: 0, hash: `new:${name}` })
        truncated = true
        continue
      }
      const res = await git(cwd, ['diff', '--no-color', '--no-index', '--', '/dev/null', name])
      const [file] = splitPatch(res.stdout.length > DIFF_LIMIT ? '' : res.stdout)
      files.push(
        file
          ? { ...file, filename: name, status: 'added' }
          : { filename: name, status: 'added', additions: 0, deletions: 0, hash: `new:${name}` },
      )
    }
    files.sort((a, b) => a.filename.localeCompare(b.filename))
    this.changed.set(worktree.path, new Set(files.map((f) => f.filename)))
    return { repo, worktree, github, base: since ? base : undefined, mode, files, counts: { uncommitted, branch }, truncated }
  }

  // Throws away the uncommitted changes to one file: tracked files go back to the last commit, new files go to the Trash.
  async discard(path: string, file: string): Promise<void> {
    const { worktree } = this.entry(path)
    if (!this.changed.get(worktree.path)?.has(file)) throw new Error('This file is not in the list of changes. Refresh and try again.')
    const status = await git(worktree.path, ['status', '--porcelain=v1', '-z', '--', file])
    if (!status.stdout) throw new Error('This file has no uncommitted changes.')
    if (status.stdout.startsWith('??')) {
      const target = resolve(worktree.path, file)
      if (!target.startsWith(worktree.path)) throw new Error('That file is outside the worktree.')
      await this.deps.trash(target)
      return
    }
    const res = await git(worktree.path, ['restore', '--source=HEAD', '--staged', '--worktree', '--', file])
    if (res.code !== 0) throw new Error(res.stderr.trim() || 'git restore failed.')
  }

  // A new worktree next to the main folder, on a branch that exists or is made from the current one.
  async add(repo: string, branch: string): Promise<Repo> {
    const clean = branch.trim()
    if (!validBranchName(clean)) throw new Error('That is not a valid branch name.')
    const folder = `${basename(repo)}-${clean
      .split('/')
      .pop()!
      .replace(/[^A-Za-z0-9._-]+/g, '-')}`
    let target = join(dirname(repo), folder)
    for (let n = 2; await exists(target); n++) target = join(dirname(repo), `${folder}-${n}`)
    const known = (await git(repo, ['rev-parse', '--verify', '--quiet', `refs/heads/${clean}`])).code === 0
    const res = await git(repo, known ? ['worktree', 'add', target, clean] : ['worktree', 'add', '-b', clean, target])
    if (res.code !== 0) throw new Error(res.stderr.trim() || 'git worktree add failed.')
    return this.listRepo(repo)
  }

  // Renames the worktree's folder in place with `git worktree move`, which keeps git's records right.
  async rename(path: string, name: string): Promise<Repo> {
    const { repo, worktree } = this.entry(path)
    if (worktree.main) throw new Error('The main folder is renamed in Finder or Explorer, not here.')
    if (worktree.locked) throw new Error('This worktree is locked. Unlock it with git first.')
    if (worktree.prunable) throw new Error('The folder is missing.')
    const clean = name.trim()
    if (!FOLDER_NAME.test(clean)) throw new Error('Use letters, numbers, dots, dashes and underscores only.')
    const target = join(dirname(worktree.path), clean)
    if (target === worktree.path) return this.listRepo(repo)
    if (await exists(target)) throw new Error('A folder with that name is already there.')
    const res = await git(repo, ['worktree', 'move', worktree.path, target])
    if (res.code !== 0) throw new Error(res.stderr.trim() || 'git worktree move failed.')
    return this.listRepo(repo)
  }

  // Renames the branch checked out in this worktree, or creates one there when it's detached.
  async renameBranch(path: string, name: string): Promise<Repo> {
    const { repo, worktree } = this.entry(path)
    const clean = name.trim()
    if (!validBranchName(clean)) throw new Error('That is not a valid branch name.')
    const res = worktree.branch
      ? await git(worktree.path, ['branch', '-m', '--', worktree.branch, clean])
      : await git(worktree.path, ['switch', '-c', clean])
    if (res.code !== 0) throw new Error(res.stderr.trim() || 'git failed.')
    return this.listRepo(repo)
  }

  async prune(repo: string): Promise<Repo> {
    const target = norm(repo)
    if (![...this.known.values()].some((e) => e.repo === target)) throw new Error('This repository is not in the last scan.')
    await git(target, ['worktree', 'prune'])
    return this.listRepo(target)
  }
}
