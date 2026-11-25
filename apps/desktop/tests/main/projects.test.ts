import { describe, expect, it } from 'vitest'
import { parseGithubRemote, pickGithubRemote } from '../../src/main/projects/remote'
import { parseBranches, parseTrack, validBranchName } from '../../src/main/projects/branches'
import { parseStatus } from '../../src/main/worktrees/service'

describe('parseGithubRemote', () => {
  it.each([
    ['https://github.com/acme/app.git', 'acme', 'app'],
    ['https://github.com/acme/app', 'acme', 'app'],
    ['https://user@github.com/acme/app.git', 'acme', 'app'],
    ['git@github.com:acme/my.repo.git', 'acme', 'my.repo'],
    ['ssh://git@github.com/acme/app.git', 'acme', 'app'],
    ['ssh://git@github.com:22/acme/app', 'acme', 'app'],
  ])('reads %s', (url, owner, repo) => {
    expect(parseGithubRemote(url)).toEqual({ owner, repo })
  })

  it('ignores other hosts', () => {
    expect(parseGithubRemote('https://gitlab.com/acme/app.git')).toBeUndefined()
    expect(parseGithubRemote('https://github.com.evil.com/acme/app')).toBeUndefined()
  })

  it('prefers origin', () => {
    const out =
      'fork\tgit@github.com:me/app.git (fetch)\norigin\thttps://github.com/acme/app.git (fetch)\norigin\thttps://github.com/acme/app.git (push)\n'
    expect(pickGithubRemote(out)).toEqual({ owner: 'acme', repo: 'app' })
    expect(pickGithubRemote('fork\tgit@github.com:me/app.git (fetch)\n')).toEqual({ owner: 'me', repo: 'app' })
  })
})

describe('branches', () => {
  it('parses upstream tracking', () => {
    expect(parseTrack('[ahead 2, behind 3]')).toEqual({ gone: false, ahead: 2, behind: 3 })
    expect(parseTrack('[gone]')).toEqual({ gone: true, ahead: 0, behind: 0 })
    expect(parseTrack('')).toEqual({ gone: false, ahead: 0, behind: 0 })
  })

  it('parses for-each-ref output', () => {
    const S = '\u001f'
    const out = [
      ['main', '*', 'origin/main', '', '1700000000', 'Release', '/repo'].join(S),
      ['feat/x', ' ', 'origin/feat/x', '[gone]', '1690000000', 'Add x', ''].join(S),
    ].join('\n')
    const list = parseBranches(out, new Set(['feat/x']))
    expect(list[0]).toMatchObject({ name: 'main', current: true, worktree: '/repo', merged: false, lastCommit: 1700000000000 })
    expect(list[1]).toMatchObject({ name: 'feat/x', current: false, gone: true, merged: true, worktree: undefined, subject: 'Add x' })
  })

  it('reads who made the last commit and whether it was you', () => {
    const S = '\u001f'
    const out = [
      ['feat/a', ' ', '', '', '1700000000', 'A', '', 'Haytham', '<me@example.com>'].join(S),
      ['feat/b', ' ', '', '', '1700000000', 'B', '', 'Sam', '<sam@example.com>'].join(S),
    ].join('\n')
    const list = parseBranches(out, new Set(), 'me@example.com')
    expect(list[0]).toMatchObject({ author: 'Haytham', mine: true })
    expect(list[1]).toMatchObject({ author: 'Sam', mine: false })
  })

  it('validates branch names', () => {
    for (const ok of ['main', 'fix/login', 'feat/a-b_c.1']) expect(validBranchName(ok)).toBe(true)
    for (const bad of ['-x', 'a..b', 'a b', 'a~1', 'a:b', 'x.lock', 'end/', 'end.', '']) expect(validBranchName(bad)).toBe(false)
  })
})

describe('parseStatus', () => {
  it('reads porcelain -z output with renames', () => {
    const out = ' M src/a.ts\0R  new.ts\0old.ts\0?? notes/new file.md\0'
    expect(parseStatus(out)).toEqual([
      { path: 'src/a.ts', status: ' M' },
      { path: 'new.ts', status: 'R ' },
      { path: 'notes/new file.md', status: '??' },
    ])
  })
})

describe('listBranches', async () => {
  const { makeRepo, sh, tempDir } = await import('./helpers')
  const { listBranches, deleteBranch } = await import('../../src/main/projects/branches')
  it('marks merged branches and refuses unmerged deletes without force', async () => {
    const repo = makeRepo(tempDir('br-'), 'app')
    sh(repo, 'branch', 'done')
    sh(repo, 'switch', '-q', '-c', 'wip')
    sh(repo, 'commit', '-q', '--allow-empty', '-m', 'work')
    sh(repo, 'switch', '-q', 'main')
    const list = await listBranches(repo)
    expect(list.find((b) => b.name === 'done')?.merged).toBe(true)
    expect(list.find((b) => b.name === 'wip')?.merged).toBe(false)
    expect(list.find((b) => b.name === 'main')).toMatchObject({ current: true, merged: false })
    expect((await deleteBranch(repo, 'wip', false)).ok).toBe(false)
    expect((await deleteBranch(repo, 'wip', true)).ok).toBe(true)
    expect((await deleteBranch(repo, '--all', true)).ok).toBe(false)
  })
})

describe('ProjectService', async () => {
  const { join } = await import('node:path')
  const { makeRepo, tempDir } = await import('./helpers')
  const { Store } = await import('../../src/main/store')
  const { ProjectService } = await import('../../src/main/projects/service')
  it('adds only repositories it offered, and describes their GitHub remote', async () => {
    const root = tempDir('proj-')
    const app = makeRepo(root, 'app')
    const { sh } = await import('./helpers')
    sh(app, 'remote', 'add', 'origin', 'git@github.com:acme/app.git')
    const other = makeRepo(tempDir('elsewhere-'), 'other')
    const service = new ProjectService({
      store: new Store(join(tempDir('data-'), 'd.json')),
      roots: async () => ({ roots: [root], depth: 3 }),
      pickFolder: async () => null,
    })
    expect(await service.candidates()).toEqual([app])
    const list = await service.add([app, other])
    expect(list).toEqual([{ path: app, name: 'app', github: { owner: 'acme', repo: 'app' }, branch: 'main' }])
    expect(await service.candidates()).toEqual([])
    await expect(service.require(other)).rejects.toThrow(/not one of your projects/)
    expect(await service.remove(app)).toEqual([])
  })
})
