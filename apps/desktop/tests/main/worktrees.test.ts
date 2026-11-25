import { beforeEach, describe, expect, it } from 'vitest'
import { existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { Store } from '../../src/main/store'
import { WorktreeService } from '../../src/main/worktrees/service'
import { findRepos } from '../../src/main/worktrees/discover'
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
