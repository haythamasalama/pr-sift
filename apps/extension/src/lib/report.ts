export const REPO_URL = 'https://github.com/haythamasalama/pr-sift'

export type ReportKind = 'bug' | 'idea'

const TEMPLATES: Record<ReportKind, string> = { bug: 'bug_report.yml', idea: 'feature_request.yml' }

export function browserName(userAgent: string): string {
  const chrome = /(?:Chrome|Chromium)\/(\d+)/.exec(userAgent)
  return chrome ? `Chrome ${chrome[1]}` : ''
}

export function reportUrl(kind: ReportKind, env: { version: string; userAgent: string }): string {
  const params = new URLSearchParams({ template: TEMPLATES[kind] })
  if (kind === 'bug') {
    params.set('version', env.version)
    const browser = browserName(env.userAgent)
    if (browser) params.set('browser', browser)
  }
  return `${REPO_URL}/issues/new?${params}`
}

export function openReport(kind: ReportKind) {
  const version = typeof chrome !== 'undefined' ? (chrome.runtime?.getManifest?.().version ?? '') : ''
  window.open(reportUrl(kind, { version, userAgent: navigator.userAgent }), '_blank', 'noopener')
}
