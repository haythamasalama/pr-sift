import { describe, expect, it } from 'vitest'
import { parsePatch } from '../../src/lib/diff'
import { describeLines, lineText, stepLine, stepRange } from '../../src/lib/range'

const rows = parsePatch('@@ -1,4 +1,4 @@\n a\n-b\n+c\n d\n@@ -20,2 +20,2 @@\n x\n y')

describe('range stepping', () => {
  it('steps over rows of the other side', () => {
    expect(stepLine(rows, 'new', 1, 1)).toBe(2)
    expect(stepLine(rows, 'old', 2, -1)).toBe(2)
  })

  it('does not cross a hunk boundary', () => {
    expect(stepLine(rows, 'new', 3, 1)).toBe(3)
    expect(stepLine(rows, 'new', 20, -1)).toBe(20)
  })

  it('keeps the start before the end', () => {
    expect(stepRange(rows, 'new', { start: 1, end: 2 }, 'start', 1)).toEqual({ start: 2, end: 2 })
    expect(stepRange(rows, 'new', { start: 2, end: 2 }, 'start', 1)).toEqual({ start: 2, end: 2 })
    expect(stepRange(rows, 'new', { start: 2, end: 2 }, 'end', 1)).toEqual({ start: 2, end: 3 })
    expect(stepRange(rows, 'new', { start: 2, end: 2 }, 'end', -1)).toEqual({ start: 2, end: 2 })
  })

  it('reads the text of a line and labels a range', () => {
    expect(lineText(rows, 'old', 2)).toBe('b')
    expect(describeLines({ line: 5 })).toBe('Line 5')
    expect(describeLines({ line: 5, startLine: 3 })).toBe('Lines 3–5')
  })
})
