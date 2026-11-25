import { lstat, readdir } from 'node:fs/promises'
import { join } from 'node:path'

// The space a folder takes on disk, without following symlinks. Uses allocated blocks where the system reports them,
// so sparse and compressed files count as what they really take.
export async function diskUsage(path: string): Promise<number> {
  let total = 0
  const queue = [path]
  const seen = new Set<string>()
  while (queue.length) {
    const batch = queue.splice(0, 64)
    await Promise.all(
      batch.map(async (p) => {
        let st
        try {
          st = await lstat(p, { bigint: false })
        } catch {
          return
        }
        // Hard links (pnpm's store, for example) are counted once.
        if (st.nlink > 1) {
          const id = `${st.dev}:${st.ino}`
          if (seen.has(id)) return
          seen.add(id)
        }
        total += st.blocks ? st.blocks * 512 : st.size
        if (st.isDirectory()) {
          try {
            for (const name of await readdir(p)) queue.push(join(p, name))
          } catch {
            return
          }
        }
      }),
    )
  }
  return total
}

// Runs at most `limit` jobs at once; scans of big folders would otherwise starve the disk.
export function limiter(limit: number) {
  let active = 0
  const waiting: (() => void)[] = []
  return async function <T>(job: () => Promise<T>): Promise<T> {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve))
    active++
    try {
      return await job()
    } finally {
      active--
      waiting.shift()?.()
    }
  }
}
