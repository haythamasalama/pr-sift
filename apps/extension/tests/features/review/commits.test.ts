import { describe, expect, it } from 'vitest'
import { pickRange, rangePath, type PrCommit } from '../../../src/features/review/commits'

const commit = (sha: string, parent?: string): PrCommit => ({ sha, short: sha.slice(0, 7), message: sha, author: 'sam', date: '', parent })
const commits = [commit('aaaaaaa1', 'base0000'), commit('bbbbbbb2', 'aaaaaaa1'), commit('ccccccc3', 'bbbbbbb2')]
const pr = { owner: 'o', repo: 'r', number: 1 }

describe('commits', () => {
  it('picks one commit, then stretches to a range on shift-click', () => {
    const one = pickRange(null, 2, false)
    expect(one).toEqual({ from: 2, to: 2 })
    expect(pickRange(one, 0, true)).toEqual({ from: 0, to: 2 })
    expect(pickRange(one, 1, false)).toEqual({ from: 1, to: 1 })
  })

  it('reads one commit from its own diff and a range from a compare against the first parent', () => {
    expect(rangePath(pr, commits, { from: 1, to: 1 })).toBe('/o/r/commit/bbbbbbb2')
    expect(rangePath(pr, commits, { from: 0, to: 2 })).toBe('/o/r/compare/base0000..ccccccc3')
  })
})
