import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ApiRequest, PullFacts } from '#shared/ipc'
import { checkRule, cleanConfig, evaluate, newRule } from '../../src/main/autoapprove/rules'
import { AutoApproveService, searchQuery } from '../../src/main/autoapprove/service'
import { Store } from '../../src/main/store'
import { tempDir } from './helpers'

const NOW = Date.parse('2026-11-25T12:00:00Z')
const pull = (over: Partial<PullFacts> = {}): PullFacts => ({
  owner: 'acme',
  repo: 'shop',
  number: 7,
  title: 'chore(deps): bump vite',
  url: 'https://github.com/acme/shop/pull/7',
  author: 'dependabot[bot]',
  draft: false,
  base: 'main',
  headSha: 'abc',
  pushedAt: NOW - 3_600_000,
  labels: ['dependencies'],
  files: ['package.json', 'pnpm-lock.yaml'],
  changedFiles: 2,
  additions: 10,
  deletions: 4,
  checks: 'SUCCESS',
  mergeable: 'MERGEABLE',
  changesRequested: false,
  ...over,
})

describe('auto-approve rules', () => {
  const rule = { ...newRule('r1', 'Deps'), authors: ['dependabot[bot]'], paths: ['package.json', '**/*lock*'], maxLines: 100 }

  it('matches when every condition holds', () => {
    expect(checkRule(rule, pull(), NOW)).toEqual([])
  })

  it('lists each condition that fails', () => {
    const failed = checkRule(
      { ...rule, repos: ['acme/api'], blockedLabels: ['wip'], minAgeMinutes: 120 },
      pull({ files: ['package.json', 'src/app.ts'], checks: 'FAILURE', labels: ['wip'], additions: 500 }),
      NOW,
    )
    expect(failed).toEqual([
      'Repository is not in the list',
      'Has the label wip',
      'Changes 504 lines, more than 100',
      'Changes src/app.ts, which no allowed path covers',
      'Checks are failure',
      'Last push was 60 min ago; waiting for 120',
    ])
  })

  it('matches owner/* and refuses path rules when GitHub capped the file list', () => {
    expect(checkRule({ ...rule, repos: ['acme/*'] }, pull(), NOW)).toEqual([])
    expect(checkRule(rule, pull({ changedFiles: 300 }), NOW)).toContain('Too many files to check every path')
  })

  it('never approves drafts, your own pull requests, or a commit you already approved', () => {
    const config = { enabled: true, dryRun: false, intervalMinutes: 10, rules: [{ ...rule, authors: [] }] }
    expect(evaluate(config, pull({ draft: true }), 'me', NOW).blocked).toBe('It is a draft')
    expect(evaluate(config, pull({ author: 'Me' }), 'me', NOW).blocked).toBe('You opened it')
    expect(evaluate(config, pull({ myApprovedSha: 'abc' }), 'me', NOW).blocked).toBe('You already approved this commit')
    expect(evaluate(config, pull({ myApprovedSha: 'old' }), 'me', NOW).matched).toBe('Deps')
  })

  it('matches bots whether or not the login carries [bot], and reads a bare folder as everything in it', () => {
    expect(checkRule({ ...rule, authors: ['dependabot[bot]'] }, pull({ author: 'dependabot' }), NOW)).toEqual([])
    expect(checkRule({ ...rule, authors: ['dependabot'] }, pull({ author: 'dependabot[bot]' }), NOW)).toEqual([])
    const docs = { ...newRule('d'), paths: ['docs'], requireChecks: false }
    expect(checkRule(docs, pull({ files: ['docs/a/b.md'], changedFiles: 1 }), NOW)).toEqual([])
    expect(checkRule(docs, pull({ files: ['src/a.ts'], changedFiles: 1 }), NOW)).toEqual(['Changes src/a.ts, which no allowed path covers'])
  })

  it('cleans what the window sends', () => {
    const c = cleanConfig({
      enabled: 'yes',
      intervalMinutes: 0,
      rules: [{ id: 'a', authors: [' Bob ', 'bob', ''], maxLines: '-3' }, { id: 'a' }],
    })
    expect(c.enabled).toBe(false)
    expect(c.dryRun).toBe(true)
    expect(c.intervalMinutes).toBe(2)
    expect(c.rules[0]!.authors).toEqual(['bob'])
    expect(c.rules[0]!.maxLines).toBeNull()
    expect(c.rules[1]!.id).toBe('a-x')
  })
})

