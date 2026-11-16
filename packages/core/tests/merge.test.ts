import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REMOVED_CO_AUTHORS,
  coAuthorsOf,
  defaultSquashBody,
  defaultSquashTitle,
  isRemovedCoAuthor,
  mergeReadiness,
  parsePerson,
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
    expect(removed('Sam', 'sam@x.dev')).toBe(false)
  })

  it('ignores blank patterns', () => {
    expect(isRemovedCoAuthor({ name: 'Sam', email: 'sam@x.dev' }, ['', '  '])).toBe(false)
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
