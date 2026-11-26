// Launches the built app with a throwaway profile against a stubbed GitHub, and walks through every screen.
// Usage: node tests/e2e/smoke.mjs <projects folder> <screenshots folder>
// The projects folder needs a repository `shop` (origin github.com/acme/shop) with a worktree on `feature/cart`,
// a second clone of it, `shop-copy`, a repository `docs` (origin github.com/acme/docs) and repositories `r0` to `r7`.
import { _electron as electron } from 'playwright'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [projects, shots = tmpdir()] = process.argv.slice(2)
const app = fileURLToPath(new URL('../../out/main/index.js', import.meta.url))
const config = mkdtempSync(join(tmpdir(), 'pr-sift-smoke-'))

const electronApp = await electron.launch({
  args: [app, '--no-sandbox', '--disable-gpu'],
  env: { ...process.env, XDG_CONFIG_HOME: config, APPDATA: config },
})
const errors = []
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
    baseRefName: 'main',
    additions: 2,
    deletions: 0,
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'BLOCKED',
    viewerCanMergeAsAdmin: false,
    repository: { name: 'shop', viewerPermission: 'WRITE', owner: { login: 'acme' } },
    author: { login: 'teammate', avatarUrl: null },
    labels: { nodes: [{ name: 'feature', color: '0e8a16' }] },
    comments: { totalCount: 2 },
    reviewRequests: { nodes: [{ requestedReviewer: { login: 'octo-test' } }] },
    commits: { nodes: [{ commit: { statusCheckRollup: { state: 'SUCCESS' } } }] },
  }
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input))
    if (url.pathname === '/user')
      return json({ login: 'octo-test', name: 'Octo Test', avatar_url: null }, { 'x-oauth-scopes': 'repo, read:org' })
    if (url.pathname === '/graphql') {
      const query = JSON.parse(init.body).query
      if (query.includes('viewer { login }'))
        return json({
          data: {
            viewer: { login: 'octo-test' },
            search: {
              nodes: [
                {
                  ...pull,
                  headRefOid: 'abc123',
                  changedFiles: 1,
                  files: { nodes: [{ path: 'docs/cart.md' }] },
                  latestReviews: { nodes: [] },
                  commits: {
                    nodes: [{ commit: { pushedDate: null, committedDate: pull.updatedAt, statusCheckRollup: { state: 'SUCCESS' } } }],
                  },
                },
                {
                  ...pull,
                  number: 8,
                  title: 'Speed up checkout',
                  url: 'https://github.com/acme/shop/pull/8',
                  headRefOid: 'def456',
                  changedFiles: 3,
                  files: { nodes: [{ path: 'src/checkout.js' }, { path: 'src/cart.js' }, { path: 'README.md' }] },
                  latestReviews: { nodes: [] },
                  commits: {
                    nodes: [{ commit: { pushedDate: null, committedDate: pull.updatedAt, statusCheckRollup: { state: 'FAILURE' } } }],
                  },
                },
              ],
            },
          },
        })
      if (query.includes('type: USER'))
        return json({ data: { search: { nodes: [{ login: 'omarbenz', name: 'Omar Benz', avatarUrl: null }] } } })
      if (query.includes('mentionableUsers'))
        return json({
          data: {
            repository: {
              defaultBranchRef: { name: 'main' },
              labels: {
                nodes: [
                  { name: 'docs', color: '0075ca' },
                  { name: 'feature', color: '0e8a16' },
                  { name: 'bug', color: 'd73a4a' },
                ],
              },
              mentionableUsers: {
                nodes: [
                  { login: 'teammate', name: 'Omar Haddad', avatarUrl: null },
                  { login: 'octo-test', name: 'Octo Test', avatarUrl: null },
                ],
              },
              object: {
                entries: [
                  { name: 'src', type: 'tree' },
                  { name: 'docs', type: 'tree' },
                  { name: 'README.md', type: 'blob' },
                ],
              },
            },
          },
        })
      if (query.includes('review:')) globalThis.inboxAsked = (globalThis.inboxAsked ?? 0) + 1
      if (query.includes('review:')) return json({ data: { review: { nodes: [pull] }, mine: { nodes: [] }, assigned: { nodes: [] } } })
      return json({ data: { repository: { defaultBranchRef: { name: 'main' }, pullRequests: { nodes: [pull] }, issues: { nodes: [] } } } })
    }
    if (url.pathname === '/repos/acme/shop/pulls/7')
      return json({
        title: 'Add a shopping cart',
        changed_files: 1,
        head: { sha: 'abc123', ref: 'feature/cart' },
        base: { ref: 'main' },
        user: { login: 'teammate' },
        state: 'open',
        body_html: '<p>Adds a cart.</p>',
      })
    if (url.pathname === '/repos/acme/shop/pulls/7/files')
      return json([
        {
          filename: 'src/cart.js',
          status: 'added',
          additions: 2,
          deletions: 0,
          patch: '@@ -0,0 +1,2 @@\n+export const cart = []\n+export const add = (x) => cart.push(x)',
          sha: '1',
          blob_url: 'https://github.com/acme/shop/blob/abc123/src/cart.js',
        },
      ])
    return json([])
  }
})
const page = await electronApp.firstWindow()
await page.emulateMedia({ colorScheme: process.env.SMOKE_THEME === 'light' ? 'light' : 'dark' })
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
await page.setViewportSize({ width: 1180, height: 780 })
process.on('uncaughtException', async (e) => {
  await page.screenshot({ path: join(shots, 'failure.png') }).catch(() => undefined)
  console.error(String(e), '\nConsole errors:\n' + errors.join('\n'))
  await electronApp.close().catch(() => undefined)
  process.exit(1)
})

