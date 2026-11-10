import { describe, expect, it } from 'vitest'
import { REPO_URL, browserName, reportUrl } from '../../src/lib/report'

const chromeAgent = 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

describe('reportUrl', () => {
  it('prefills the extension version and browser on a bug report', () => {
    const url = new URL(reportUrl('bug', { version: '0.1.0', userAgent: chromeAgent }))
    expect(url.origin + url.pathname).toBe(`${REPO_URL}/issues/new`)
    expect(url.searchParams.get('template')).toBe('bug_report.yml')
    expect(url.searchParams.get('version')).toBe('0.1.0')
    expect(url.searchParams.get('browser')).toBe('Chrome 130')
  })

  it('opens the suggestion form without any environment data', () => {
    const url = new URL(reportUrl('idea', { version: '0.1.0', userAgent: chromeAgent }))
    expect(url.searchParams.get('template')).toBe('feature_request.yml')
    expect([...url.searchParams.keys()]).toEqual(['template'])
  })

  it('leaves the browser out when it is not recognised', () => {
    expect(browserName('curl/8')).toBe('')
  })
})
