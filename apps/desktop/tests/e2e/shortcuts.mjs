// The menu bar and its shortcuts, and the review beside the sidebar: Focus, Previous and Next.
// Usage: node tests/e2e/shortcuts.mjs [screenshots folder]
import { _electron as electron } from 'playwright'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [shots = tmpdir()] = process.argv.slice(2)
const app = fileURLToPath(new URL('../../out/main/index.js', import.meta.url))
const config = mkdtempSync(join(tmpdir(), 'pr-sift-shortcuts-'))
const electronApp = await electron.launch({
  args: [app, '--no-sandbox', '--disable-gpu'],
  env: { ...process.env, XDG_CONFIG_HOME: config, APPDATA: config },
})

await electronApp.evaluate(() => {
  const json = (body, headers = {}) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', ...headers } })
  const TITLES = { 7: 'Add a shopping cart', 8: 'Show prices with tax', 9: 'Remember the last search' }
  const pull = (number) => ({
    number,
    title: TITLES[number],
    url: `https://github.com/acme/shop/pull/${number}`,
    isDraft: false,
    updatedAt: new Date(Date.now() - number * 3_600_000).toISOString(),
    reviewDecision: 'REVIEW_REQUIRED',
    headRefName: `feature/${number}`,
    headRefOid: `abc${number}`,
    baseRefName: 'main',
    additions: number,
    deletions: 1,
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'BLOCKED',
    viewerCanMergeAsAdmin: false,
    viewerLatestReview: null,
    repository: { name: 'shop', viewerPermission: 'WRITE', owner: { login: 'acme' } },
    author: { login: 'teammate', avatarUrl: null },
    labels: { nodes: [] },
    comments: { totalCount: 0 },
    reviewRequests: { nodes: [{ requestedReviewer: { login: 'octo-test' } }] },
    commits: { nodes: [{ commit: { statusCheckRollup: { state: 'SUCCESS' } } }] },
  })
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input))
    if (url.pathname === '/user')
      return json({ login: 'octo-test', name: 'Octo Test', avatar_url: null }, { 'x-oauth-scopes': 'repo, read:org' })
    if (url.pathname === '/graphql') {
      const query = JSON.parse(init.body).query
      if (query.includes('review:'))
        return json({ data: { review: { nodes: [pull(7), pull(8), pull(9)] }, mine: { nodes: [] }, assigned: { nodes: [] } } })
      return json({ data: { viewer: { login: 'octo-test' }, search: { nodes: [] } } })
    }
    const one = url.pathname.match(/^\/repos\/acme\/shop\/pulls\/(\d+)$/)
    if (one)
      return json({
        title: TITLES[one[1]],
        changed_files: 1,
        head: { sha: `abc${one[1]}`, ref: `feature/${one[1]}` },
        base: { ref: 'main' },
        user: { login: 'teammate' },
        state: 'open',
        body_html: '<p>A change.</p>',
      })
    const files = url.pathname.match(/^\/repos\/acme\/shop\/pulls\/(\d+)\/files$/)
    if (files)
      return json([
        {
          filename: `src/f${files[1]}.js`,
          status: 'added',
          additions: 1,
          deletions: 0,
          patch: '@@ -0,0 +1 @@\n+export const x = 1',
          sha: '1',
        },
      ])
    return json([])
  }
})

const page = await electronApp.firstWindow()
await page.emulateMedia({ colorScheme: 'dark' })
await page.setViewportSize({ width: 1400, height: 800 })
const fail = async (message) => {
  await page.screenshot({ path: join(shots, 'shortcuts-failure.png') }).catch(() => undefined)
  console.error(message)
  await electronApp.close()
  process.exit(1)
}
const menu = (command) =>
  electronApp.evaluate(({ BrowserWindow }, c) => BrowserWindow.getAllWindows()[0].webContents.send('menu:command', c), command)

// The menu bar has the usual menus, with Settings on ⌘, (Ctrl+, off a Mac).
const menus = await electronApp.evaluate(({ Menu }) =>
  Menu.getApplicationMenu().items.map((m) => ({
    label: m.label,
    items: m.submenu?.items.map((i) => `${i.label}|${i.accelerator ?? ''}`) ?? [],
  })),
)
const all = menus.flatMap((m) => m.items)
for (const want of ['Settings|CmdOrCtrl+,', 'Needs You|CmdOrCtrl+1', 'Refresh|CmdOrCtrl+R', 'Keyboard Shortcuts|CmdOrCtrl+/'])
  if (!all.some((i) => i.replace('…', '') === want)) await fail(`Menu item missing: ${want}\n${JSON.stringify(menus)}`)
for (const want of ['File', 'Edit', 'View', 'Go']) if (!menus.some((m) => m.label === want)) await fail(`Menu missing: ${want}`)

await page.getByLabel('Personal access token').fill('ghp_example_token_for_shortcuts_test')
await page.getByRole('button', { name: 'Sign in', exact: true }).click()
await page.getByRole('heading', { name: 'Pick your style' }).waitFor()
await page.getByRole('button', { name: 'Continue' }).click()
await page.getByRole('button', { name: 'Skip for now' }).click()
await page.getByText('Show prices with tax').waitFor()

// The account at the foot of the sidebar: name, then login.
const account = page.getByRole('button', { name: 'Account' })
if (!(await account.innerText()).includes('Octo Test')) await fail('The sidebar does not show the account name')

await menu('settings')
await page.getByRole('heading', { name: 'Settings' }).first().waitFor()
await menu('view:inbox')
await page.getByText('Show prices with tax').waitFor()
await menu('shortcuts')
await page.getByRole('heading', { name: 'Keyboard shortcuts' }).waitFor()
await page.waitForTimeout(200)
await page.screenshot({ path: join(shots, 'shortcuts-1-list.png') })
await page.keyboard.press('Escape')

// The review opens beside the sidebar.
await page.getByText('Show prices with tax').click()
await page.getByText('src/f8.js').first().waitFor()
await page.getByText('2/3').waitFor()
await page.waitForTimeout(300)
await page.screenshot({ path: join(shots, 'shortcuts-2-review-inline.png') })
const nav = await page.getByRole('navigation', { name: 'Sections' }).boundingBox()
if (!nav || nav.width < 100) await fail('The sidebar is hidden while reviewing')

await menu('pull:next')
await page.getByText('src/f9.js').first().waitFor()
await page.getByText('3/3').waitFor()
await page.getByRole('button', { name: 'Previous pull request' }).click()
await page.getByText('src/f8.js').first().waitFor()

// Focus covers the window, and stays on for the next review.
await menu('focus')
await page.waitForTimeout(300)
const panel = await page.locator('.ps-root .fixed.inset-0').first().boundingBox()
if (!panel || panel.x !== 0) await fail('Focus did not hide the sidebar')
await page.screenshot({ path: join(shots, 'shortcuts-3-focus.png') })
const focusSaved = await page.evaluate(() => localStorage.getItem('ps:review-focus'))
if (focusSaved !== '1') await fail('Focus was not remembered')
await page.getByRole('button', { name: 'Show the sidebar' }).click()
await page.waitForTimeout(200)

// Choosing a place in the sidebar leaves the review.
await page.getByRole('button', { name: 'Auto-approve' }).click()
await page.getByText('src/f8.js').first().waitFor({ state: 'detached' })

await electronApp.close()
console.log('Shortcuts run passed')