await page.getByText('Sign in to GitHub').waitFor()
await electronApp.evaluate(async ({ BrowserWindow }) => {
  for (let i = 0; i < 50 && !BrowserWindow.getAllWindows()[0]?.isVisible(); i++) await new Promise((r) => setTimeout(r, 100))
})
await page.screenshot({ path: join(shots, '1-sign-in.png') })
await page.getByLabel('Personal access token').fill('ghp_example_token_for_smoke_test')
await page.getByRole('button', { name: 'Sign in', exact: true }).click()
await page.getByRole('heading', { name: 'Needs you' }).waitFor()
await page.getByText('Add a shopping cart').waitFor()
await page.screenshot({ path: join(shots, '2-inbox.png') })
// In a list, a button shows only when you can use it: you can approve this one, but GitHub would refuse a merge.
await page.getByRole('button', { name: 'Approve', exact: true }).first().waitFor()
if (await page.getByRole('button', { name: 'Choose how to merge' }).count()) throw new Error('Merge shows on a blocked pull request')
// A change made from the app (here a review) makes the lists look again on their own, with no Refresh.
const inboxAsked = () => electronApp.evaluate(() => globalThis.inboxAsked ?? 0)
const before = await inboxAsked()
await page.evaluate(() =>
  window.prSift.invoke('gh:request', { type: 'gh', path: '/repos/acme/shop/pulls/7/reviews', method: 'POST', body: { event: 'COMMENT' } }),
)
for (let i = 0; (await inboxAsked()) === before; i++) {
  if (i > 40) throw new Error('Needs you did not look again after a change')
  await page.waitForTimeout(100)
}
await page.setViewportSize({ width: 1600, height: 800 })
await page.waitForTimeout(300)
await page.screenshot({ path: join(shots, '2w-inbox-wide.png') })
await page.setViewportSize({ width: 1180, height: 780 })

await page.getByText('Add a shopping cart').click()
await page.getByText('src/cart.js').first().waitFor({ timeout: 15_000 })
await page.waitForTimeout(600)
await page.screenshot({ path: join(shots, '3-review.png') })
// Share copies the links a teammate needs, since the app has no address bar.
await page.getByRole('button', { name: 'Share' }).click()
await page.getByRole('menuitem', { name: /Copy GitHub link/ }).waitFor()
if (await page.getByRole('menuitem', { name: /PR Sift link/ }).count()) throw new Error('Share still offers a PR Sift link')
await page.waitForTimeout(250)
await page.screenshot({ path: join(shots, '3s-review-share.png') })
await page.getByRole('menuitem', { name: /Copy GitHub link/ }).click()
await page.keyboard.press('Escape')
await page.getByRole('heading', { name: 'Needs you' }).waitFor()

