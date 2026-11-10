import { describe, expect, it } from 'vitest'
import { buildTree, collectFiles } from '../src/tree'
import { file } from '../src/testing'

describe('buildTree', () => {
  const tree = buildTree([file('src/a/x.php'), file('src/a/y.php'), file('src/b/z.php'), file('root.json')])

  it('counts files per folder', () => {
    expect(tree.count).toBe(4)
    expect(tree.dirs.map((d) => [d.name, d.count])).toEqual([['src', 3]])
    expect(tree.dirs[0]!.dirs.map((d) => [d.name, d.count])).toEqual([
      ['a', 2],
      ['b', 1],
    ])
  })

  it('keeps top-level files on the root node', () => {
    expect(tree.files.map((f) => f.filename)).toEqual(['root.json'])
  })

  it('sorts folders alphabetically with full paths', () => {
    const t = buildTree([file('b/x'), file('a/x'), file('a/c/x')])
    expect(t.dirs.map((d) => d.path)).toEqual(['a', 'b'])
    expect(t.dirs[0]!.dirs[0]!.path).toBe('a/c')
  })
})

describe('collectFiles', () => {
  it('returns every file under a node', () => {
    const tree = buildTree([file('a/b/c.php'), file('a/d.php')])
    expect(
      collectFiles(tree.dirs[0]!)
        .map((f) => f.filename)
        .sort(),
    ).toEqual(['a/b/c.php', 'a/d.php'])
  })
})
