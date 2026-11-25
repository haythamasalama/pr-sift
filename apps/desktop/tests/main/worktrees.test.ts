import { beforeEach, describe, expect, it } from 'vitest'
import { existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { Store } from '../../src/main/store'
import { WorktreeService } from '../../src/main/worktrees/service'
import { findRepos } from '../../src/main/worktrees/discover'
import { splitPatch } from '../../src/main/worktrees/patch'
import { makeRepo, sh, tempDir, write } from './helpers'

let root: string
let trashDir: string
let service: WorktreeService
const trashed = new Map<string, string>()

beforeEach(() => {
  root = tempDir('projects-')
  trashDir = tempDir('trash-')
  trashed.clear()
  const data = tempDir('data-')
  service = new WorktreeService({
    store: new Store(join(data, 'desktop.json')),
    undoDir: join(data, 'undo'),
    trash: async (path) => {
      const to = join(trashDir, String(trashed.size))
      renameSync(path, to)
      trashed.set(path, to)
    },
    roots: async () => ({ roots: [root], depth: 3 }),
  })
})

describe('findRepos', () => {
  it('finds repositories, skips worktrees and heavy folders', async () => {
    const shop = makeRepo(root, 'shop')
    makeRepo(join(root, 'clients'), 'blog')
    makeRepo(join(root, 'node_modules'), 'hidden')
    sh(shop, 'worktree', 'add', '-q', join(root, 'shop-cart'), '-b', 'cart')
    expect(await findRepos([root], 3)).toEqual([join(root, 'clients', 'blog'), shop])
  })

  it('stops at the depth limit', async () => {
    makeRepo(join(root, 'a', 'b', 'c'), 'deep')
    expect(await findRepos([root], 2)).toEqual([])
    expect(await findRepos([root], 4)).toHaveLength(1)
  })
})

describe('WorktreeService', () => {
  it('lists worktrees with their state', async () => {
    const shop = makeRepo(root, 'shop')
    sh(shop, 'worktree', 'add', '-q', join(root, 'shop-cart'), '-b', 'feature/cart')
    write(join(root, 'shop-cart', 'new.txt'))
    const [repo] = await service.scan()
    expect(repo!.worktrees.map((w) => [w.branch, w.main])).toEqual([
      ['main', true],
      ['feature/cart', false],
    ])
    const details = await service.details(join(root, 'shop-cart'))
    expect(details).toMatchObject({ changed: 1, upstream: false })
    expect(details.size).toBeGreaterThan(0)
    expect(details.lastUsed).toBeGreaterThan(0)
  })

  it('never removes the main folder or a locked worktree', async () => {
    const shop = makeRepo(root, 'shop')
    sh(shop, 'worktree', 'add', '-q', join(root, 'shop-lock'), '-b', 'locked')
    sh(shop, 'worktree', 'lock', '--reason', 'on a USB disk', join(root, 'shop-lock'))
    await service.scan()
    await expect(service.remove(shop)).rejects.toThrow(/main folder/)
    await expect(service.remove(join(root, 'shop-lock'))).rejects.toThrow(/locked: on a USB disk/)
    expect(trashed.size).toBe(0)
  })

  it('refuses paths that were not in the scan', async () => {
    makeRepo(root, 'shop')
    await service.scan()
    await expect(service.remove('/etc')).rejects.toThrow(/not in the last scan/)
  })

  it('trashes a worktree, keeps its branch, and undoes it after the folder is put back', async () => {
    const shop = makeRepo(root, 'shop')
    const cart = join(root, 'shop-cart')
    sh(shop, 'worktree', 'add', '-q', cart, '-b', 'feature/cart')
    await service.scan()

    const entry = await service.remove(cart)
    expect(existsSync(cart)).toBe(false)
    expect(sh(shop, 'worktree', 'list')).not.toContain('shop-cart')
    expect(sh(shop, 'branch', '--list', 'feature/cart')).toContain('feature/cart')
    expect(await service.undoList()).toHaveLength(1)

    expect(await service.undo(entry.id)).toMatchObject({ ok: false, error: expect.stringMatching(/Put the folder back/) })
    renameSync(trashed.get(cart)!, cart)
    expect(await service.undo(entry.id)).toEqual({ ok: true })
    expect(sh(shop, 'worktree', 'list', '--porcelain')).toContain(`worktree ${cart}`)
    expect(sh(cart, 'rev-parse', '--abbrev-ref', 'HEAD').trim()).toBe('feature/cart')
    expect(await service.undoList()).toEqual([])
  })

  it('prunes worktrees whose folder is gone', async () => {
    const shop = makeRepo(root, 'shop')
    sh(shop, 'worktree', 'add', '-q', join(root, 'shop-old'), '-b', 'old')
    renameSync(join(root, 'shop-old'), join(trashDir, 'gone'))
    const [repo] = await service.scan()
    expect(repo!.worktrees[1]).toMatchObject({ prunable: true })
    const after = await service.prune(shop)
    expect(after.worktrees).toHaveLength(1)
  })
})

describe('WorktreeService details actions', () => {
  it('lists changes and diffs only listed files', async () => {
    const shop = makeRepo(root, 'shop')
    const cart = join(root, 'shop-cart')
    sh(shop, 'worktree', 'add', '-q', cart, '-b', 'cart')
    write(join(cart, 'README.md'), 'hello\nworld\n')
    write(join(cart, 'new.txt'), 'fresh\n')
    await service.scan()
    const changes = await service.changes(cart)
    expect(changes.files).toEqual([
      { path: 'README.md', status: ' M' },
      { path: 'new.txt', status: '??' },
    ])
    expect(changes.commits[0]).toMatchObject({ subject: 'init', author: 'Test' })
    expect(await service.diff(cart, 'README.md')).toContain('+world')
    expect(await service.diff(cart, 'new.txt')).toContain('+fresh')
    await expect(service.diff(cart, '../secret')).rejects.toThrow(/not in the list/)
  })

  it('renames the folder and the branch, and names a detached worktree', async () => {
    const shop = makeRepo(root, 'shop')
    sh(shop, 'worktree', 'add', '-q', join(root, 'old-name'), '-b', 'cart')
    sh(shop, 'worktree', 'add', '-q', '--detach', join(root, 'loose'))
    await service.scan()
    let repo = await service.rename(join(root, 'old-name'), 'new-name')
    expect(existsSync(join(root, 'new-name'))).toBe(true)
    expect(repo.worktrees.some((w) => w.path === join(root, 'new-name'))).toBe(true)
    await expect(service.rename(join(root, 'new-name'), '../escape')).rejects.toThrow(/letters/)
    await expect(service.rename(shop, 'x')).rejects.toThrow(/main folder/)
    repo = await service.renameBranch(join(root, 'new-name'), 'feature/cart')
    expect(repo.worktrees.find((w) => w.path === join(root, 'new-name'))?.branch).toBe('feature/cart')
    repo = await service.renameBranch(join(root, 'loose'), 'rescued')
    expect(repo.worktrees.find((w) => w.path === join(root, 'loose'))?.branch).toBe('rescued')
  })
})

describe('splitPatch', () => {
  it('splits git diff output into files shaped for the review', () => {
    const text = [
      'diff --git a/src/a.ts b/src/a.ts',
      'index 1..2 100644',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1,2 +1,2 @@',
      ' keep',
      '-old',
      '+new',
      'diff --git a/added.md b/added.md',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/added.md',
      '@@ -0,0 +1 @@',
      '+hello',
      'diff --git a/gone.txt b/gone.txt',
      'deleted file mode 100644',
      '--- a/gone.txt',
      '+++ /dev/null',
      '@@ -1 +0,0 @@',
      '-bye',
      '',
    ].join('\n')
    const files = splitPatch(text)
    expect(files.map((f) => [f.filename, f.status, f.additions, f.deletions])).toEqual([
      ['src/a.ts', 'modified', 1, 1],
      ['added.md', 'added', 1, 0],
      ['gone.txt', 'removed', 0, 1],
    ])
    expect(files[0]!.patch?.startsWith('@@ -1,2 +1,2 @@')).toBe(true)
    expect(files[0]!.hash).toMatch(/^[0-9a-f]{12}$/)
  })
})

describe('WorktreeService changes like a pull request', () => {
  it('shows uncommitted and whole-branch changes, and discards a file', async () => {
    const shop = makeRepo(root, 'shop')
    const cart = join(root, 'shop-cart')
    sh(shop, 'worktree', 'add', '-q', cart, '-b', 'cart')
    write(join(cart, 'cart.txt'), 'one\n')
    sh(cart, 'add', '.')
    sh(cart, 'commit', '-q', '-m', 'cart')
    write(join(cart, 'README.md'), 'hello\nworld\n')
    write(join(cart, 'notes.txt'), 'remember\n')
    await service.scan()

    const now = await service.patch(cart, 'uncommitted')
    expect(now.files.map((f) => f.filename).sort()).toEqual(['README.md', 'notes.txt'])
    expect(now.counts).toEqual({ uncommitted: 2, branch: 3 })
    const all = await service.patch(cart, 'branch')
    expect(all.base).toBe('main')
    expect(all.files.map((f) => f.filename).sort()).toEqual(['README.md', 'cart.txt', 'notes.txt'])

    await service.discard(cart, 'README.md')
    await service.discard(cart, 'notes.txt')
    expect(existsSync(join(cart, 'notes.txt'))).toBe(false)
    expect((await service.patch(cart, 'uncommitted')).files).toEqual([])
    await expect(service.discard(cart, '../escape')).rejects.toThrow()
  })

  it('makes a worktree next to the project and says when its branch is merged', async () => {
    const shop = makeRepo(root, 'shop')
    await service.scan()
    const repo = await service.add(shop, 'feature/cart')
    const made = repo.worktrees.find((w) => w.branch === 'feature/cart')
    expect(made?.path).toBe(join(root, 'shop-cart'))
    expect((await service.details(made!.path)).merged).toBe(true)
    write(join(made!.path, 'x.txt'), 'x\n')
    sh(made!.path, 'add', '.')
    sh(made!.path, 'commit', '-q', '-m', 'x')
    await service.listRepo(shop)
    expect((await service.details(made!.path)).merged).toBe(false)
  })
})
