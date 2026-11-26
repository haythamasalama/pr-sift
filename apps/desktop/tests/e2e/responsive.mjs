// Opens every screen at the narrowest, a medium and a wide window, in the default and the Mono theme, with
// long, busy data, and fails when text runs into other text or a page scrolls sideways.
// Usage: node tests/e2e/responsive.mjs <projects folder> <screenshots folder>
// The projects folder is the one tests/e2e/smoke.mjs uses.
import { _electron as electron } from 'playwright'
import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [projects, shots = tmpdir()] = process.argv.slice(2)
mkdirSync(shots, { recursive: true })
const app = fileURLToPath(new URL('../../out/main/index.js', import.meta.url))
const config = mkdtempSync(join(tmpdir(), 'pr-sift-responsive-'))
const electronApp = await electron.launch({
  args: [app, '--no-sandbox', '--disable-gpu'],
  env: { ...process.env, XDG_CONFIG_HOME: config, APPDATA: config },
})

await electronApp.evaluate(() => {
  const json = (body, headers = {}) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', ...headers } })
  const LABELS = [
    { name: 'feature', color: '0e8a16' },
    { name: 'security', color: 'd93f0b' },
    { name: 'vue-port', color: '1d76db' },
    { name: 'ui-style', color: 'e99695' },
    { name: 'migration', color: 'fbca04' },
  ]
  const TITLES = [
    'feat(admin): set table and column widths for the monthly sales report',
    'fix(orders): keep the order history list in order after a refresh',
    'perf(inventory): load the warehouse stock lines in one query',
    'chore(deps): bump laravel/framework from 13.30.0 to 13.40.0',
    'Add a shopping cart',
    'feat(seo): add link previews for every public page and the blog',
  ]
  const STATES = [
    ['REVIEW_REQUIRED', 'FAILURE', 'MERGEABLE', false],
    ['APPROVED', 'FAILURE', 'MERGEABLE', false],
    ['REVIEW_REQUIRED', 'SUCCESS', 'CONFLICTING', false],
    ['CHANGES_REQUESTED', 'PENDING', 'MERGEABLE', false],
    ['REVIEW_REQUIRED', 'SUCCESS', 'MERGEABLE', true],
    ['APPROVED', 'SUCCESS', 'MERGEABLE', false],
  ]
  const make = (i, author) => {
    const [decision, checks, mergeable, draft] = STATES[i % STATES.length]
    return {
      number: 11400 + i,
      title: TITLES[i % TITLES.length],
      url: `https://github.com/acme/shop/pull/${11400 + i}`,
      isDraft: draft,
      updatedAt: new Date(Date.now() - (i + 1) * 3_600_000).toISOString(),
      reviewDecision: decision,
      headRefName: `feature/task-${i}-inventory-warehouse-stock-lines`,
      baseRefName: 'main',
      headRefOid: `sha${i}`,
      additions: 12345 + i,
      deletions: 3423 + i,
      mergeable,
      mergeStateStatus: decision === 'APPROVED' ? 'CLEAN' : 'BLOCKED',
      viewerCanMergeAsAdmin: false,
      repository: { name: 'shop', viewerPermission: 'WRITE', owner: { login: 'acme' } },
      author: { login: author ?? ['alexrivera', 'jordanmatsu', 'samokafor', 'christopherdelacroix'][i % 4], avatarUrl: null },
      labels: { nodes: LABELS.slice(0, (i % 4) + 1) },
      comments: { totalCount: i * 3 },
      reviewRequests: { nodes: [{ requestedReviewer: { login: 'octo-test' } }] },
      latestReviews: { nodes: [] },
      commits: { nodes: [{ commit: { statusCheckRollup: { state: checks } } }] },
    }
  }
  const review = Array.from({ length: 6 }, (_, i) => make(i))
  const mine = Array.from({ length: 6 }, (_, i) => make(i + 20, 'octo-test'))
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
            search: { nodes: review.map((p) => ({ ...p, changedFiles: 1, files: { nodes: [{ path: 'docs/a.md' }] } })) },
          },
        })
      if (query.includes('mentionableUsers'))
        return json({
          data: {
            repository: {
              defaultBranchRef: { name: 'main' },
              labels: { nodes: LABELS },
              mentionableUsers: { nodes: [{ login: 'alexrivera', name: 'Alex Rivera', avatarUrl: null }] },
              object: { entries: [{ name: 'src', type: 'tree' }] },
            },
          },
        })
      if (query.includes('review:')) return json({ data: { review: { nodes: review }, mine: { nodes: mine }, assigned: { nodes: [] } } })
      return json({
        data: {
          repository: {
            defaultBranchRef: { name: 'main' },
            description: 'The skeleton application for the Laravel framework, with a long description that goes on.',
            homepageUrl: 'https://shop.example.com',
            stargazerCount: 1234,
            isPrivate: true,
            pullRequests: { nodes: [...review, ...mine] },
          },
        },
      })
    }
    if (/^\/repos\/acme\/shop\/pulls\/\d+$/.test(url.pathname))
      return json({
        number: 11400,
        title: TITLES[0],
        html_url: 'https://github.com/acme/shop/pull/11400',
        changed_files: 1,
        head: { sha: 'sha0', ref: 'feature/task-0-inventory-warehouse-stock-lines' },
        base: { ref: 'main' },
        user: { login: 'alexrivera' },
        state: 'open',
        body_html: '<p>Long change.</p>',
      })
    if (/^\/repos\/acme\/shop\/pulls\/\d+\/files$/.test(url.pathname))
      return json([
        {
          filename: 'app/Http/Controllers/Admin/Inventory/InventoryWarehouseStockLinesController.php',
          status: 'modified',
          additions: 2,
          deletions: 1,
          patch: '@@ -1,2 +1,3 @@\n-old\n+new\n+more',
          sha: '1',
        },
      ])
    return json([])
  }
})