// A prsift:// link from the browser opens its pull request, wherever the app is.
await electronApp.evaluate(({ BrowserWindow }) =>
  BrowserWindow.getAllWindows()[0].webContents.send('pull:open', { owner: 'acme', repo: 'shop', number: 7 }),
)
await page.getByText('src/cart.js').first().waitFor({ timeout: 15_000 })
await page.keyboard.press('Escape')
await page.getByRole('heading', { name: 'Needs you' }).waitFor()
// So does pasting a GitHub link outside a text field.
await page.evaluate(() => {
  const data = new DataTransfer()
  data.setData('text/plain', 'https://github.com/acme/shop/pull/7/files')
  document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }))
})
await page.getByText('src/cart.js').first().waitFor({ timeout: 15_000 })
await page.keyboard.press('Escape')
await page.getByRole('heading', { name: 'Needs you' }).waitFor()

await page.evaluate(async (root) => {
  await window.prSift.invoke('settings:set', { roots: [root] })
}, projects)
await page.getByRole('button', { name: 'Add projects' }).click()
await page.getByRole('dialog').getByText('shop', { exact: true }).click()
await page.screenshot({ path: join(shots, '4-add-project.png') })
await page
  .getByRole('dialog')
  .getByRole('button', { name: /^Add 1 project/ })
  .click()
await page.getByRole('heading', { name: 'shop' }).waitFor()
await page
  .getByText(/Waiting for you/i)
  .first()
  .waitFor()
await page.screenshot({ path: join(shots, '5-project-pulls.png') })

const tab = (name) => page.getByRole('tab', { name: new RegExp(`^${name}`) })
await tab('Worktrees').click()
await page.getByRole('button', { name: 'feature/cart', exact: true }).waitFor()
await page.waitForTimeout(800)
await page.screenshot({ path: join(shots, '6-project-worktrees.png') })

// A worktree's changes, read like a pull request.
await page.getByRole('button', { name: 'feature/cart', exact: true }).click()
await page.getByText('remember the milk').waitFor()
await page.waitForTimeout(500)
await page.screenshot({ path: join(shots, '7-worktree-changes.png') })
// The More menu opens, rather than a tooltip catching the click.
await page.getByRole('button', { name: 'More', exact: true }).click()
await page.getByRole('menuitem', { name: 'Copy the branch name' }).waitFor()
await page.screenshot({ path: join(shots, '7m-worktree-more.png') })
await page.keyboard.press('Escape')
await page.getByRole('group', { name: 'Show' }).getByText('Whole branch').click()
await page.waitForTimeout(500)
await page.screenshot({ path: join(shots, '7b-worktree-branch.png') })
// The branch's commits, and one commit on its own.
await page.getByRole('button', { name: 'Commits' }).click()
await page.getByText('Let people add items to the cart').waitFor()
await page.waitForTimeout(500)
await page.screenshot({ path: join(shots, '7c-worktree-commits.png') })
await page.getByText('Add the cart', { exact: true }).click()
await page.getByRole('button', { name: 'Newer commit' }).waitFor()
await page.waitForTimeout(500)
await page.screenshot({ path: join(shots, '7d-worktree-commit.png') })
await page.getByRole('button', { name: 'Back to the whole branch' }).click()
await page.getByRole('group', { name: 'Show' }).getByText('Uncommitted').click()
await page.getByRole('button', { name: 'Discard changes' }).first().click()
await page.getByRole('dialog').getByText('Throw away the changes in notes.txt?').waitFor()
await page.keyboard.press('Escape')
await page.getByRole('button', { name: 'Back' }).first().click()

await page.getByRole('button', { name: 'More for feature/cart' }).click()
await page.getByRole('menuitem', { name: 'Rename' }).click()
await page.getByRole('textbox', { name: 'Folder' }).fill('shop-cart-v2')
await page.getByRole('button', { name: 'Save' }).click()
await page.getByText('Renamed to feature/cart.').waitFor()
await page.getByText('shop-cart-v2').first().waitFor()

await page.getByRole('button', { name: 'New worktree' }).click()
await page.getByRole('textbox', { name: 'Branch' }).fill('feature/wishlist')
await page.getByRole('button', { name: 'Create worktree' }).click()
await page.getByRole('button', { name: 'feature/wishlist', exact: true }).waitFor()
await page.waitForTimeout(800)
await page.screenshot({ path: join(shots, '8-worktrees-after.png') })

