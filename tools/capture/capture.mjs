import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ffmpeg from 'ffmpeg-static'
import { chromium } from 'playwright'
import { DIFF, PR, TITLE } from './demo-pr.mjs'

const root = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url))
const CONTENT = root('apps/extension/dist/content.js')
const OUT = root('media')
const VIEWPORT = { width: 1440, height: 900 }
const PR_URL = `https://github.com/${PR.owner}/${PR.repo}/pull/${PR.number}/files`
const KEY = `${PR.owner}/${PR.repo}#${PR.number}`
const only = process.argv.slice(2)

for (const dir of ['screenshots', 'videos', 'raw']) mkdirSync(`${OUT}/${dir}`, { recursive: true })

const NOTES = [
  {
    id: 'n1',
    file: 'src/Domain/Billing/Actions/GenerateInvoice.php',
    side: 'new',
    startLine: 20,
    line: 22,
    lineText: '->merge($this->usage->linesFor($account, $period));',
    quote: '',
    text: 'Usage lines are merged after subscriptions. Check that plan discounts still apply to both.',
    createdAt: 1,
  },
  {
    id: 'n2',
    file: 'src/Presentation/Business/Controllers/InvoiceController.php',
    side: 'new',
    line: 23,
    lineText: "if (! auth()->user()->can('billing.invoices.index')) {",
    quote: "auth()->user()->can('billing.invoices.index')",
    text: 'Use the InvoicePolicy here, like OrderController does, instead of an inline permission check.',
    createdAt: 2,
  },
  {
    id: 'n3',
    file: 'src/Domain/Billing/Usage/UsageRepository.php',
    side: 'new',
    line: 18,
    lineText: "->selectRaw('metric, sum(quantity) as quantity')",
    quote: '',
    text: 'This runs for every account at month end. Is (account_id, occurred_at) indexed?',
    createdAt: 3,
  },
]

const githubPage = (
  title,
) => `<!doctype html><html><head><meta charset="utf-8"><title>${title} by octo · Pull Request #${PR.number} · ${PR.owner}/${PR.repo}</title>
<style>
  body { margin: 0; font: 14px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2328; background: #fff; }
  .top { height: 64px; background: #f6f8fa; border-bottom: 1px solid #d1d9e0; display: flex; align-items: center; padding: 0 32px; gap: 12px; color: #59636e; }
  .top b { color: #1f2328; }
  main { max-width: 1200px; margin: 24px auto; padding: 0 32px; }
  h1 { font-size: 26px; font-weight: 400; margin: 0 0 8px; }
  .state { display: inline-block; background: #1f883d; color: #fff; border-radius: 999px; padding: 4px 12px; font-size: 13px; margin-right: 8px; }
  .tabs { display: flex; gap: 24px; border-bottom: 1px solid #d1d9e0; margin: 24px 0; padding-bottom: 8px; color: #59636e; }
  .tabs .on { color: #1f2328; font-weight: 600; border-bottom: 2px solid #fd8c73; padding-bottom: 8px; margin-bottom: -9px; }
  .file { border: 1px solid #d1d9e0; border-radius: 6px; margin-bottom: 16px; }
  .file header { background: #f6f8fa; padding: 8px 16px; border-bottom: 1px solid #d1d9e0; font-family: ui-monospace, monospace; font-size: 12px; }
  .file div { height: 120px; background: repeating-linear-gradient(#fff 0 20px, #f6f8fa 20px 21px); }
</style></head><body>
<div class="top"><b>${PR.owner} / ${PR.repo}</b> · Pull requests</div>
<main>
  <h1 class="js-issue-title">${title}</h1>
  <div><span class="state">Open</span> octo wants to merge 12 commits into <code>main</code></div>
  <div class="tabs"><span>Conversation</span><span>Commits 12</span><span>Checks</span><span class="on">Files changed 41</span></div>
  ${Array.from({ length: 6 }, (_, i) => `<section class="file"><header>src/Domain/Billing/File${i + 1}.php</header><div></div></section>`).join('')}
</main></body></html>`

function chromeMock({ store }) {
  const listeners = new Set()
  const local = {
    get: async (key) => (typeof key === 'string' ? (key in store ? { [key]: store[key] } : {}) : { ...store }),
    set: async (values) => {
      const changes = {}
      for (const [k, v] of Object.entries(values)) {
        changes[k] = { oldValue: store[k], newValue: v }
        store[k] = v
      }
      for (const l of listeners) l(changes, 'local')
    },
    remove: async (key) => {
      delete store[key]
    },
  }
  window.chrome = {
    runtime: {
      id: 'pr-sift-demo',
      getManifest: () => ({ version: '0.1.0' }),
      sendMessage: (_m, cb) => cb && cb({ ok: false, status: 0 }),
    },
    storage: { local, onChanged: { addListener: (l) => listeners.add(l), removeListener: (l) => listeners.delete(l) } },
  }
  navigator.clipboard.writeText = async () => undefined
  window.open = () => null
}

