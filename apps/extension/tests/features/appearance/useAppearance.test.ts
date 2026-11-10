import { describe, expect, it } from 'vitest'
import { isDark } from '../../../src/features/appearance/useAppearance'

describe('isDark', () => {
  it('follows the device when the theme is system', () => {
    expect(isDark('system', true)).toBe(true)
    expect(isDark('system', false)).toBe(false)
  })

  it('ignores the device when the theme is chosen', () => {
    expect(isDark('light', true)).toBe(false)
    expect(isDark('dark', false)).toBe(true)
  })
})