await tab('Branches').click()
await page.getByText('old-merged').waitFor()
// Main lines stay on top, and nothing offers to delete them.
{
  const names = await page.locator('[data-branch]').evaluateAll((rows) => rows.map((r) => r.getAttribute('data-branch')))
  if (names.slice(0, 2).join() !== 'main,develop') throw new Error(`main branches not first: ${names.join()}`)
  if (!(await page.getByRole('checkbox', { name: 'Select develop' }).isDisabled())) throw new Error('develop can be selected for deleting')
}
await page.getByRole('checkbox', { name: 'Select old-merged' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: join(shots, '9-branches.png') })
await page.getByRole('button', { name: 'Clear the selection' }).click()
// The narrowest the window goes: the project pages must still fit.
await page.setViewportSize({ width: 760, height: 700 })
await page.waitForTimeout(300)
await page.screenshot({ path: join(shots, '9b-branches-narrow.png') })
await tab('Pull requests').click()
await page.waitForTimeout(300)
await page.screenshot({ path: join(shots, '5b-pulls-narrow.png') })
await tab('Worktrees').click()
await page.waitForTimeout(500)
await page.screenshot({ path: join(shots, '6b-worktrees-narrow.png') })
await page.setViewportSize({ width: 1180, height: 780 })

await page.getByRole('button', { name: 'Delete feature/wishlist', exact: true }).click()
await page.getByRole('dialog').getByText('can’t be brought back').waitFor()
await page.screenshot({ path: join(shots, '8a-delete-confirm.png') })
await page.getByRole('dialog').getByRole('button', { name: 'Delete permanently' }).click()
await page.getByText('Deleted feature/wishlist. The branch is kept.').waitFor()

await tab('Hidden files').click()
await page.getByText('Build output').first().waitFor({ timeout: 20_000 })
await page.waitForTimeout(800)
await page.screenshot({ path: join(shots, '10-hidden-files.png') })

await page.getByRole('button', { name: 'Auto-approve' }).click()
await page.getByRole('heading', { name: 'Auto-approve' }).waitFor()
await page.waitForTimeout(400)
await page.screenshot({ path: join(shots, '12a-auto-approve-empty.png') })
await page.getByRole('button', { name: /^Docs only/ }).click()
await page.getByText('Would approve now').waitFor()
await page.waitForTimeout(1000)
await page.screenshot({ path: join(shots, '12-auto-approve-rule.png') })
await page.setViewportSize({ width: 1600, height: 900 })
await page.getByRole('button', { name: 'More conditions' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: join(shots, '12w-auto-approve-wide.png') })
await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 10_000))
await page.waitForTimeout(300)
await page.screenshot({ path: join(shots, '12w2-auto-approve-wide-scrolled.png') })
await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 0))
await page.getByRole('button', { name: 'More conditions' }).click()
// A laptop-sized window still has room for the preview beside the rule.
await page.setViewportSize({ width: 1250, height: 800 })
await page.waitForTimeout(300)
await page.screenshot({ path: join(shots, '12m-auto-approve-medium.png') })
await page.setViewportSize({ width: 1180, height: 780 })
await page.getByRole('button', { name: 'Repositories' }).click()
await page.getByLabel('Search repositories').waitFor()
await page.waitForTimeout(400)
await page.screenshot({ path: join(shots, '13-auto-approve-repos.png') })
await page.keyboard.press('Escape')
await page.getByRole('combobox', { name: 'Only from' }).fill('o')
await page.waitForTimeout(500)
await page.screenshot({ path: join(shots, '14-people-typeahead.png') })
await page.getByRole('combobox', { name: 'Only from' }).fill('')
await page.setViewportSize({ width: 760, height: 700 })
await page.waitForTimeout(300)
await page.screenshot({ path: join(shots, '12b-auto-approve-narrow.png') })
await page.setViewportSize({ width: 1180, height: 780 })
await page.getByRole('button', { name: 'Save rule' }).click()
await page.getByRole('heading', { name: 'Auto-approve' }).waitFor()
await page.waitForTimeout(800)
await page.screenshot({ path: join(shots, '12c-auto-approve-list.png') })
await page.getByRole('button', { name: 'What it approved' }).click()
await page.getByRole('dialog').getByText('What it approved').waitFor()
await page.waitForTimeout(400)
await page.screenshot({ path: join(shots, '12d-auto-approve-history.png') })
await page.keyboard.press('Escape')
// In a dry run the panel lists what it would approve, and each pull request opens in the review here, not in a browser.
await page.locator('[aria-label="Mode"]').getByText('Dry run', { exact: true }).click()
await page.getByRole('button', { name: 'What it approved' }).click()
await page.getByRole('dialog').getByRole('button', { name: 'Look now' }).click()
const logRow = page.getByRole('dialog').getByRole('button', { name: /Would approve/ })
await logRow.first().waitFor({ timeout: 15_000 })
await page.waitForTimeout(300)
await page.screenshot({ path: join(shots, '12e-auto-approve-history-dry.png') })
await logRow.first().click()
await page.getByRole('button', { name: 'Share' }).waitFor({ timeout: 15_000 })
await page.getByRole('heading', { name: 'What it approved' }).waitFor({ state: 'detached', timeout: 3000 })
await page.waitForTimeout(300)
await page.screenshot({ path: join(shots, '12f-review-from-history.png') })
await page.keyboard.press('Escape')
await page.getByRole('heading', { name: 'Auto-approve' }).waitFor()
await page.locator('[aria-label="Mode"]').getByText('Off', { exact: true }).click()