describe('AutoApproveService', () => {
  const raw = {
    number: 7,
    title: 'chore(deps): bump vite',
    url: 'https://github.com/acme/shop/pull/7',
    isDraft: false,
    updatedAt: '2026-11-25T10:00:00Z',
    baseRefName: 'main',
    headRefOid: 'abc',
    additions: 3,
    deletions: 1,
    changedFiles: 1,
    mergeable: 'MERGEABLE',
    repository: { name: 'shop', owner: { login: 'acme' } },
    author: { login: 'dependabot[bot]' },
    labels: { nodes: [] },
    files: { nodes: [{ path: 'package.json' }] },
    latestReviews: { nodes: [] },
    commits: { nodes: [{ commit: { pushedDate: null, committedDate: '2026-11-25T10:00:00Z', statusCheckRollup: { state: 'SUCCESS' } } }] },
  }

  function setup() {
    const calls: ApiRequest[] = []
    const service = new AutoApproveService({
      store: new Store(join(tempDir('aa-'), 'd.json')),
      request: async (req) => {
        calls.push(req)
        if (req.path === '/graphql')
          return { ok: true, status: 200, data: { data: { viewer: { login: 'me' }, search: { nodes: [raw, null] } } } }
        return { ok: true, status: 200, data: {} }
      },
      onChange: () => undefined,
      now: () => NOW,
      setTimer: () => 1,
      clearTimer: () => undefined,
    })
    return { service, calls }
  }

  it('logs what it would approve in a dry run, once per commit, and approves nothing', async () => {
    const { service, calls } = setup()
    await service.save({ enabled: true, dryRun: true, rules: [{ ...newRule('r'), name: 'Deps', authors: ['dependabot[bot]'] }] })
    await service.run()
    await service.run()
    const status = await service.status()
    expect(status.log.map((e) => e.action)).toEqual(['would-approve'])
    expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/reviews'))).toBe(false)
    expect(status.nextRun).toBe(NOW + 10 * 60_000)
  })

  it('approves the exact commit it checked when live', async () => {
    const { service, calls } = setup()
    await service.save({ enabled: true, dryRun: false, rules: [{ ...newRule('r'), name: 'Deps', comment: 'LGTM' }] })
    await service.run()
    const review = calls.find((c) => c.path.endsWith('/reviews'))
    expect(review).toEqual({
      type: 'gh',
      path: '/repos/acme/shop/pulls/7/reviews',
      method: 'POST',
      body: { event: 'APPROVE', commit_id: 'abc', body: 'LGTM' },
    })
    expect((await service.status()).log[0]!.action).toBe('approved')
  })

  it('also searches every open pull request in the repositories the rules name', () => {
    const config = cleanConfig({ rules: [{ ...newRule('a'), repos: ['acme/shop', 'globex/*'] }, { ...newRule('b'), enabled: false, repos: ['x/y'] }] })
    const q = searchQuery(config)
    expect(q).toContain('review-requested:@me')
    expect(q).toContain('inRepos: search(')
    expect(q).toContain('repo:acme/shop user:globex')
    expect(q).not.toContain('repo:x/y')
    expect(searchQuery(cleanConfig({ rules: [newRule('c')] }))).not.toContain('inRepos')
  })

  it('does not schedule anything while off', async () => {
    const { service } = setup()
    await service.save({ enabled: false, rules: [newRule('r')] })
    expect((await service.status()).nextRun).toBeUndefined()
  })
})
