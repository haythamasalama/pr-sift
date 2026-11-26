// Merging past the branch rules from a list: the merge waits for the bypass box, like on GitHub.
// Usage: node tests/e2e/bypass.mjs [screenshots folder]
import { _electron as electron } from 'playwright'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [shots = tmpdir()] = process.argv.slice(2)
const app = fileURLToPath(new URL('../../out/main/index.js', import.meta.url))
const config = mkdtempSync(join(tmpdir(), 'pr-sift-bypass-'))
const electronApp = await electron.launch({
  args: [app, '--no-sandbox', '--disable-gpu'],
  env: { ...process.env, XDG_CONFIG_HOME: config, APPDATA: config },
})

await electronApp.evaluate(() => {
  const json = (body, headers = {}) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', ...headers } })
  const pull = {
    number: 7,
    title: 'Add a shopping cart',
    url: 'https://github.com/acme/shop/pull/7',
    isDraft: false,
    updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
    reviewDecision: 'REVIEW_REQUIRED',
    headRefName: 'feature/cart',
    headRefOid: 'abc123',
    baseRefName: 'main',
    additions: 2,
    deletions: 0,
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'BLOCKED',
    viewerCanMergeAsAdmin: true,
    viewerLatestReview: null,
    repository: { name: 'shop', viewerPermission: 'ADMIN', owner: { login: 'acme' } },
    author: { login: 'octo-test', avatarUrl: null },
    labels: { nodes: [] },
    comments: { totalCount: 0 },
    reviewRequests: { nodes: [] },
    commits: { nodes: [{ commit: { statusCheckRollup: { state: 'FAILURE' } } }] },
  }
  globalThis.merges = []
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input))
    if (url.pathname === '/user') return json({ login: 'octo-test', avatar_url: null }, { 'x-oauth-scopes': 'repo, read:org' })
    if (url.pathname === '/graphql') {
      const query = JSON.parse(init.body).query
      if (query.includes('viewerCanMergeAsAdmin }')) return json({ data: { repository: { pullRequest: { viewerCanMergeAsAdmin: true } } } })
      if (query.includes('review:')) return json({ data: { review: { nodes: [] }, mine: { nodes: [pull] }, assigned: { nodes: [] } } })
      return json({ data: { viewer: { login: 'octo-test' }, search: { nodes: [] } } })
    }
    if (url.pathname === '/repos/acme/shop/pulls/7/merge') {
      globalThis.merges.push(JSON.parse(init.body))
      return json({ sha: 'fedcba9876', merged: true })
    }
    if (url.pathname === '/repos/acme/shop/pulls/7')
      return json({
        title: pull.title,
        body: '',
        commits: 1,
        mergeable_state: 'blocked',
        user: { login: 'octo-test' },
        head: { sha: 'abc123', label: 'octo-test:feature/cart' },
      })
    if (url.pathname === '/repos/acme/shop/pulls/7/commits')
      return json([{ commit: { message: 'feat: cart', author: { name: 'Octo', email: 'o@x.dev' } }, author: { login: 'octo-test' } }])
    if (url.pathname === '/repos/acme/shop') return json({ allow_squash_merge: true })
    return json([])
  }
})

const page = await electronApp.firstWindow()
await page.emulateMedia({ colorScheme: 'dark' })
await page.setViewportSize({ width: 1400, height: 700 })
const fail = async (message) => {
  await page.screenshot({ path: join(shots, 'bypass-failure.png') }).catch(() => undefined)
  console.error(message)
  await electronApp.close()
  process.exit(1)
}
await page.getByLabel('Personal access token').fill('ghp_example_token_for_bypass_test')
await page.getByRole('button', { name: 'Sign in', exact: true }).click()
// Through the first-run steps, leaving the style and projects as they are.
await page.getByRole('heading', { name: 'Pick your style' }).waitFor()
await page.getByRole('button', { name: 'Continue' }).click()
await page.getByRole('button', { name: 'Skip for now' }).click()
await page.getByText('Add a shopping cart').waitFor()

const merge = page.getByRole('button', { name: /You can bypass the rules/ })
await merge.click()
await page.getByText('Merge without waiting for the rules').waitFor()
const confirm = page.locator('[data-slot="popover-content"] button', { hasText: 'Squash and merge' })
if (!(await confirm.isDisabled())) await fail('The merge went ahead without the bypass box')
await page.waitForTimeout(200)
await page.screenshot({ path: join(shots, 'bypass-1-asks.png') })

await page.getByRole('checkbox').click()
const bypass = page.getByRole('button', { name: 'Bypass rules and merge' })
await bypass.waitFor()
await page.waitForTimeout(200)
await page.screenshot({ path: join(shots, 'bypass-2-ticked.png') })
await bypass.click()
await page.getByText('Merged', { exact: true }).waitFor()
const merges = await electronApp.evaluate(() => globalThis.merges)
if (merges.length !== 1 || merges[0].sha !== 'abc123') await fail(`Unexpected merges: ${JSON.stringify(merges)}`)
await page.screenshot({ path: join(shots, 'bypass-3-merged.png') })
await electronApp.close()
console.log('Bypass run passed')
