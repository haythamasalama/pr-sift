import { describe, expect, it } from 'vitest'
import { isGithubDark } from '../../../src/features/appearance/useGithubTheme'

describe('isGithubDark', () => {
  it('reads a single GitHub theme', () => {
    expect(isGithubDark({ mode: 'dark', light: 'light', dark: 'dark_dimmed' }, false)).toBe(true)
    expect(isGithubDark({ mode: 'light', light: 'light_high_contrast', dark: 'dark' }, true)).toBe(false)
  })

  it('follows the device when GitHub syncs with it', () => {
    const theme = { mode: 'auto', light: 'light', dark: 'dark' }
    expect(isGithubDark(theme, true)).toBe(true)
    expect(isGithubDark(theme, false)).toBe(false)
  })

  it('trusts the theme name when the day theme is a dark one', () => {
    expect(isGithubDark({ mode: 'auto', light: 'dark', dark: 'dark' }, false)).toBe(true)
  })

  it('falls back to the mode without theme names, and says nothing without a mode', () => {
    expect(isGithubDark({ mode: 'dark' }, false)).toBe(true)
    expect(isGithubDark({}, true)).toBeUndefined()
  })
})