function cursorScript() {
  const add = () => {
    const dot = document.createElement('div')
    dot.id = 'demo-cursor'
    Object.assign(dot.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: '22px',
      height: '22px',
      marginLeft: '-4px',
      marginTop: '-2px',
      zIndex: '2147483647',
      pointerEvents: 'none',
      transition: 'transform 0.12s ease',
      background:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.4-6.7L4 20z' fill='black' stroke='white' stroke-width='1.6' stroke-linejoin='round'/></svg>\") no-repeat",
    })
    document.documentElement.appendChild(dot)
    addEventListener('mousemove', (e) => (dot.style.left = e.clientX + 'px') && (dot.style.top = e.clientY + 'px'), true)
    addEventListener('mousedown', () => (dot.style.transform = 'scale(0.85)'), true)
    addEventListener('mouseup', () => (dot.style.transform = ''), true)
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', add)
  else add()
}

async function openDemo(browser, { theme = 'light', notes = true, video = null } = {}) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: video ? 1 : 2,
    colorScheme: theme,
    ...(video ? { recordVideo: { dir: `${OUT}/raw`, size: VIEWPORT } } : {}),
  })
  const store = { settings: { theme, assistant: 'claude' }, ...(notes ? { [`notes:${KEY}`]: NOTES } : {}) }
  await context.addInitScript(chromeMock, { store })
  if (video) await context.addInitScript(cursorScript)
  await context.route('https://github.com/**', (route) => {
    const url = route.request().url()
    if (url.endsWith('.diff')) return route.fulfill({ status: 200, contentType: 'text/plain', body: DIFF })
    return route.fulfill({ status: 200, contentType: 'text/html', body: githubPage(TITLE) })
  })
  const page = await context.newPage()
  await page.goto(PR_URL)
  await page.addScriptTag({ path: CONTENT })
  await page.waitForTimeout(300)
  return { context, page }
}

const launcher = (page) => page.getByRole('button', { name: /PR Sift/ })
const card = (page, file) => page.locator(`section[data-file="${file}"]`)
const row = (page, file, newLine) =>
  card(page, file)
    .locator('tr[data-i]')
    .filter({ has: page.locator('td:nth-child(3)', { hasText: new RegExp(`^${newLine}$`) }) })

const folderViewed = (page, name) =>
  page
    .locator('div.group')
    .filter({ has: page.locator('span.truncate', { hasText: new RegExp(`^${name}$`) }) })
    .first()
    .locator('[title="Mark the whole folder as viewed"]')

async function openReview(page) {
  await launcher(page).click()
  await page.getByText('src/Domain/Billing/Actions/GenerateInvoice.php').first().waitFor()
  await page.waitForTimeout(700)
}

async function glide(page, locator, { click = true, steps = 18 } = {}) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('No box for ' + locator)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps })
  if (click) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function framed(browser, rawPath, name, { theme = 'light' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1060 }, deviceScaleFactor: 2 })
  const img = readFileSync(rawPath).toString('base64')
  const dark = theme === 'dark'
  await page.setContent(`<!doctype html><html><body style="margin:0">
  <div id="shot" style="width:1600px;height:1060px;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 20% 15%, ${dark ? '#1e3a5f' : '#7ee0b0'} 0%, transparent 55%),
               radial-gradient(circle at 85% 90%, ${dark ? '#3b1f5f' : '#3fb67f'} 0%, transparent 55%),
               linear-gradient(135deg, ${dark ? '#0b1220, #111827' : '#1f9d6a, #2bb383'});">
    <div style="width:1440px;border-radius:14px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.08);background:${dark ? '#0d1117' : '#fff'}">
      <div style="height:38px;display:flex;align-items:center;gap:8px;padding:0 14px;background:${dark ? '#161b22' : '#f3f4f6'};border-bottom:1px solid ${dark ? '#30363d' : '#e5e7eb'};font:12px -apple-system,sans-serif;color:${dark ? '#9198a1' : '#6b7280'}">
        <span style="width:12px;height:12px;border-radius:50%;background:#ff5f57"></span>
        <span style="width:12px;height:12px;border-radius:50%;background:#febc2e"></span>
        <span style="width:12px;height:12px;border-radius:50%;background:#28c840"></span>
        <span style="margin:0 auto;padding:4px 14px;border-radius:6px;background:${dark ? '#0d1117' : '#fff'}">github.com/${PR.owner}/${PR.repo}/pull/${PR.number}/files</span>
      </div>
      <img src="data:image/png;base64,${img}" style="display:block;width:1440px">
    </div>
  </div></body></html>`)
  await page.locator('#shot').screenshot({ path: `${OUT}/raw/${name}.framed.png` })
  await page.close()
  execFileSync(ffmpeg, [
    '-y',
    '-loglevel',
    'error',
    '-i',
    `${OUT}/raw/${name}.framed.png`,
    '-quality',
    '88',
    `${OUT}/screenshots/${name}.webp`,
  ])
  console.log('screenshot', name)
}