const page = await electronApp.firstWindow()
await page.emulateMedia({ colorScheme: 'dark' })
await page.setViewportSize({ width: 1180, height: 780 })
await page.getByLabel('Personal access token').fill('ghp_example_token_for_responsive_test')
await page.getByRole('button', { name: 'Sign in', exact: true }).click()
await page.getByRole('heading', { name: 'Needs you' }).waitFor()
await page.evaluate(async (root) => window.prSift.invoke('settings:set', { roots: [root] }), projects)
// The pages read the folders once, so load them again.
await page.reload()
await page.getByRole('heading', { name: 'Needs you' }).waitFor()
await page.getByRole('button', { name: 'Add projects' }).click()
await page.getByRole('dialog').getByText('shop', { exact: true }).first().click()
await page
  .getByRole('dialog')
  .getByRole('button', { name: /^Add 1 project/ })
  .click()
await page.getByRole('heading', { name: 'shop' }).waitFor()
// A rule with many values, for the Auto-approve list.
await page.evaluate(async () => {
  const { config } = await window.prSift.invoke('autoapprove:status')
  const rule = {
    ...(config.rules[0] ?? {}),
    id: 'busy',
    enabled: true,
    name: 'vue-port-rule',
    repos: ['acme/shop'],
    baseBranches: ['main', 'master'],
    labels: ['bug', 'ui-style', 'vue-port'],
    authors: ['alexrivera', 'jordanmatsu', 'samokafor', 'christopherdelacroix', 'ana', 'lee'],
    paths: [],
    blockedPaths: ['**/composer.json'],
    requireChecks: false,
  }
  await window.prSift.invoke('autoapprove:save', { ...config, rules: [rule] })
})

const tab = (name) => page.getByRole('tab', { name: new RegExp(`^${name}`) })
const nav = (name) => page.getByRole('button', { name, exact: true }).first()
const SCREENS = [
  ['needs-you', async () => (await nav('Needs you').click(), page.getByText(TITLE).first().waitFor())],
  ['auto-approve', async () => (await nav('Auto-approve').click(), page.getByText('vue-port-rule').waitFor())],
  ['project-pulls', async () => (await nav('shop').click(), await tab('Pull requests').click(), page.getByText(TITLE).first().waitFor())],
  ['project-branches', async () => (await nav('shop').click(), await tab('Branches').click(), page.getByText('old-merged').waitFor())],
  [
    'project-worktrees',
    async () => (await nav('shop').click(), await tab('Worktrees').click(), page.getByText('feature/cart').first().waitFor()),
  ],
  ['project-hidden', async () => (await nav('shop').click(), await tab('Hidden files').click(), page.waitForTimeout(1500))],
  ['all-worktrees', async () => (await nav('All worktrees').click(), page.getByRole('heading', { name: 'All worktrees' }).waitFor())],
  ['cleanup', async () => (await nav('Cleanup').click(), page.getByRole('heading', { name: 'Cleanup' }).waitFor())],
  ['settings', async () => (await nav('Settings').click(), page.getByRole('tab', { name: 'Appearance' }).waitFor())],
  [
    'review',
    async () => (
      await nav('Needs you').click(),
      await page.getByText(TITLE).first().click(),
      page.locator('text=/InventoryWarehouse/ >> visible=true').first().waitFor()
    ),
  ],
]
const TITLE = 'feat(admin): set table and column widths'

