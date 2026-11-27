import { describe, expect, it } from 'vitest'
import { appLink, handOffTarget, withoutMark } from '../../../src/features/desktop/handoff'

const pr = { owner: 'globex', repo: 'backend', number: 11377 }
const url = 'https://github.com/globex/backend/pull/11377'

describe('handOffTarget', () => {
  it('hands a pull request opened from outside GitHub to the app, any tab of it', () => {
    expect(handOffTarget({ url, referrer: '', navigation: 'navigate' })).toEqual(pr)
    expect(handOffTarget({ url: `${url}/files#diff-1`, referrer: 'https://mail.google.com/', navigation: 'navigate' })).toEqual(pr)
  })
  it('keeps pages reached inside GitHub, reloaded or revisited', () => {
    expect(handOffTarget({ url, referrer: 'https://github.com/notifications', navigation: 'navigate' })).toBeNull()
    expect(handOffTarget({ url, referrer: 'https://gist.github.com/x', navigation: 'navigate' })).toBeNull()
    expect(handOffTarget({ url, referrer: '', navigation: 'reload' })).toBeNull()
    expect(handOffTarget({ url, referrer: '', navigation: 'back_forward' })).toBeNull()
  })
  it('keeps pages the app opened in the browser', () => {
    expect(handOffTarget({ url: `${url}?prsift=web`, referrer: '', navigation: 'navigate' })).toBeNull()
  })
  it('ignores pages that are not pull requests', () => {
    expect(handOffTarget({ url: 'https://github.com/globex/backend/issues/3', referrer: '' })).toBeNull()
    expect(handOffTarget({ url: 'https://github.com/globex/backend/pulls', referrer: '' })).toBeNull()
    expect(handOffTarget({ url: 'https://github.com/a/b/pull/0', referrer: '' })).toBeNull()
  })
})

describe('links', () => {
  it('builds the app link', () => {
    expect(appLink(pr)).toBe('prsift://github.com/globex/backend/pull/11377')
  })
  it('drops the stay mark from the address', () => {
    expect(withoutMark(`${url}/files?prsift=web#diff-1`)).toBe(`${url}/files#diff-1`)
    expect(withoutMark(url)).toBeNull()
  })
})
