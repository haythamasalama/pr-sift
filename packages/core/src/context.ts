import type { DiffRow } from './types'

export const EXPAND_STEP = 20

export interface Reveal {
  top: number
  bottom: number
}

export interface GapControl {
  gap: number
  hidden: number | null
  up: boolean
  down: boolean
}

export interface ExpandedDiff {
  rows: DiffRow[]
  controls: Map<number, GapControl>
}

interface Hunk {
  header: number
  end: number
  oldFirst: number
  oldLast: number
  newFirst: number
  newLast: number
}

function hunksOf(rows: DiffRow[]): Hunk[] {
  const hunks: Hunk[] = []
  rows.forEach((row, i) => {
    if (row.kind !== 'hunk') return
    const m = /@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))?/.exec(row.text)
    const oldStart = Number(m?.[1] ?? 0)
    const oldCount = Number(m?.[2] ?? 1)
    const newStart = Number(m?.[3] ?? 0)
    const newCount = Number(m?.[4] ?? 1)
    const last = hunks.at(-1)
    if (last) last.end = i
    hunks.push({
      header: i,
      end: rows.length,
      oldFirst: oldCount === 0 ? oldStart + 1 : oldStart,
      oldLast: oldStart + oldCount - (oldCount === 0 ? 0 : 1),
      newFirst: newCount === 0 ? newStart + 1 : newStart,
      newLast: newStart + newCount - (newCount === 0 ? 0 : 1),
    })
  })
  return hunks
}

// Lines between hunks are unchanged, so the new file supplies their text and the old number is a fixed offset away.
export function expandPatch(rows: DiffRow[], lines: string[] | null, reveal: Record<number, Reveal> = {}): ExpandedDiff {
  const hunks = hunksOf(rows)
  if (!hunks.length) return { rows, controls: new Map() }

  const out: DiffRow[] = []
  const controls = new Map<number, GapControl>()

  const pushLines = (newFrom: number, oldFrom: number, from: number, count: number) => {
    for (let k = 0; k < count; k++) {
      const newNo = newFrom + from + k
      out.push({ kind: 'ctx', oldNo: oldFrom + from + k, newNo, text: lines?.[newNo - 1] ?? '' })
    }
  }

  const shown = (gap: number, size: number) => {
    if (!lines) return { top: 0, bottom: 0 }
    const r = reveal[gap] ?? { top: 0, bottom: 0 }
    const top = Math.min(r.top, size)
    return { top, bottom: Math.min(r.bottom, size - top) }
  }

  hunks.forEach((hunk, i) => {
    const prev = hunks[i - 1]
    const newFrom = prev ? prev.newLast + 1 : 1
    const oldFrom = prev ? prev.oldLast + 1 : 1
    const size = Math.max(0, hunk.newFirst - newFrom)
    const { top, bottom } = shown(i, size)
    pushLines(newFrom, oldFrom, 0, top)
    const hidden = size - top - bottom
    if (hidden > 0) controls.set(out.length, { gap: i, hidden, up: true, down: i > 0 })
    if (hidden > 0 || size === 0) out.push(rows[hunk.header]!)
    pushLines(newFrom, oldFrom, size - bottom, bottom)
    out.push(...rows.slice(hunk.header + 1, hunk.end))
  })

  const last = hunks.at(-1)!
  const newFrom = last.newLast + 1
  const size = lines ? Math.max(0, lines.length - newFrom + 1) : null
  const { top } = shown(hunks.length, size ?? 0)
  pushLines(newFrom, last.oldLast + 1, 0, top)
  const hidden = size === null ? null : size - top
  if (hidden === null || hidden > 0) {
    controls.set(out.length, { gap: hunks.length, hidden, up: false, down: true })
    out.push({ kind: 'hunk', oldNo: '', newNo: '', text: '' })
  }

  return { rows: out, controls }
}

export function revealMore(current: Reveal | undefined, control: GapControl, direction: 'up' | 'down' | 'all'): Reveal {
  const r = current ?? { top: 0, bottom: 0 }
  const hidden = control.hidden ?? 0
  const step = direction === 'all' ? hidden : Math.min(EXPAND_STEP, hidden)
  const toBottom = direction === 'up' || (direction === 'all' && !control.down)
  return toBottom ? { ...r, bottom: r.bottom + step } : { ...r, top: r.top + step }
}
