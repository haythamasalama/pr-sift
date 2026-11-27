import { createHash } from 'node:crypto'
import type { PatchFile } from '#shared/ipc'

const unquote = (name: string) => (name.startsWith('"') && name.endsWith('"') ? JSON.parse(name) : name) as string
const strip = (name: string) => unquote(name.trim()).replace(/^[ab]\//, '')

// Splits the output of `git diff` into one entry per file, shaped like GitHub's pull request files so the
// review's own file tree and diff cards can show it.
export function splitPatch(text: string): PatchFile[] {
  const files: PatchFile[] = []
  const chunks = text.split(/^diff --git /m).slice(1)
  for (const chunk of chunks) {
    const lines = chunk.split('\n')
    let status: PatchFile['status'] = 'modified'
    let filename = ''
    let from = ''
    let binary = false
    let i = 1
    for (; i < lines.length && !lines[i]!.startsWith('@@'); i++) {
      const line = lines[i]!
      if (line.startsWith('new file mode')) status = 'added'
      else if (line.startsWith('deleted file mode')) status = 'removed'
      else if (line.startsWith('rename from ')) from = line.slice(12)
      else if (line.startsWith('rename to ')) {
        status = 'renamed'
        filename = line.slice(10)
      } else if (line.startsWith('+++ ') && !line.startsWith('+++ /dev/null')) filename = strip(line.slice(4))
      else if (line.startsWith('--- ') && !line.startsWith('--- /dev/null') && !filename) filename = strip(line.slice(4))
      else if (line.startsWith('Binary files')) binary = true
    }
    if (!filename) {
      // A mode change or binary file has no ---/+++ lines; the header names it twice: `a/x b/x`.
      const head = lines[0] ?? ''
      const half = head.slice(Math.floor(head.length / 2)).trim()
      filename = strip(half)
    }
    const body = lines.slice(i)
    while (body.length && body.at(-1) === '') body.pop()
    let additions = 0
    let deletions = 0
    for (const line of body) {
      if (line.startsWith('+')) additions++
      else if (line.startsWith('-')) deletions++
    }
    const patch = binary || !body.length ? undefined : body.join('\n')
    files.push({
      filename: unquote(filename),
      previous: from ? unquote(from) : undefined,
      status,
      additions,
      deletions,
      patch,
      hash: createHash('sha1')
        .update(patch ?? chunk)
        .digest('hex')
        .slice(0, 12),
    })
  }
  return files
}
