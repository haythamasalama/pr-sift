import { describe, expect, it } from 'vitest'
import { buildSmartScopes, matchesScope, scopeLabel } from '../src/scopes'
import { file } from '../src/testing'

const files = [
  'src/Domain/Order/Actions/A.php',
  'src/Domain/Order/Actions/B.php',
  'src/Domain/Core/Actions/C.php',
  'src/Domain/Core/Models/D.php',
  'tests/Feature/OrderTest.php',
  'docs/readme.md',
  'database/migrations/2026_create.php',
  'lang/en/ui.php',
].map((name) => file(name))

describe('matchesScope', () => {
  it('matches a folder prefix by path', () => {
    expect(matchesScope('src/Domain/Order/A.php', 'path:src/Domain/Order')).toBe(true)
    expect(matchesScope('src/Domain/OrderX/A.php', 'path:src/Domain/Order')).toBe(false)
  })

  it('matches a folder name at any depth', () => {
    expect(matchesScope('a/Actions/x.php', 'name:Actions')).toBe(true)
    expect(matchesScope('a/Actions.php', 'name:Actions')).toBe(false)
  })

  it('matches categories', () => {
    expect(matchesScope('tests/Feature/A.php', 'cat:tests')).toBe(true)
    expect(matchesScope('src/OrderTest.php', 'cat:tests')).toBe(true)
    expect(matchesScope('src/Order.php', 'cat:tests')).toBe(false)
    expect(matchesScope('database/migrations/x.php', 'cat:migrations')).toBe(true)
    expect(matchesScope('lang/ar/ui.php', 'cat:translations')).toBe(true)
  })
})

describe('buildSmartScopes', () => {
  const smart = buildSmartScopes(files)

  it('detects categories that exist in the pull request', () => {
    expect(smart.categories.map((c) => c.key)).toEqual(
      expect.arrayContaining(['cat:tests', 'cat:docs', 'cat:migrations', 'cat:translations']),
    )
    expect(smart.categories.find((c) => c.key === 'cat:tests')!.count).toBe(1)
  })

  it('lists folders that repeat in different places', () => {
    const actions = smart.recurring.find((r) => r.key === 'name:Actions')!
    expect(actions.count).toBe(3)
    expect(actions.hint).toBe('2 places')
  })

  it('groups children under every folder that branches', () => {
    const domain = smart.groups.find((g) => g.parent === 'src/Domain')!
    expect(domain.items.map((i) => [i.label, i.count])).toEqual([
      ['Core', 2],
      ['Order', 2],
    ])
  })

  it('skips empty categories', () => {
    expect(buildSmartScopes([file('a.php')]).categories).toEqual([])
  })
})

describe('scopeLabel', () => {
  it('produces readable labels', () => {
    expect(scopeLabel('path:src/Domain')).toBe('src/Domain')
    expect(scopeLabel('name:Actions')).toBe('Actions/')
    expect(scopeLabel('cat:tests')).toBe('Tests')
  })
})
