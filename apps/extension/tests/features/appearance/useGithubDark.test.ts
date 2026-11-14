import { describe, expect, it } from 'vitest'
import { githubIsDark, isDarkColor } from '../../../src/features/appearance/useGithubDark'

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

describe('isDarkColor', () => {
  it('reads the page background brightness', () => {
    expect(isDarkColor('rgb(13, 17, 23)')).toBe(true)
    expect(isDarkColor('rgb(255, 255, 255)')).toBe(false)
  })

  it('gives no answer for a transparent or unknown colour', () => {
    expect(isDarkColor('rgba(0, 0, 0, 0)')).toBeNull()
    expect(isDarkColor('transparent')).toBeNull()
  })
})
