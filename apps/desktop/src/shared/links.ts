// Links to a pull request: GitHub's own, and PR Sift's prsift:// one that opens it in the desktop app.
export const SCHEME = 'prsift'

export interface PullLink {
  owner: string
  repo: string
  number: number
}

const PULL_PATH = /^\/?([\w.-]+)\/([\w.-]+)\/pull\/(\d+)(?:[/?#]|$)/

// Reads https://github.com/owner/repo/pull/12 (any tab of it), github.com/… without the scheme,
// or prsift://github.com/owner/repo/pull/12. Anything else is not a pull request link.
export function parsePullLink(text: string): PullLink | null {
  const raw = text.trim()
  if (!raw || /\s/.test(raw)) return null
  let rest: string
  if (raw.startsWith(`${SCHEME}://`)) rest = raw.slice(SCHEME.length + 3)
  else if (/^https?:\/\//i.test(raw)) rest = raw.replace(/^https?:\/\//i, '')
  else rest = raw
  const host = /^(?:www\.)?github\.com\//i.exec(rest)
  if (!host) return null
  const m = PULL_PATH.exec(rest.slice(host[0].length - 1))
  if (!m) return null
  const number = Number(m[3])
  return number > 0 ? { owner: m[1]!, repo: m[2]!, number } : null
}

export const githubPullUrl = (p: PullLink) => `https://github.com/${p.owner}/${p.repo}/pull/${p.number}`
export const appPullUrl = (p: PullLink) => `${SCHEME}://github.com/${p.owner}/${p.repo}/pull/${p.number}`
