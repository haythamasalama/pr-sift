import type { PrRef } from '@/lib/types'

// Pull request pages that arrive from outside GitHub (Slack, mail, another app) go to PR Sift for desktop.
// A link the app opens in the browser carries this mark, so it stays here instead of bouncing back.
// Keep it in step with STAY_IN_BROWSER in apps/desktop/src/shared/links.ts.
export const STAY_IN_BROWSER = { name: 'prsift', value: 'web' } as const

const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/|$)/

export const appLink = (pr: PrRef) => `prsift://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}`

export interface Arrival {
  url: string
  referrer: string
  // PerformanceNavigationTiming.type: navigate, reload or back_forward.
  navigation?: string
}

// The pull request to hand to the app, or null when the page should stay in the browser: it was reached
// from another GitHub page, reloaded, revisited with Back, or opened by the app itself.
export function handOffTarget({ url, referrer, navigation }: Arrival): PrRef | null {
  const page = new URL(url)
  if (page.hostname !== 'github.com') return null
  if (page.searchParams.get(STAY_IN_BROWSER.name) === STAY_IN_BROWSER.value) return null
  if (navigation && navigation !== 'navigate') return null
  if (referrer && fromGitHub(referrer)) return null
  const m = PR_PATH.exec(page.pathname)
  const number = m ? Number(m[3]) : 0
  return m && number > 0 ? { owner: m[1]!, repo: m[2]!, number } : null
}

function fromGitHub(referrer: string) {
  try {
    const host = new URL(referrer).hostname
    return host === 'github.com' || host.endsWith('.github.com')
  } catch {
    return false
  }
}

// The address without the stay mark, so a reload or a copied link is the plain GitHub one.
export function withoutMark(url: string): string | null {
  const page = new URL(url)
  if (!page.searchParams.has(STAY_IN_BROWSER.name)) return null
  page.searchParams.delete(STAY_IN_BROWSER.name)
  return page.toString()
}
