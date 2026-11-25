import { describe, expect, it } from 'vitest'
import { parseGitFile, parseWorktreeList } from '../../src/main/worktrees/porcelain'

const LIST = `worktree /work/shop
HEAD 1111111111111111111111111111111111111111
branch refs/heads/main

worktree /work/shop-cart
HEAD 2222222222222222222222222222222222222222
branch refs/heads/feature/cart
locked moving to a new disk

worktree /work/shop-old
HEAD 3333333333333333333333333333333333333333
detached
prunable gitdir file points to non-existent location
`

describe('parseWorktreeList', () => {
  it('reads every worktree and marks the first as main', () => {
    const list = parseWorktreeList(LIST)
    expect(list.map((w) => w.path)).toEqual(['/work/shop', '/work/shop-cart', '/work/shop-old'])
    expect(list.map((w) => w.main)).toEqual([true, false, false])
  })

  it('strips refs/heads from branch names and keeps slashes', () => {
    expect(parseWorktreeList(LIST)[1]!.branch).toBe('feature/cart')
  })

  it('reads locked with its reason, detached and prunable', () => {
    const [, cart, old] = parseWorktreeList(LIST)
    expect(cart).toMatchObject({ locked: true, lockReason: 'moving to a new disk', prunable: false })
    expect(old).toMatchObject({ detached: true, prunable: true })
    expect(old!.branch).toBeUndefined()
  })

  it('handles Windows line endings and bare repositories', () => {
    const list = parseWorktreeList('worktree C:/repos/a.git\r\nbare\r\n\r\nworktree C:/repos/a-wt\r\nHEAD abc\r\nbranch refs/heads/x\r\n')
    expect(list[0]).toMatchObject({ path: 'C:/repos/a.git', bare: true, main: true })
    expect(list[1]).toMatchObject({ path: 'C:/repos/a-wt', branch: 'x' })
  })

  it('returns nothing for empty output', () => {
    expect(parseWorktreeList('')).toEqual([])
  })
})

describe('parseGitFile', () => {
  it('reads the admin folder a linked worktree points at', () => {
    expect(parseGitFile('gitdir: /work/shop/.git/worktrees/shop-cart\n')).toBe('/work/shop/.git/worktrees/shop-cart')
  })

  it('returns null for anything else', () => {
    expect(parseGitFile('ref: refs/heads/main')).toBeNull()
  })
})