// Text or icons that sit on top of each other, and boxes that scroll sideways.
const problems = () =>
  page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) return null
      const s = getComputedStyle(el)
      if (s.visibility === 'hidden' || s.opacity === '0') return null
      // Clip to every ancestor that hides overflow.
      let box = { l: r.left, t: r.top, r: r.right, b: r.bottom }
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ps = getComputedStyle(p)
        if (ps.overflowX !== 'visible' || ps.overflowY !== 'visible') {
          const pr = p.getBoundingClientRect()
          box = { l: Math.max(box.l, pr.left), t: Math.max(box.t, pr.top), r: Math.min(box.r, pr.right), b: Math.min(box.b, pr.bottom) }
        }
      }
      if (box.r - box.l <= 1 || box.b - box.t <= 1) return null
      // Only what is on top counts: a page drawn over the app hides what is under it.
      const top = document.elementFromPoint((box.l + box.r) / 2, (box.t + box.b) / 2)
      return top && (top === el || el.contains(top) || top.contains(el)) ? box : null
    }
    const leaves = [...document.querySelectorAll('main *, [data-slot="sidebar"] *, body > div *')].filter((el) => {
      if (el.closest('[role="dialog"],[role="menu"],[data-slot="tooltip-content"],pre,code,.diff, [data-diff]')) return false
      if (getComputedStyle(el).position === 'absolute' || getComputedStyle(el).position === 'fixed') return false
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      return ownText || el.tagName === 'svg' || el.tagName === 'IMG'
    })
    const boxes = leaves.map((el) => ({ el, box: visible(el) })).filter((x) => x.box)
    const found = []
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]
        const b = boxes[j]
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue
        const w = Math.min(a.box.r, b.box.r) - Math.max(a.box.l, b.box.l)
        const h = Math.min(a.box.b, b.box.b) - Math.max(a.box.t, b.box.t)
        if (w > 2 && h > 2)
          found.push(
            `overlap: "${(a.el.textContent || a.el.tagName).trim().slice(0, 30)}" × "${(b.el.textContent || b.el.tagName).trim().slice(0, 30)}"`,
          )
      }
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el)
      if (
        (s.overflowX === 'auto' || s.overflowX === 'scroll') &&
        el.scrollWidth > el.clientWidth + 1 &&
        !el.closest('pre,code,.diff,[data-diff]')
      )
        found.push(`scrolls sideways by ${el.scrollWidth - el.clientWidth}px: ${el.className.toString().slice(0, 60)}`)
    }
    if (document.documentElement.scrollWidth > window.innerWidth + 1) found.push('the window scrolls sideways')
    return [...new Set(found)].slice(0, 12)
  })

const report = []
for (const style of ['github', 'mono']) {
  await nav('Settings').click()
  await page.getByRole('tab', { name: 'Appearance' }).click()
  await page.locator(`#settings-style-${style}`).click()
  await page.keyboard.press('Escape')
  for (const width of [760, 960, 1180, 1600]) {
    await page.setViewportSize({ width, height: 800 })
    for (const [name, open] of SCREENS) {
      await open()
      await page.waitForTimeout(400)
      const file = `${style}-${width}-${name}.png`
      await page.screenshot({ path: join(shots, file) })
      const found = await problems()
      if (found.length) report.push(`${file}\n  ${found.join('\n  ')}`)
      if (name === 'review' || name === 'settings') await page.keyboard.press('Escape')
    }
  }
}
await electronApp.close()
if (report.length) {
  console.log(report.join('\n'))
  process.exit(1)
}
console.log('Responsive run passed')
