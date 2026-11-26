import { describe, expect, it } from 'vitest'
import { appPullUrl, githubPullUrl, parsePullLink } from '../../src/shared/links'

const pr = { owner: 'globex', repo: 'backend', number: 11377 }

describe('parsePullLink', () => {
  it('reads GitHub links, any tab of them', () => {
    expect(parsePullLink('https://github.com/globex/backend/pull/11377')).toEqual(pr)
    expect(parsePullLink('https://github.com/globex/backend/pull/11377/files#diff-1')).toEqual(pr)
    expect(parsePullLink('  github.com/globex/backend/pull/11377?w=1 ')).toEqual(pr)
    expect(parsePullLink('https://www.github.com/globex/backend/pull/11377')).toEqual(pr)
  })
  it('reads PR Sift links', () => {
    expect(parsePullLink('prsift://github.com/globex/backend/pull/11377')).toEqual(pr)
    expect(parsePullLink('prsift://github.com/globex/backend/pull/11377/')).toEqual(pr)
  })
  it('turns down everything else', () => {
    expect(parsePullLink('https://github.com/globex/backend/issues/3')).toBeNull()
    expect(parsePullLink('https://gitlab.com/a/b/pull/1')).toBeNull()
    expect(parsePullLink('https://github.com/a/b/pull/0')).toBeNull()
    expect(parsePullLink('https://github.com/a/b/pull/12abc')).toBeNull()
    expect(parsePullLink('look at https://github.com/a/b/pull/1')).toBeNull()
    expect(parsePullLink('prsift://evil.com/a/b/pull/1')).toBeNull()
  })
  it('round-trips both links', () => {
    expect(parsePullLink(githubPullUrl(pr))).toEqual(pr)
    expect(parsePullLink(appPullUrl(pr))).toEqual(pr)
  })
})