await page.getByRole('button', { name: 'Cleanup' }).click()
await page.getByRole('heading', { name: 'Cleanup' }).waitFor()
await page.getByText('old-merged').waitFor({ timeout: 20_000 })
await page.waitForTimeout(500)
await page.screenshot({ path: join(shots, '15-cleanup.png') })

await page.getByRole('button', { name: 'All worktrees' }).click()
await page.getByRole('heading', { name: 'All worktrees' }).waitFor()
await page.waitForTimeout(800)
await page.screenshot({ path: join(shots, '16-all-worktrees.png') })
await page.getByRole('button', { name: 'Settings' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: join(shots, '11-settings.png') })
await page.getByRole('tab', { name: 'Appearance' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: join(shots, '11b-settings-appearance.png') })
// The window frame follows the mode picked here.
const frameMode = () => electronApp.evaluate(({ nativeTheme }) => nativeTheme.themeSource)
const startMode = await frameMode()
for (const mode of ['light', 'dark']) {
  await page.locator(`#settings-theme-${mode}`).click()
  await page.waitForTimeout(200)
  if ((await frameMode()) !== mode) throw new Error(`The window frame did not turn ${mode}: ${await frameMode()}`)
}
await page.locator(`#settings-theme-${startMode}`).click()
await page.getByRole('tab', { name: 'Merging' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: join(shots, '11c-settings-merging.png') })
await page.getByRole('button', { name: 'Sort projects' }).click()
await page.getByRole('menuitemradio', { name: /Recently opened/ }).waitFor()
await page.waitForTimeout(300)
await page.screenshot({ path: join(shots, '11d-sort-projects.png') })
await page.keyboard.press('Escape')

// Folders of the same repository sit together under it; any row can be dragged into a new place.
await page.evaluate(async (root) => {
  await window.prSift.invoke('projects:add', [`${root}/shop-copy`, `${root}/docs`])
}, projects)
await page.getByTitle('acme/shop').waitFor()
const sortIds = () => page.locator('[data-sort-id]').evaluateAll((rows) => rows.map((r) => r.dataset.sortId))
if ((await sortIds())[0] !== 'acme/docs') throw new Error(`Expected docs first by name, got ${await sortIds()}`)
const from = await page.getByRole('button', { name: 'docs', exact: true }).boundingBox()
const to = await page.getByTitle('acme/shop').boundingBox()
await page.mouse.move(from.x + 40, from.y + from.height / 2)
await page.mouse.down()
for (let i = 1; i <= 12; i++) await page.mouse.move(from.x + 40, from.y + from.height / 2 + ((to.y + to.height - from.y) * i) / 12)
await page.mouse.move(from.x + 40, to.y + to.height + 30)
await page.waitForTimeout(250)
await page.screenshot({ path: join(shots, '18-dragging-project.png') })
await page.mouse.up()
if ((await sortIds())[0] !== 'acme/shop') throw new Error(`Dragging docs below shop did not stick: ${await sortIds()}`)
await page.getByRole('button', { name: 'Sort projects' }).click()
await page
  .getByRole('menuitemradio', { name: /Custom/ })
  .and(page.locator('[data-state=checked]'))
  .waitFor()
