import { hashText } from './hash'
import type { DiffRow, PrFile } from './types'

export function unquotePath(path: string): string {
  if (!path.startsWith('"') || !path.endsWith('"')) return path
  const bytes: number[] = []
  const body = path.slice(1, -1)
  const simple: Record<string, number> = { n: 10, t: 9, '"': 34, '\\': 92 }
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]!
    if (ch !== '\\') {
      bytes.push(...new TextEncoder().encode(ch))
      continue
    }
    const next = body[i + 1] ?? ''
    if (/[0-7]/.test(next)) {
      bytes.push(parseInt(body.slice(i + 1, i + 4), 8))
      i += 3
    } else {
      bytes.push(simple[next] ?? next.charCodeAt(0))
      i += 1
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

function filenameOf(part: string): string {
  const at = part.indexOf('\n@@')
  const header = at === -1 ? part : part.slice(0, at)
  const line = (pattern: RegExp) => {
    const m = pattern.exec(header)
    return m ? unquotePath(m[1]!.trim()) : null
  }
  const renamed = line(/^rename to (.+)$/m)
  if (renamed) return renamed
  const after = line(/^\+\+\+ (.+)$/m)
  if (after && after !== '/dev/null') return after.replace(/^b\//, '')
  const before = line(/^--- (.+)$/m)
  if (before && before !== '/dev/null') return before.replace(/^a\//, '')
  const first = header.split('\n')[0] ?? ''
  const plain = /^a\/(.+?) b\/(.+)$/.exec(first)
  return plain ? plain[2]! : first
}

export function parseDiff(text: string, base: string): PrFile[] {
  return text
    .split(/^diff --git /m)
    .slice(1)
    .map((part) => {
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
        filename: filenameOf(part),
        status,
        additions,
        deletions,
        patch: patch || undefined,
        hash: hashText(patch || (/^index (\S+)/m.exec(part)?.[1] ?? `${status}:${additions}:${deletions}`)),
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
