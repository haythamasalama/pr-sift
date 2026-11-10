import { describe, expect, it } from 'vitest'
import { hashText } from '../src/hash'

describe('hashText', () => {
  it('is deterministic', () => {
    expect(hashText('hello')).toBe(hashText('hello'))
  })

  it('changes when the input changes', () => {
    expect(hashText('hello')).not.toBe(hashText('hellp'))
    expect(hashText('')).not.toBe(hashText(' '))
  })

  it('stays short enough to store per file', () => {
    expect(hashText('x'.repeat(100_000)).length).toBeLessThan(16)
  })
})
