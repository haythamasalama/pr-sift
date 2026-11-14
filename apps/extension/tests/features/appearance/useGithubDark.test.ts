import { describe, expect, it } from 'vitest'
import { githubIsDark } from '../../../src/features/appearance/useGithubDark'

describe('githubIsDark', () => {
  it('uses the mode GitHub sets on the page', () => {
    expect(githubIsDark('dark', false)).toBe(true)
    expect(githubIsDark('light', true)).toBe(false)
  })

  it('follows the device when GitHub is on auto', () => {
    expect(githubIsDark('auto', true)).toBe(true)
    expect(githubIsDark('auto', false)).toBe(false)
  })

  it('treats a missing mode as light', () => {
    expect(githubIsDark(undefined, true)).toBe(false)
  })
})