await page.keyboard.press('Escape')
// The sidebar is as wide as you drag it.
const edge = await page.getByRole('separator', { name: 'Resize the sidebar' }).boundingBox()
await page.mouse.move(edge.x + edge.width / 2, edge.y + 200)
await page.mouse.down()
await page.mouse.move(edge.x + 90, edge.y + 200, { steps: 6 })
await page.mouse.up()
const navWidth = await page.locator('nav[aria-label="Sections"]').evaluate((n) => n.getBoundingClientRect().width)
if (navWidth < 300) throw new Error(`The sidebar did not widen: ${navWidth}`)
await page.waitForTimeout(250)
await page.screenshot({ path: join(shots, '19-grouped-wide-sidebar.png') })
// Grips stay hidden until the pointer is on that row.
const gripOpacity = (name) =>
  page
    .getByRole('button', { name, exact: true })
    .locator('svg.cursor-grab')
    .evaluate((g) => getComputedStyle(g).opacity)
await page.getByRole('button', { name: 'docs', exact: true }).hover()
await page.waitForTimeout(300)
if ((await gripOpacity('docs')) !== '1') throw new Error('The grip does not show on the hovered row')
if (
  (await page
    .getByTitle('acme/shop')
    .locator('svg.cursor-grab')
    .evaluate((g) => getComputedStyle(g).opacity)) !== '0'
)
  throw new Error('A grip shows on a row the pointer is not on')
await page.screenshot({ path: join(shots, '19b-grip-on-hover.png') })
// A short project list never scrolls, sideways or down.
const listOverflow = await page
  .locator('[data-sort-id]')
  .first()
  .evaluate((row) => {
    const list = row.closest('.overflow-y-auto')
    return { x: list.scrollWidth - list.clientWidth, y: list.scrollHeight - list.clientHeight }
  })
if (listOverflow.x > 0 || listOverflow.y > 0) throw new Error(`The project list scrolls: ${JSON.stringify(listOverflow)}`)
// A long list scrolls down with a slim scrollbar that shows only under the pointer, and never sideways.
await page.evaluate(async (root) => {
  await window.prSift.invoke(
    'projects:add',
    Array.from({ length: 8 }, (_, i) => `${root}/r${i}`),
  )
}, projects)
await page.getByRole('button', { name: 'r7', exact: true }).waitFor()
await page.getByRole('button', { name: 'r3', exact: true }).hover()
await page.waitForTimeout(300)
const longList = await page
  .locator('[data-sort-id]')
  .first()
  .evaluate((row) => {
    const list = row.closest('.overflow-y-auto')
    return { x: list.scrollWidth - list.clientWidth }
  })
if (longList.x > 0) throw new Error(`The project list scrolls sideways: ${longList.x}px`)
await page.screenshot({ path: join(shots, '19c-many-projects.png') })
await page.mouse.move(700, 400)
await page.mouse.move(600, 400)
await page.getByRole('separator', { name: 'Resize the sidebar' }).dblclick()
await page.getByRole('button', { name: 'Hide the sidebar' }).click()
await page.getByRole('button', { name: 'Needs you' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: join(shots, '17-sidebar-collapsed.png') })
await page.getByRole('button', { name: 'Show the sidebar' }).click()

// A busy rule, to check the list stays easy to read.
await page.evaluate(async () => {
  const { config } = await window.prSift.invoke('autoapprove:status')
  const rule = {
    ...config.rules[0],
    name: 'vue-port-rule',
    repos: ['acme/shop'],
    baseBranches: ['main', 'master'],
    labels: ['bug', 'ui-style', 'vue-port'],
    authors: ['teammate', 'octo-test', 'sam', 'lee', 'kim', 'ana', 'omar'],
    paths: [],
    blockedPaths: ['**/composer.json'],
    requireChecks: false,
  }
  await window.prSift.invoke('autoapprove:save', { ...config, rules: [rule, ...config.rules] })
})
await page.getByRole('button', { name: 'Needs you' }).click()
await page.getByRole('button', { name: 'Auto-approve' }).click()
await page.getByText('vue-port-rule').waitFor()
await page.waitForTimeout(600)
await page.screenshot({ path: join(shots, '12e-auto-approve-list-busy.png') })

await electronApp.close()
if (errors.length) {
  console.error('Console errors:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('Smoke run passed')
