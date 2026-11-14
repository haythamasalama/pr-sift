import { describe, expect, it } from 'vitest'
import { expandPatch, parsePatch, revealMore } from '../src'

const lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`)

// Hunk 1 covers new lines 10-13 (one added), hunk 2 covers new lines 40-42.
const patch = [
  '@@ -10,3 +10,4 @@',
  ' line 10',
  '+line 11',
  ' line 12',
  ' line 13',
  '@@ -39,3 +40,3 @@',
  ' line 40',
  '-old',
  '+line 41',
  ' line 42',
].join('\n')

const rows = parsePatch(patch)

describe('expandPatch', () => {
  it('adds a control above each hunk with a gap and an unknown one at the end', () => {
    const { controls } = expandPatch(rows, null)
    expect([...controls.values()]).toEqual([
      { gap: 0, hidden: 9, up: true, down: false },
      { gap: 1, hidden: 26, up: true, down: true },
      { gap: 2, hidden: null, up: false, down: true },
    ])
  })

  it('knows the size of the end gap once the file is loaded', () => {
    const { controls } = expandPatch(rows, lines)
    expect([...controls.values()].at(-1)).toEqual({ gap: 2, hidden: 18, up: false, down: true })
  })

  it('reveals lines from the file with matching old and new numbers', () => {
    const { rows: out } = expandPatch(rows, lines, { 1: { top: 2, bottom: 1 } })
    const between = out.slice(5, 9)
    expect(between[0]).toEqual({ kind: 'ctx', oldNo: 13, newNo: 14, text: 'line 14' })
    expect(between[1]).toEqual({ kind: 'ctx', oldNo: 14, newNo: 15, text: 'line 15' })
    expect(between[2]!.kind).toBe('hunk')
    expect(between[3]).toEqual({ kind: 'ctx', oldNo: 38, newNo: 39, text: 'line 39' })
  })

  it('drops the hunk header once the whole gap is shown', () => {
    const { rows: out, controls } = expandPatch(rows, lines, { 0: { top: 0, bottom: 9 } })
    expect(out[0]).toEqual({ kind: 'ctx', oldNo: 1, newNo: 1, text: 'line 1' })
    expect([...controls.values()].some((c) => c.gap === 0)).toBe(false)
  })

  it('ignores reveals until the file is loaded', () => {
    expect(expandPatch(rows, null, { 1: { top: 5, bottom: 5 } }).rows).toHaveLength(rows.length + 1)
  })
})

describe('revealMore', () => {
  it('steps by twenty lines in the chosen direction', () => {
    const control = { gap: 1, hidden: 26, up: true, down: true }
    expect(revealMore(undefined, control, 'up')).toEqual({ top: 0, bottom: 20 })
    expect(revealMore({ top: 0, bottom: 20 }, { ...control, hidden: 6 }, 'down')).toEqual({ top: 6, bottom: 20 })
  })

  it('shows everything above the first hunk from the bottom', () => {
    expect(revealMore(undefined, { gap: 0, hidden: 9, up: true, down: false }, 'all')).toEqual({ top: 0, bottom: 9 })
  })
})
