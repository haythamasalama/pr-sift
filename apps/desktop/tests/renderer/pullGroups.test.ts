import { describe, expect, it } from 'vitest'
import { groupPulls } from '../../src/renderer/pulls/view'

const pr = (owner: string, repo: string, login: string) => ({ owner, repo, author: { login } })
const list = [
  pr('globex', 'backend', 'ali'),
  pr('acme', 'shop', 'sara'),
  pr('globex', 'business', 'ali'),
  pr('Globex', 'backend', 'omar'),
]

describe('groupPulls', () => {
  it('keeps one group when not grouping', () => {
    expect(groupPulls(list, 'none').map((g) => g.items.length)).toEqual([4])
  })
  it('groups by owner, biggest first, without caring about case', () => {
    expect(groupPulls(list, 'owner').map((g) => [g.name, g.items.length])).toEqual([
      ['globex', 3],
      ['acme', 1],
    ])
  })
  it('groups by repository, then A to Z among equals', () => {
    expect(groupPulls(list, 'repo').map((g) => g.name)).toEqual(['globex/backend', 'acme/shop', 'globex/business'])
  })
  it('groups by author', () => {
    expect(groupPulls(list, 'author').map((g) => g.name)).toEqual(['ali', 'omar', 'sara'])
  })
})
