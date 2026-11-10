import { anchorOf } from './notes'
import type { DiffRow, Note } from './types'

export interface LineRange {
  start: number
  end: number
}

export function rowIndexOf(rows: DiffRow[], side: Note['side'], line: number): number {
  return rows.findIndex((r) => {
    const a = anchorOf(r)
    return a?.side === side && a.line === line
  })
}

export function stepLine(rows: DiffRow[], side: Note['side'], line: number, dir: -1 | 1): number {
  let i = rowIndexOf(rows, side, line)
  if (i === -1) return line
  for (i += dir; i >= 0 && i < rows.length; i += dir) {
    const row = rows[i]!
    if (row.kind === 'hunk') return line
    const a = anchorOf(row)
    if (a?.side === side) return a.line
  }
  return line
}

export function stepRange(rows: DiffRow[], side: Note['side'], range: LineRange, edge: 'start' | 'end', dir: -1 | 1): LineRange {
  if (edge === 'start') {
    const start = stepLine(rows, side, range.start, dir)
    return start <= range.end ? { start, end: range.end } : range
  }
  const end = stepLine(rows, side, range.end, dir)
  return end >= range.start ? { start: range.start, end } : range
}

export function lineText(rows: DiffRow[], side: Note['side'], line: number): string {
  return rows[rowIndexOf(rows, side, line)]?.text ?? ''
}

export const startOf = (note: Pick<Note, 'line' | 'startLine'>) => note.startLine ?? note.line

export function describeLines(note: Pick<Note, 'line' | 'startLine'>): string {
  return startOf(note) < note.line ? `Lines ${startOf(note)}–${note.line}` : `Line ${note.line}`
}
