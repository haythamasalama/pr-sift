import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REMOVED_CO_AUTHORS,
  coAuthorsOf,
  defaultSquashBody,
  defaultSquashTitle,
  isRemovedCoAuthor,
  keepsCoAuthor,
  mergeReadiness,
  parsePerson,
  rememberCoAuthors,
  stripCoAuthors,
  withCoAuthors,
  type CommitSummary,
} from '../src/merge'

const me = { name: 'Haytham', email: 'h@example.com', login: 'haytham' }
const commit = (message: string, author: CommitSummary['author'] = me): CommitSummary => ({ message, author })

describe('stripCoAuthors', () => {
  it('takes co-author trailers out of a message, whatever their case', () => {
    const result = stripCoAuthors(
      'fix: parse dates\n\nUse UTC.\n\nCo-Authored-By: Claude <noreply@anthropic.com>\nco-authored-by: Sam <sam@x.dev>',
    )
    expect(result.text).toBe('fix: parse dates\n\nUse UTC.')
    expect(result.coAuthors).toEqual([
      { name: 'Claude', email: 'noreply@anthropic.com' },
      { name: 'Sam', email: 'sam@x.dev' },
    ])
  })

  it("drops GitHub's dashed separator left above the trailers", () => {
    expect(stripCoAuthors('* one\n\n---------\n\nCo-authored-by: Sam <sam@x.dev>').text).toBe('* one')
  })
})

describe('coAuthorsOf', () => {
  it('lists other commit authors and trailer co-authors once each, without the pull request author', () => {
    const commits = [
      commit('feat: a\n\nCo-Authored-By: Claude <noreply@anthropic.com>'),
      commit('fix: b', { name: 'Sam', email: 'sam@x.dev', login: 'sam' }),
      commit('fix: c\n\nCo-authored-by: claude <NOREPLY@anthropic.com>'),
    ]
    expect(coAuthorsOf(commits, 'Haytham')).toEqual([
      { name: 'Claude', email: 'noreply@anthropic.com' },
      { name: 'Sam', email: 'sam@x.dev' },
    ])
  })

  it("knows the author's commits that GitHub could not link to their account", () => {
    const commits = [
      commit('feat: a'),
      commit('feat: b', { name: 'Haytham', email: 'h@work.local' }),
      commit('feat: c', { name: 'H', email: '9+haytham@users.noreply.github.com' }),
      commit('feat: d', { name: 'Sam', email: 'sam@x.dev' }),
      commit('feat: e', { name: 'Nobody', email: '' }),
    ]
    expect(coAuthorsOf(commits, 'haytham')).toEqual([{ name: 'Sam', email: 'sam@x.dev' }])
  })
})

describe('isRemovedCoAuthor', () => {
  it('matches the default AI assistants by name or email', () => {
    const removed = (name: string, email: string) => isRemovedCoAuthor({ name, email }, DEFAULT_REMOVED_CO_AUTHORS)
    expect(removed('Claude Opus 4', 'noreply@anthropic.com')).toBe(true)
    expect(removed('Codex', 'codex@openai.com')).toBe(true)
    expect(removed('Copilot', '198982749+Copilot@users.noreply.github.com')).toBe(true)
    expect(removed('Cursor Agent', 'cursoragent@cursor.com')).toBe(true)
    expect(removed('gemini-code-assist[bot]', '1@users.noreply.github.com')).toBe(true)
    expect(removed('Haider Ali', 'haider@example.com')).toBe(false)
    expect(removed('Claude Martin', 'claude.martin@acme.com')).toBe(false)
    expect(removed('Ana Gemini', 'ana@cursorial.dev')).toBe(false)
    expect(removed('Sam', 'sam@x.dev')).toBe(false)
  })

  it('ignores blank patterns', () => {
    expect(isRemovedCoAuthor({ name: 'Sam', email: 'sam@x.dev' }, ['', '  '])).toBe(false)
  })
})

describe('rememberCoAuthors', () => {
  const claude = { name: 'Claude', email: 'claude@acme.com' }
  const sam = { name: 'Sam', email: 'Sam@x.dev' }

  it('adds people you uncheck and keeps people you check back', () => {
    const first = rememberCoAuthors([{ person: sam, keep: false }], ['claude'], [])
    expect(first).toEqual({ removed: ['claude', 'sam@x.dev'], kept: [] })
    expect(rememberCoAuthors([{ person: sam, keep: true }], first.removed, first.kept)).toEqual({ removed: ['claude'], kept: [] })
  })

  it('remembers someone a pattern removes once you check them, without dropping the pattern', () => {
    const next = rememberCoAuthors([{ person: claude, keep: true }], ['claude'], [])
    expect(next).toEqual({ removed: ['claude'], kept: ['claude@acme.com'] })
    expect(keepsCoAuthor(claude, next.removed, next.kept)).toBe(true)
    expect(keepsCoAuthor({ name: 'Claude', email: 'noreply@anthropic.com' }, next.removed, next.kept)).toBe(false)
    expect(rememberCoAuthors([{ person: claude, keep: false }], next.removed, next.kept)).toEqual({ removed: ['claude'], kept: [] })
  })
})

describe('squash message', () => {
  it("uses the only commit's subject as the title, and the pull request title otherwise", () => {
    expect(defaultSquashTitle('Ship invoices', 7, [commit('feat: invoices')])).toBe('feat: invoices (#7)')
    expect(defaultSquashTitle('Ship invoices', 7, [commit('a'), commit('b')])).toBe('Ship invoices (#7)')
    expect(defaultSquashTitle('Ship invoices', 7, [commit('a')], 'PR_TITLE')).toBe('Ship invoices (#7)')
  })

  it('lists the commit messages without their co-author trailers', () => {
    const commits = [commit('feat: a\n\nWhy a.\n\nCo-Authored-By: Claude <noreply@anthropic.com>'), commit('fix: b')]
    expect(defaultSquashBody(commits, '')).toBe('* feat: a\n\nWhy a.\n\n* fix: b')
  })

  it('follows the repository setting for the body', () => {
    expect(defaultSquashBody([commit('a')], 'The description', 'PR_BODY')).toBe('The description')
    expect(defaultSquashBody([commit('a\n\nbody')], 'x', 'BLANK')).toBe('')
    expect(defaultSquashBody([commit('a\n\nbody')], 'x')).toBe('body')
  })

  it('appends the kept co-authors as trailers', () => {
    expect(withCoAuthors('Body', [{ name: 'Sam', email: 'sam@x.dev' }])).toBe('Body\n\nCo-authored-by: Sam <sam@x.dev>')
    expect(withCoAuthors('', [])).toBe('')
  })
})

describe('parsePerson', () => {
  it('reads "Name <email>"', () => {
    expect(parsePerson(' Sam Lee <sam@x.dev> ')).toEqual({ name: 'Sam Lee', email: 'sam@x.dev' })
    expect(parsePerson('sam@x.dev')).toBeNull()
  })
})

describe('mergeReadiness', () => {
  it("reads GitHub's mergeable state", () => {
    expect(mergeReadiness('clean')).toBe('ready')
    expect(mergeReadiness('unstable')).toBe('checks')
    expect(mergeReadiness('dirty')).toBe('conflicts')
    expect(mergeReadiness('blocked')).toBe('blocked')
    expect(mergeReadiness(undefined)).toBe('unknown')
  })
})
