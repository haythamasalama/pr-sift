import { parsePatch } from './diff'
import { describeLines, startOf } from './range'
import type { DiffRow, Note, PrFile, PrRef } from './types'

export function anchorOf(row: DiffRow): { side: Note['side']; line: number } | null {
  if (row.kind === 'del' && row.oldNo !== '') return { side: 'old', line: row.oldNo }
  if ((row.kind === 'add' || row.kind === 'ctx') && row.newNo !== '') return { side: 'new', line: row.newNo }
  return null
}

const prefix: Record<DiffRow['kind'], string> = { add: '+', del: '-', ctx: ' ', hunk: '', note: '' }

function contextFor(patch: string | undefined, note: Note): string {
  if (!patch) return note.lineText
  const rows = parsePatch(patch)
  const find = (line: number) =>
    rows.findIndex((r) => {
      const a = anchorOf(r)
      return a?.side === note.side && a.line === line
    })
  const at = find(note.line)
  if (at === -1) return note.lineText
  const from = startOf(note) < note.line ? find(startOf(note)) : -1
  return rows
    .slice(from === -1 ? Math.max(0, at - 3) : Math.max(0, from - 1), at + 1)
    .filter((r) => r.kind !== 'hunk')
    .map((r) => prefix[r.kind] + r.text)
    .join('\n')
}

export function buildClaudePrompt(pr: PrRef, title: string, notes: Note[], files: PrFile[]): string {
  const byFile = new Map<string, Note[]>()
  for (const n of [...notes].filter((n) => !n.resolved).sort((a, b) => a.file.localeCompare(b.file) || startOf(a) - startOf(b))) {
    byFile.set(n.file, [...(byFile.get(n.file) ?? []), n])
  }
  const patches = new Map(files.map((f) => [f.filename, f.patch]))
  const out: string[] = [
    `I'm reviewing https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number} ("${title}").`,
    `These are my private review notes. For each one, look at the code and tell me what you find or propose a fix. Do not post anything to GitHub.`,
  ]
  for (const [file, list] of byFile) {
    out.push('', `## ${file}`)
    for (const n of list) {
      out.push(
        '',
        `### ${describeLines(n)} (${n.side === 'new' ? 'new code' : 'removed code'})`,
        '```diff',
        contextFor(patches.get(file), n),
        '```',
      )
      if (n.quote) out.push(`Selected: \`${n.quote.replace(/`/g, "'")}\``)
      out.push(`Note: ${n.text}`)
    }
  }
  return out.join('\n')
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function githubLineUrl(pr: PrRef, note: Pick<Note, 'file' | 'side' | 'line' | 'startLine'>): Promise<string> {
  const hash = await sha256(note.file)
  return `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}/files#diff-${hash}${note.side === 'new' ? 'R' : 'L'}${startOf(note)}${startOf(note) < note.line ? `-${note.side === 'new' ? 'R' : 'L'}${note.line}` : ''}`
}
