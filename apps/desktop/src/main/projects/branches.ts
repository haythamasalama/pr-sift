import type { Branch, BulkDeleteResult } from '#shared/ipc'
import { git } from '../exec'
import { parseGithubRemote } from './remote'

const SEP = '\u001f'
const FORMAT = [
  '%(refname:short)',
  '%(HEAD)',
  '%(upstream:short)',
  '%(upstream:track)',
  '%(committerdate:unix)',
  '%(contents:subject)',
  '%(worktreepath)',
  '%(authorname)',
  '%(authoremail)',
].join(SEP)

export function parseTrack(track: string) {
  const gone = track.includes('gone')
  const ahead = Number(/ahead (\d+)/.exec(track)?.[1] ?? 0)
  const behind = Number(/behind (\d+)/.exec(track)?.[1] ?? 0)
  return { gone, ahead, behind }
}

// The repository's main branch (origin's HEAD, given as `origin/main` or `main`). It is never deleted.
export function isProtectedBranch(name: string, base?: string) {
  return !!base && name === base.replace(/^origin\//, '')
}

// The main branch first, then the rest as given.
export function protectedFirst(branches: Branch[]): Branch[] {
  const home = branches.findIndex((b) => b.protected)
  return home <= 0 ? branches : [branches[home], ...branches.slice(0, home), ...branches.slice(home + 1)]
}

export function parseBranches(output: string, merged: Set<string>, email = '', base?: string): Branch[] {
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name = '', head, upstream, track = '', date, subject = '', worktree, author, authorEmail = ''] = line.split(SEP)
      return {
        name,
        current: head === '*',
        worktree: worktree || undefined,
        upstream: upstream || undefined,
        ...parseTrack(track),
        merged: merged.has(name),
        lastCommit: Number(date) * 1000 || 0,
        subject,
        author: author || undefined,
        email: authorEmail.replace(/[<>]/g, '').toLowerCase() || undefined,
        mine: !!email && authorEmail.replace(/[<>]/g, '').toLowerCase() === email,
        protected: isProtectedBranch(name, base),
      }
    })
}

// The branch other branches merge into: origin's HEAD, else main or master.
export async function defaultBranch(repo: string): Promise<string | undefined> {
  const head = await git(repo, ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'])
  if (head.code === 0 && head.stdout.trim()) return head.stdout.trim()
  for (const name of ['main', 'master']) {
    if ((await git(repo, ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`])).code === 0) return name
  }
  return undefined
}

export async function listBranches(repo: string): Promise<Branch[]> {
  const base = await defaultBranch(repo)
  const merged = new Set<string>()
  if (base) {
    const res = await git(repo, ['branch', '--format=%(refname:short)', '--merged', base])
    for (const name of res.stdout.split('\n')) if (name.trim()) merged.add(name.trim())
    // The base itself is "merged" into itself; that isn't useful to show.
    merged.delete(base.replace(/^origin\//, ''))
  }
  const [res, email] = await Promise.all([
    git(repo, ['for-each-ref', `--format=${FORMAT}`, '--sort=-committerdate', 'refs/heads']),
    git(repo, ['config', 'user.email']),
  ])
  if (res.code !== 0) throw new Error(res.stderr.trim() || 'git for-each-ref failed')
  return protectedFirst(parseBranches(res.stdout, merged, email.stdout.trim().toLowerCase(), base))
}

const BRANCH_NAME = /^(?!-)(?!.*\.\.)(?!.*\/\/)(?!.*@\{)[^\s~^:?*[\\]+(?<![./])$/

export function validBranchName(name: string) {
  return BRANCH_NAME.test(name) && !name.endsWith('.lock')
}

export async function deleteBranch(repo: string, name: string, force: boolean) {
  if (!validBranchName(name)) return { ok: false, error: 'That is not a branch name.' }
  if (isProtectedBranch(name, await defaultBranch(repo))) return { ok: false, error: 'This is the main branch, so it is kept.' }
  const res = await git(repo, ['branch', force ? '-D' : '-d', '--', name])
  if (res.code === 0) return { ok: true }
  const err = res.stderr.trim()
  if (/not fully merged/.test(err))
    return { ok: false, error: 'This branch has commits that are not merged. Delete it anyway to lose them.' }
  return { ok: false, error: err || 'git branch failed' }
}

export interface RemoteBranches {
  // Whether an open pull request uses this branch; deleting its head branch would close it.
  hasOpenPull(owner: string, repo: string, branch: string): Promise<boolean>
  remove(owner: string, repo: string, branch: string): Promise<{ ok: boolean; error?: string }>
}

// Deletes several local branches and, when asked, their copies on GitHub. A branch that is checked out, or whose
// GitHub copy has an open pull request, is left alone.
export async function deleteBranches(
  repo: string,
  names: string[],
  options: { force: boolean; remote: boolean },
  remote?: RemoteBranches,
): Promise<BulkDeleteResult> {
  const result: BulkDeleteResult = { deleted: [], remoteDeleted: [], failed: [] }
  const all = new Map((await listBranches(repo)).map((b) => [b.name, b]))
  const origin = await git(repo, ['remote', 'get-url', 'origin'])
  const github = origin.code === 0 ? parseGithubRemote(origin.stdout) : undefined
  const base = (await defaultBranch(repo))?.replace(/^origin\//, '')
  for (const name of [...new Set(names)]) {
    const b = all.get(name)
    if (!b) {
      result.failed.push({ name, error: 'No such branch.' })
      continue
    }
    if (b.protected) {
      result.failed.push({ name, error: 'This is the main branch, so it is kept.' })
      continue
    }
    if (b.current || b.worktree) {
      result.failed.push({ name, error: 'It is checked out, so it was kept.' })
      continue
    }
    const res = await deleteBranch(repo, name, options.force || b.merged)
    if (!res.ok) {
      result.failed.push({ name, error: res.error ?? 'git branch failed' })
      continue
    }
    result.deleted.push(name)
    const remoteName = b.upstream?.startsWith('origin/') && !b.gone ? b.upstream.slice('origin/'.length) : undefined
    if (!options.remote || !remote || !github || !remoteName || remoteName === base) continue
    try {
      if (await remote.hasOpenPull(github.owner, github.repo, remoteName)) {
        result.failed.push({ name, error: 'Deleted here, but kept on GitHub because a pull request is still open on it.' })
        continue
      }
      const r = await remote.remove(github.owner, github.repo, remoteName)
      if (r.ok) result.remoteDeleted.push(name)
      else result.failed.push({ name, error: `Deleted here, but not on GitHub: ${r.error ?? 'GitHub refused.'}` })
    } catch (e) {
      result.failed.push({ name, error: `Deleted here, but not on GitHub: ${e instanceof Error ? e.message : String(e)}` })
    }
  }
  return result
}
