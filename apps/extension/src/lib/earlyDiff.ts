// The early content script starts the diff download before GitHub's page has loaded and leaves the pending result
// here. Both scripts run in the extension's own isolated world, so the page cannot see it.
export const EARLY_DIFF = '__prSiftEarlyDiff'

export interface EarlyDiff {
  base: string
  at: number
  text: Promise<string | null>
}

type Host = typeof globalThis & { [EARLY_DIFF]?: EarlyDiff }

const MAX_AGE = 60_000

export function setEarlyDiff(entry: EarlyDiff) {
  ;(globalThis as Host)[EARLY_DIFF] = entry
}

/** The diff the early script started for this pull request, once. */
export function takeEarlyDiff(base: string): Promise<string | null> | null {
  const host = globalThis as Host
  const entry = host[EARLY_DIFF]
  if (!entry) return null
  delete host[EARLY_DIFF]
  return entry.base === base && Date.now() - entry.at < MAX_AGE ? entry.text : null
}