async function shot(browser, name, prepare, options = {}) {
  if (only.length && !only.includes(name)) return
  const { context, page } = await openDemo(browser, options)
  await prepare(page)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/raw/${name}.png` })
  await context.close()
  await framed(browser, `${OUT}/raw/${name}.png`, name, options)
}

async function clip(browser, name, play, options = {}) {
  if (only.length && !only.includes(name)) return
  const { context, page } = await openDemo(browser, { ...options, video: true })
  await page.mouse.move(1100, 700)
  await play(page)
  await page.waitForTimeout(800)
  const video = page.video()
  await context.close()
  const raw = `${OUT}/raw/${name}.webm`
  renameSync(await video.path(), raw)
  execFileSync(ffmpeg, [
    '-y',
    '-loglevel',
    'error',
    '-i',
    raw,
    '-vf',
    'scale=1440:-2',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '24',
    '-movflags',
    '+faststart',
    `${OUT}/videos/${name}.mp4`,
  ])
  execFileSync(ffmpeg, [
    '-y',
    '-loglevel',
    'error',
    '-i',
    raw,
    '-vf',
    'fps=10,scale=860:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
    `${OUT}/videos/${name}.gif`,
  ])
  console.log('video', name)
}

const browser = await chromium.launch()

await shot(browser, 'launcher', async (page) => {
  await launcher(page).hover()
})

await shot(browser, 'review', async (page) => {
  await openReview(page)
  await page.getByRole('button', { name: 'Collapse folder tree' }).first().waitFor()
  await folderViewed(page, 'lang').click()
})

await shot(browser, 'filters', async (page) => {
  await openReview(page)
  await page.getByRole('button', { name: /^\.php/ }).click()
  await page.getByRole('button', { name: /^added \d/ }).click()
})

await shot(browser, 'smart-filters', async (page) => {
  await openReview(page)
  await page.getByRole('tab', { name: /Smart filters/ }).click()
})

await shot(browser, 'notes', async (page) => {
  await openReview(page)
  const file = 'src/Domain/Billing/Usage/UsageMeter.php'
  await card(page, file).scrollIntoViewIfNeeded()
  await row(page, file, 16).hover()
  const plus = row(page, file, 16).getByRole('button', { name: 'Add a private note' })
  const from = await plus.boundingBox()
  await page.mouse.move(from.x + 6, from.y + 6)
  await page.mouse.down()
  const to = await row(page, file, 21).boundingBox()
  await page.mouse.move(to.x + 40, to.y + to.height / 2, { steps: 8 })
  await page.mouse.up()
  await page.locator('textarea').fill('Filter zero quantities in SQL instead of in PHP, the totals table can be large.')
})

await shot(browser, 'ai-export', async (page) => {
  await openReview(page)
  await page.getByRole('button', { name: /Notes/ }).click()
  await page.getByRole('button', { name: 'Choose the assistant' }).click()
})

await shot(browser, 'split', async (page) => {
  await openReview(page)
  await page.getByLabel('Split', { exact: true }).click()
})

await shot(browser, 'copy-menu', async (page) => {
  await openReview(page)
  await card(page, 'src/Domain/Billing/Actions/GenerateInvoice.php').getByRole('button', { name: 'Copy' }).click()
})

await shot(
  browser,
  'dark',
  async (page) => {
    await openReview(page)
  },
  { theme: 'dark' },
)

await clip(browser, 'filters-demo', async (page) => {
  await glide(page, launcher(page))
  await page.getByText('src/Domain/Billing/Actions/GenerateInvoice.php').first().waitFor()
  await page.waitForTimeout(900)
  await glide(page, page.getByRole('button', { name: /^\.php/ }))
  await page.waitForTimeout(900)
  await glide(page, page.getByRole('button', { name: /^added \d/ }))
  await page.waitForTimeout(900)
  await glide(page, page.getByRole('button', { name: /^added \d/ }))
  await glide(page, page.getByRole('button', { name: /^\.php/ }))
  await page.waitForTimeout(500)
  await glide(page, page.getByRole('tab', { name: /Smart filters/ }))
  await page.waitForTimeout(1200)
  await glide(page, page.getByRole('tab', { name: /Tree/ }))
  await glide(page, page.getByRole('textbox', { name: 'Search files' }))
  await page.keyboard.type('Usage', { delay: 110 })
  await page.waitForTimeout(1500)
})

await clip(browser, 'notes-demo', async (page) => {
  await glide(page, launcher(page))
  await page.getByText('src/Domain/Billing/Actions/GenerateInvoice.php').first().waitFor()
  const file = 'src/Domain/Billing/Usage/UsageMeter.php'
  await card(page, file).scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  await glide(page, row(page, file, 16), { click: false })
  const plus = row(page, file, 16).getByRole('button', { name: 'Add a private note' })
  const from = await plus.boundingBox()
  await page.mouse.move(from.x + 6, from.y + 6, { steps: 10 })
  await page.mouse.down()
  const to = await row(page, file, 21).boundingBox()
  await page.mouse.move(to.x + 40, to.y + to.height / 2, { steps: 24 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  await page.keyboard.type('Filter zero quantities in SQL instead of in PHP.', { delay: 45 })
  await glide(page, page.getByRole('button', { name: 'Save note' }))
  await page.waitForTimeout(700)
  await glide(page, page.getByRole('button', { name: /Notes/ }))
  await page.waitForTimeout(900)
  await glide(page, page.getByRole('button', { name: 'Choose the assistant' }))
  await page.waitForTimeout(500)
  await glide(page, page.getByRole('menuitemradio', { name: 'ChatGPT' }))
  await page.waitForTimeout(400)
  await glide(page, page.getByRole('button', { name: /Copy for ChatGPT/ }))
  await page.waitForTimeout(1500)
})

await clip(browser, 'review-demo', async (page) => {
  await glide(page, launcher(page))
  await page.getByText('src/Domain/Billing/Actions/GenerateInvoice.php').first().waitFor()
  await page.waitForTimeout(800)
  for (let i = 0; i < 3; i++) {
    await glide(page, page.getByLabel('Viewed').first())
    await page.waitForTimeout(700)
  }
  await glide(page, folderViewed(page, 'lang'))
  await page.waitForTimeout(1000)
  await glide(page, page.getByRole('button', { name: 'Collapse folder tree' }).first(), { click: false })
  await page.getByRole('button', { name: 'Collapse folder tree' }).first().click()
  await page.waitForTimeout(800)
  await glide(page, page.getByRole('button', { name: 'Expand folder tree' }).first())
  await page.waitForTimeout(800)
  await glide(page, page.getByRole('button', { name: 'Show this file as split' }).first())
  await page.waitForTimeout(1500)
})

async function socialImage() {
  if (only.length && !only.includes('og')) return
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 })
  const shotData = readFileSync(`${OUT}/raw/review.framed.png`).toString('base64')
  const logo = readFileSync(root('apps/extension/icons/logo.svg')).toString('base64')
  await page.setContent(`<!doctype html><html><body style="margin:0">
  <div id="og" style="width:1200px;height:630px;display:flex;overflow:hidden;font-family:-apple-system,'Segoe UI',sans-serif;
    background:linear-gradient(135deg,#1f9d6a,#2bb383);color:#fff">
    <div style="width:470px;padding:64px 0 64px 64px;display:flex;flex-direction:column;justify-content:center;gap:20px">
      <img src="data:image/svg+xml;base64,${logo}" style="width:64px;height:64px;border-radius:14px">
      <div style="font-size:56px;font-weight:700;letter-spacing:-1px">PR Sift</div>
      <div style="font-size:30px;line-height:1.25;font-weight:600">Review large GitHub pull requests without the noise.</div>
      <div style="font-size:19px;opacity:.9">Smart filters · viewed tracking · private notes for Claude, ChatGPT or Gemini</div>
    </div>
    <img src="data:image/png;base64,${shotData}" style="width:900px;margin:60px -200px 0 30px;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.35)">
  </div></body></html>`)
  await page.locator('#og').screenshot({ path: `${OUT}/og.png` })
  await page.close()
  console.log('social image')
}

await socialImage()
await browser.close()
for (const f of readdirSync(`${OUT}/raw`)) rmSync(`${OUT}/raw/${f}`)
rmSync(`${OUT}/raw`, { recursive: true })
