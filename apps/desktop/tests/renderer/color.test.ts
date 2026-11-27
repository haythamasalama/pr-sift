import { describe, expect, it } from 'vitest'
import { hexColor } from '../../src/renderer/color'

describe('hexColor', () => {
  it('reads the colours the browser computes', () => {
    expect(hexColor('rgb(13, 17, 23)')).toBe('#0d1117')
    expect(hexColor('rgba(255, 255, 255, 1)')).toBe('#ffffff')
    expect(hexColor('rgb(0 0 0)')).toBe('#000000')
    expect(hexColor('#ABCDEF')).toBe('#abcdef')
    expect(hexColor('rgb(13.4, 16.6, 23)')).toBe('#0d1117')
  })
  it('gives nothing for colours it cannot read', () => {
    expect(hexColor('oklch(0.2 0 0)')).toBe('')
    expect(hexColor('')).toBe('')
  })
})
