export interface ReviewCommentLike {
  id: number
  inReplyTo?: number | null
  line: number | null
}

export interface ThreadOf<T> {
  root: T
  comments: T[]
}

// GitHub keeps a comment whose line no longer exists in the diff, with `line` set to null. Like GitHub's files view,
// those outdated threads are left out.
export function groupThreads<T extends ReviewCommentLike>(comments: T[]): ThreadOf<T>[] {
  const threadOf = new Map<number, ThreadOf<T>>()
  const threads: ThreadOf<T>[] = []
  for (const comment of [...comments].sort((a, b) => a.id - b.id)) {
    const parent = comment.inReplyTo ? threadOf.get(comment.inReplyTo) : undefined
    if (parent) {
      parent.comments.push(comment)
      threadOf.set(comment.id, parent)
      continue
    }
    const thread = { root: comment, comments: [comment] }
    threadOf.set(comment.id, thread)
    threads.push(thread)
  }
  return threads.filter((t) => t.root.line !== null)
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  if (Number.isNaN(seconds)) return ''
  if (Math.abs(seconds) < 60) return 'just now'
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const [unit, size] = UNITS.find(([, size]) => Math.abs(seconds) >= size)!
  return format.format(Math.round(seconds / size), unit)
}
