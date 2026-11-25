import type { Branch } from '#shared/ipc'
import { git } from '../exec'

const SEP = '\u001f'
const FORMAT = [
  '%(refname:short)',
  '%(HEAD)',
  '%(upstream:short)',
  '%(upstream:track)',
  '%(committerdate:unix)',
  '%(contents:subject)',
  '%(worktreepath)',
].join(SEP)

export function parseTrack(track: string) {
  const gone = track.includes('gone')
  const ahead = Number(/ahead (\d+)/.exec(track)?.[1] ?? 0)
  const behind = Number(/behind (\d+)/.exec(track)?.[1] ?? 0)
  return { gone, ahead, behind }
}

export function parseBranches(output: string, merged: Set<string>): Branch[] {
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name = '', head, upstream, track = '', date, subject = '', worktree] = line.split(SEP)
      return {
        name,
        current: head === '*',
        worktree: worktree || undefined,
        upstream: upstream || undefined,
        ...parseTrack(track),
        merged: merged.has(name),
        lastCommit: Number(date) * 1000 || 0,
        subject,
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
  const res = await git(repo, ['for-each-ref', `--format=${FORMAT}`, '--sort=-committerdate', 'refs/heads'])
  if (res.code !== 0) throw new Error(res.stderr.trim() || 'git for-each-ref failed')
  return parseBranches(res.stdout, merged)
}

const BRANCH_NAME = /^(?!-)(?!.*\.\.)(?!.*\/\/)(?!.*@\{)[^\s~^:?*[\\]+(?<![./])$/

export function validBranchName(name: string) {
  return BRANCH_NAME.test(name) && !name.endsWith('.lock')
}

export async function deleteBranch(repo: string, name: string, force: boolean) {
  if (!validBranchName(name)) return { ok: false, error: 'That is not a branch name.' }
  const res = await git(repo, ['branch', force ? '-D' : '-d', '--', name])
  if (res.code === 0) return { ok: true }
  const err = res.stderr.trim()
  if (/not fully merged/.test(err))
    return { ok: false, error: 'This branch has commits that are not merged. Delete it anyway to lose them.' }
  return { ok: false, error: err || 'git branch failed' }
}
