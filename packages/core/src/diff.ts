import { hashText } from './hash'
import type { DiffRow, PrFile } from './types'

export function parseDiff(text: string, base: string): PrFile[] {
  return text
    .split(/^diff --git /m)
    .slice(1)
    .map((part) => {
      const firstLine = part.split('\n')[0] ?? ''
      const head = /^a\/(.+?) b\/(.+)$/.exec(firstLine)
      const at = part.indexOf('\n@@')
      const patch = at === -1 ? '' : part.slice(at + 1).replace(/\n$/, '')
      let additions = 0
      let deletions = 0
      for (const line of patch.split('\n')) {
        if (line[0] === '+') additions++
        else if (line[0] === '-') deletions++
      }
      const status = /^new file mode/m.test(part)
        ? 'added'
        : /^deleted file mode/m.test(part)
          ? 'removed'
          : /^rename from/m.test(part)
            ? 'renamed'
            : 'modified'
      return {
        filename: head ? head[2]! : firstLine,
        status,
        additions,
        deletions,
        patch: patch || undefined,
        hash: hashText(patch || `${status}:${additions}:${deletions}`),
        blob_url: base + '/files',
      }
    })
}

export function parsePatch(patch: string): DiffRow[] {
  const rows: DiffRow[] = []
  let oldNo = 0
  let newNo = 0
  for (const line of patch.replace(/\n$/, '').split('\n')) {
    if (line.startsWith('@@')) {
      const m = /@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(line)
      oldNo = Number(m?.[1] ?? 0)
      newNo = Number(m?.[2] ?? 0)
      rows.push({ kind: 'hunk', oldNo: '', newNo: '', text: line })
    } else if (line[0] === '+') {
      rows.push({ kind: 'add', oldNo: '', newNo: newNo++, text: line.slice(1) })
    } else if (line[0] === '-') {
      rows.push({ kind: 'del', oldNo: oldNo++, newNo: '', text: line.slice(1) })
    } else if (line[0] === '\\') {
      rows.push({ kind: 'note', oldNo: '', newNo: '', text: line })
    } else {
      rows.push({ kind: 'ctx', oldNo: oldNo++, newNo: newNo++, text: line.slice(1) })
    }
  }
  return rows
}

export interface SplitRow {
  full: number | null
  left: number | null
  right: number | null
}

export function buildSplitRows(rows: DiffRow[]): SplitRow[] {
  const out: SplitRow[] = []
  let i = 0
  while (i < rows.length) {
    const kind = rows[i]!.kind
    if (kind === 'hunk' || kind === 'note') {
      out.push({ full: i, left: null, right: null })
      i++
    } else if (kind === 'ctx') {
      out.push({ full: null, left: i, right: i })
      i++
    } else {
      const dels: number[] = []
      const adds: number[] = []
      while (i < rows.length && rows[i]!.kind === 'del') dels.push(i++)
      while (i < rows.length && rows[i]!.kind === 'add') adds.push(i++)
      for (let k = 0; k < Math.max(dels.length, adds.length); k++) {
        out.push({ full: null, left: dels[k] ?? null, right: adds[k] ?? null })
      }
    }
  }
  return out
}
