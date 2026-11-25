import type { Worktree } from '#shared/ipc'

// Parses `git worktree list --porcelain`: one block per worktree, blocks separated by a blank line. The first block
// is always the main worktree.
export function parseWorktreeList(text: string): Worktree[] {
  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean)
  return blocks.flatMap((block, index) => {
    const lines = block.split('\n')
    const first = lines[0] ?? ''
    if (!first.startsWith('worktree ')) return []
    const wt: Worktree = {
      path: first.slice('worktree '.length),
      head: '',
      detached: false,
      bare: false,
      locked: false,
      prunable: false,
      main: index === 0,
    }
    for (const line of lines.slice(1)) {
      const space = line.indexOf(' ')
      const key = space === -1 ? line : line.slice(0, space)
      const value = space === -1 ? '' : line.slice(space + 1)
      if (key === 'HEAD') wt.head = value
      else if (key === 'branch') wt.branch = value.replace(/^refs\/heads\//, '')
      else if (key === 'detached') wt.detached = true
      else if (key === 'bare') wt.bare = true
      else if (key === 'locked') {
        wt.locked = true
        if (value) wt.lockReason = value
      } else if (key === 'prunable') wt.prunable = true
    }
    return [wt]
  })
}

// A linked worktree's `.git` is a file that points at its admin folder inside the main repository.
export function parseGitFile(text: string): string | null {
  const match = /^gitdir:\s*(.+?)\s*$/m.exec(text)
  return match ? match[1]! : null
}
