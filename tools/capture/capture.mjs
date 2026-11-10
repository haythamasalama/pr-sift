import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ffmpeg from 'ffmpeg-static'
import { chromium } from 'playwright'
import { DIFF, PR, SMALL_DIFF, TITLE } from './demo-pr.mjs'

const root = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url))
const CONTENT = root('apps/extension/dist/content.js')
const OUT = root('media')
const VIEWPORT = { width: 1440, height: 900 }
const PR_URL = `https://github.com/${PR.owner}/${PR.repo}/pull/${PR.number}/files`
const KEY = `${PR.owner}/${PR.repo}#${PR.number}`
const only = process.argv.slice(2)
const WALLPAPERS = process.env.PR_SIFT_WALLPAPERS ?? `${process.env.HOME}/Pictures/Cap Wallpapers/1 Waves`
const WALLPAPER = { light: 'Tahoe Light.jpg', dark: 'Tahoe Light.jpg' }
const FALLBACK = { light: 'linear-gradient(135deg, #f5f5f5, #d4d4d4)', dark: 'linear-gradient(135deg, #262626, #0a0a0a)' }
const backgrounds = {}

function background(theme) {
  if (backgrounds[theme]) return backgrounds[theme]
  const source = `${WALLPAPERS}/${WALLPAPER[theme]}`
  const target = `${OUT}/raw/wallpaper-${theme}.jpg`
  try {
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', source, '-vf', 'scale=2000:-1', '-q:v', '4', target])
    backgrounds[theme] = `url(data:image/jpeg;base64,${readFileSync(target).toString('base64')}) center / cover`
  } catch {
    console.warn(`No wallpaper at ${source}, using a plain gradient`)
    backgrounds[theme] = FALLBACK[theme]
  }
  return backgrounds[theme]
}

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
) => `<!doctype html><html><head><meta charset="utf-8"><title>${title} by haythamasalama · Pull Request #${PR.number} · ${PR.owner}/${PR.repo}</title>
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
  <div><span class="state">Open</span> haythamasalama wants to merge 12 commits into <code>main</code></div>
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
  let box = await locator.boundingBox()
  if (!box) throw new Error('No box for ' + locator)
  const view = page.viewportSize()
  const margin = 60
  const outside = box.x < margin || box.y < margin || box.x + box.width > view.width - margin || box.y + box.height > view.height - margin
  if (outside && (await page.evaluate(() => Boolean(document.getElementById('pr-sift-host')?.__camera)))) {
    const zoom = await page.evaluate(() => document.getElementById('pr-sift-host').__camera.zoom)
    await camera(page, locator, Math.max(zoom, 1.4))
    box = await locator.boundingBox()
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps })
  if (click) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function framed(browser, rawPath, name, { theme = 'light', url = `github.com/${PR.owner}/${PR.repo}/pull/${PR.number}/files` } = {}) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1060 }, deviceScaleFactor: 2 })
  const img = readFileSync(rawPath).toString('base64')
  const dark = theme === 'dark'
  await page.setContent(`<!doctype html><html><body style="margin:0">
  <div id="shot" style="width:1600px;height:1060px;display:flex;align-items:center;justify-content:center;
    background:${background(theme)};">
    <div style="width:1440px;border-radius:14px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.08);background:${dark ? '#0d1117' : '#fff'}">
      <div style="height:38px;display:flex;align-items:center;gap:8px;padding:0 14px;background:${dark ? '#161b22' : '#f3f4f6'};border-bottom:1px solid ${dark ? '#30363d' : '#e5e7eb'};font:12px -apple-system,sans-serif;color:${dark ? '#9198a1' : '#6b7280'}">
        <span style="width:12px;height:12px;border-radius:50%;background:#ff5f57"></span>
        <span style="width:12px;height:12px;border-radius:50%;background:#febc2e"></span>
        <span style="width:12px;height:12px;border-radius:50%;background:#28c840"></span>
        <span style="margin:0 auto;padding:4px 14px;border-radius:6px;background:${dark ? '#0d1117' : '#fff'}">${url}</span>
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

const SCALE = 2
const README_GIFS = ['filters', 'review', 'notes']

function videoCursor() {
  const add = () => {
    const dot = document.createElement('div')
    Object.assign(dot.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: '44px',
      height: '44px',
      marginLeft: '-8px',
      marginTop: '-4px',
      zIndex: '2147483647',
      pointerEvents: 'none',
      transition: 'transform 0.12s ease',
      background:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.4-6.7L4 20z' fill='black' stroke='white' stroke-width='1.6' stroke-linejoin='round'/></svg>\") no-repeat center / contain",
    })
    document.documentElement.appendChild(dot)
    addEventListener(
      'mousemove',
      (e) => {
        dot.style.left = e.clientX + 'px'
        dot.style.top = e.clientY + 'px'
      },
      true,
    )
    addEventListener(
      'mousedown',
      (e) => {
        dot.style.transform = 'scale(0.85)'
        const ring = document.createElement('div')
        Object.assign(ring.style, {
          position: 'fixed',
          left: e.clientX - 28 + 'px',
          top: e.clientY - 28 + 'px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '4px solid rgba(0,0,0,0.35)',
          zIndex: '2147483646',
          pointerEvents: 'none',
          transition: 'transform 0.45s ease, opacity 0.45s ease',
        })
        document.documentElement.appendChild(ring)
        requestAnimationFrame(() => {
          ring.style.transform = 'scale(1.8)'
          ring.style.opacity = '0'
        })
        setTimeout(() => ring.remove(), 500)
      },
      true,
    )
    addEventListener('mouseup', () => (dot.style.transform = ''), true)
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', add)
  else add()
}

async function camera(page, target, zoom = 1.7) {
  const box = target ? await target.boundingBox() : null
  await page.evaluate(
    ({ box, zoom, scale, width, height }) => {
      const host = document.getElementById('pr-sift-host')
      const current = host.__camera ?? { x: 0, y: 0, zoom: 1 }
      let next = { x: 0, y: 0, zoom: 1 }
      if (box) {
        const cx = (box.x + box.width / 2 - current.x) / (scale * current.zoom)
        const cy = (box.y + box.height / 2 - current.y) / (scale * current.zoom)
        const fullW = width * scale
        const fullH = height * scale
        const x = fullW / 2 - cx * scale * zoom
        const y = fullH / 2 - cy * scale * zoom
        next = {
          x: Math.min(0, Math.max(fullW - fullW * zoom, x)),
          y: Math.min(0, Math.max(fullH - fullH * zoom, y)),
          zoom,
        }
      }
      host.__camera = next
      host.style.transform = `translate(${next.x}px, ${next.y}px) scale(${scale * next.zoom})`
    },
    { box, zoom, scale: SCALE, width: VIEWPORT.width, height: VIEWPORT.height },
  )
  await page.waitForTimeout(950)
}

async function clip(browser, name, play, options = {}) {
  if (only.length && !only.includes(name)) return
  const big = { width: VIEWPORT.width * SCALE, height: VIEWPORT.height * SCALE }
  const theme = options.theme ?? 'light'
  const context = await browser.newContext({ viewport: big, colorScheme: theme, recordVideo: { dir: `${OUT}/raw`, size: big } })
  const started = Date.now()
  const store = {
    settings: { theme, assistant: 'claude', reviewMode: options.reviewMode ?? true },
    [`notes:${KEY}`]: options.notes ?? NOTES,
  }
  await context.addInitScript(chromeMock, { store })
  await context.addInitScript(videoCursor)
  await context.route('https://github.com/**', (route) =>
    route.request().url().endsWith('.diff')
      ? route.fulfill({ status: 200, contentType: 'text/plain', body: options.diff ?? DIFF })
      : route.fulfill({ status: 200, contentType: 'text/html', body: githubPage(TITLE) }),
  )
  const page = await context.newPage()
  await page.goto(PR_URL)
  await page.addScriptTag({ path: CONTENT })
  await page.evaluate(
    ({ scale, width, height }) => {
      Object.assign(document.getElementById('pr-sift-host').style, {
        position: 'fixed',
        left: '0px',
        top: '0px',
        width: width + 'px',
        height: height + 'px',
        transformOrigin: '0 0',
        transform: `scale(${scale})`,
        transition: 'transform 0.9s cubic-bezier(0.45, 0, 0.2, 1)',
        zIndex: '2147483000',
      })
    },
    { scale: SCALE, width: VIEWPORT.width, height: VIEWPORT.height },
  )
  await openReview(page)
  if (options.setup) await options.setup(page)
  await page.mouse.move(big.width * 0.62, big.height * 0.6)
  await page.waitForTimeout(700)
  const trim = (Date.now() - started) / 1000
  await play(page)
  const length = (Date.now() - started) / 1000 - trim
  await camera(page, null)
  await page.waitForTimeout(900)
  const video = page.video()
  await context.close()
  const raw = `${OUT}/raw/${name}.webm`
  renameSync(await video.path(), raw)
  const mp4 = `${OUT}/videos/${name}.mp4`
  const encode = (args) => execFileSync(ffmpeg, ['-y', '-loglevel', 'error', ...args])
  encode([
    '-ss',
    String(trim),
    '-i',
    raw,
    '-vf',
    'scale=1600:-2:flags=lanczos,fps=30',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '27',
    '-tune',
    'animation',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    mp4,
  ])
  if (README_GIFS.includes(name)) {
    encode([
      '-i',
      mp4,
      '-vf',
      'fps=10,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
      `${OUT}/videos/${name}.gif`,
    ])
  }
  encode(['-ss', (length * (options.poster ?? 0.5)).toFixed(2), '-i', mp4, '-frames:v', '1', '-q:v', '2', `${OUT}/videos/${name}.jpg`])
  console.log('video', name)
}

const browser = await chromium.launch()

async function launcherShot() {
  if (only.length && !only.includes('launcher')) return
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, colorScheme: 'light', bypassCSP: true })
  await context.addInitScript(chromeMock, { store: { settings: { theme: 'light' } } })
  const page = await context.newPage()
  await page.goto('https://github.com/haythamasalama/pr-sift/pull/6/files', { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(4000)
  await page.addScriptTag({ path: CONTENT })
  await launcher(page).hover()
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/raw/launcher.png` })
  await context.close()
  await framed(browser, `${OUT}/raw/launcher.png`, 'launcher', { url: 'github.com/haythamasalama/pr-sift/pull/6/files' })
}

await launcherShot()

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

const pause = (page, ms = 900) => page.waitForTimeout(ms)
const chip = (page, name) => page.getByRole('button', { name: new RegExp(`^${name.replace('.', '\\.')} \\d+$`) })
const folderRow = (page, name) =>
  page
    .locator('div.group')
    .filter({ has: page.locator('span.truncate', { hasText: new RegExp(`^${name}$`) }) })
    .first()
const filterBar = (page) => chip(page, '.php').locator('xpath=ancestor::div[2]')

async function dragNote(page, file, from, to, text) {
  await card(page, file).scrollIntoViewIfNeeded()
  await camera(
    page,
    row(page, file, Math.round((from + to) / 2))
      .locator('td')
      .nth(2),
    1.8,
  )
  await glide(page, row(page, file, from).locator('td').nth(3), { click: false })
  const plus = await row(page, file, from).getByRole('button', { name: 'Add a private note' }).boundingBox()
  await page.mouse.move(plus.x + plus.width / 2, plus.y + plus.height / 2, { steps: 10 })
  await page.mouse.down()
  const end = await row(page, file, to).locator('td').nth(3).boundingBox()
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 28 })
  await page.mouse.up()
  await pause(page, 500)
  await camera(page, page.locator('textarea'), 1.9)
  await page.keyboard.type(text, { delay: 40 })
  await pause(page, 300)
  await glide(page, page.getByRole('button', { name: 'Save note' }))
  await pause(page, 800)
}

await clip(
  browser,
  'tour',
  async (page) => {
    await pause(page, 900)
    const doc = card(page, 'docs/billing/usage.md')
    await doc.scrollIntoViewIfNeeded()
    await camera(page, doc.getByText('Viewed'), 2)
    await glide(page, doc.getByLabel('Viewed'))
    await pause(page, 700)
    await camera(page, page.getByLabel('Hide viewed'), 2)
    await glide(page, page.getByLabel('Hide viewed'))
    await pause(page, 1100)
    await camera(page, null)
    await camera(page, page.getByRole('tab', { name: /Smart filters/ }), 1.8)
    await glide(page, page.getByRole('tab', { name: /Smart filters/ }))
    await pause(page, 600)
    await glide(page, page.getByRole('button', { name: /^Tests/ }).first())
    await pause(page, 1300)
    await glide(page, page.getByRole('button', { name: /^Tests/ }).first())
    await glide(page, page.getByRole('tab', { name: /Tree/ }))
    await camera(page, chip(page, 'modified'), 2)
    await glide(page, chip(page, 'modified'))
    await pause(page, 1200)
    await dragNote(page, 'src/Domain/Billing/Actions/GenerateInvoice.php', 20, 22, 'Check that discounts still apply to usage lines.')
    await camera(page, null)
    await glide(page, page.getByRole('button', { name: /Notes/ }))
    await pause(page, 700)
    await camera(page, page.getByRole('button', { name: /Copy for Claude/ }), 1.9)
    await glide(page, page.getByRole('button', { name: /Copy for Claude/ }))
    await pause(page, 1500)
  },
  { diff: SMALL_DIFF, notes: [], reviewMode: false },
)

await clip(browser, 'filters', async (page) => {
  await camera(page, filterBar(page), 1.9)
  await glide(page, chip(page, '.php'))
  await pause(page, 1100)
  await glide(page, chip(page, 'added'))
  await pause(page, 1300)
  await glide(page, chip(page, 'added'))
  await glide(page, chip(page, '.php'))
  await pause(page, 600)
  const md = chip(page, '.md')
  await glide(page, md, { click: false })
  await page.keyboard.down('Shift')
  await md.click()
  await page.keyboard.up('Shift')
  await pause(page, 1100)
  await glide(page, page.getByRole('button', { name: /type$/ }))
  await page.keyboard.type('.test.ts', { delay: 90 })
  await page.keyboard.press('Enter')
  await pause(page, 500)
  await glide(page, chip(page, '.test.ts'))
  await pause(page, 1300)
  await glide(page, page.getByRole('button', { name: /Reset filters/ }))
  await pause(page, 600)
})

await clip(browser, 'folders', async (page) => {
  await camera(page, folderRow(page, 'src'), 1.8)
  const src = folderRow(page, 'src')
  await glide(page, src, { click: false })
  await glide(page, src.getByRole('button', { name: 'Collapse folder tree' }))
  await pause(page, 900)
  await glide(page, src.getByRole('button', { name: 'Expand folder tree' }))
  await pause(page, 900)
  const domain = folderRow(page, 'Domain')
  await glide(page, domain.getByRole('button', { name: /^(Collapse|Expand)$/ }))
  await pause(page, 800)
  await glide(page, domain.getByRole('button', { name: /^(Collapse|Expand)$/ }))
  await pause(page, 800)
  await glide(page, page.getByRole('button', { name: 'Collapse all folders' }))
  await pause(page, 900)
  await glide(page, page.getByRole('button', { name: 'Expand all folders' }))
  await pause(page, 900)
  await glide(page, page.getByRole('textbox', { name: 'Search files' }))
  await page.keyboard.type('Usage', { delay: 110 })
  await pause(page, 1500)
})

await clip(browser, 'smart-filters', async (page) => {
  await camera(page, page.getByRole('tab', { name: /Smart filters/ }), 1.7)
  await glide(page, page.getByRole('tab', { name: /Smart filters/ }))
  await pause(page, 1000)
  for (const name of [/^Tests/, /^Migrations/, /^Translations/]) {
    await glide(page, page.getByRole('button', { name }).first())
    await pause(page, 1100)
    await glide(page, page.getByRole('button', { name }).first())
  }
  await pause(page, 500)
})

await clip(browser, 'review', async (page) => {
  await camera(page, page.getByLabel('Viewed').first(), 1.9)
  await glide(page, page.getByLabel('Viewed').first())
  await pause(page, 800)
  await glide(page, page.getByLabel('Viewed').first())
  await pause(page, 800)
  await camera(page, folderRow(page, 'lang'), 1.8)
  await glide(page, folderViewed(page, 'lang'))
  await pause(page, 1000)
  await glide(page, folderViewed(page, 'database'))
  await pause(page, 900)
  await camera(page, page.getByText(/left$/).first(), 2.2)
  await pause(page, 1300)
})

await clip(browser, 'notes', async (page) => {
  await dragNote(page, 'src/Domain/Billing/Usage/UsageMeter.php', 16, 19, 'Filter zero quantities in SQL, not in PHP.')
  await pause(page, 900)
})

await clip(browser, 'resolve', async (page) => {
  const note = page.getByText('Usage lines are merged after subscriptions').first()
  await camera(page, note, 1.9)
  await glide(page, page.getByRole('button', { name: 'Mark note as resolved' }).first())
  await pause(page, 1100)
  await camera(page, null)
  await glide(page, page.getByRole('button', { name: /Notes/ }))
  await pause(page, 700)
  await camera(page, page.getByText('Show resolved in the diff'), 1.8)
  await glide(page, page.getByLabel('Show resolved in the diff'))
  await pause(page, 900)
  await page.keyboard.press('Escape')
  await camera(page, page.getByRole('button', { name: 'Reopen note' }).first(), 1.9)
  await glide(page, page.getByRole('button', { name: 'Reopen note' }).first())
  await pause(page, 1100)
})

await clip(browser, 'claude', async (page) => {
  await glide(page, page.getByRole('button', { name: /Notes/ }))
  await pause(page, 700)
  const choose = page.getByRole('button', { name: 'Choose the assistant' })
  await camera(page, choose, 1.8)
  for (const name of ['ChatGPT', 'Gemini', 'Claude']) {
    await glide(page, choose)
    await pause(page, 500)
    await glide(page, page.getByRole('menuitemradio', { name }))
    await pause(page, 400)
    await glide(page, page.getByRole('button', { name: new RegExp(`Copy for ${name}`) }))
    await pause(page, 1100)
  }
})

await clip(
  browser,
  'theme',
  async (page) => {
    const button = page.getByRole('button', { name: 'Theme' })
    await camera(page, button, 1.6)
    for (const name of ['Dark', 'Light', 'System']) {
      await glide(page, button)
      await pause(page, 450)
      await glide(page, page.getByRole('menuitemradio', { name }))
      await camera(page, null)
      await pause(page, 1200)
      if (name !== 'System') await camera(page, button, 1.6)
    }
  },
  { poster: 0.71 },
)

await clip(browser, 'views', async (page) => {
  await camera(page, page.getByLabel('Split', { exact: true }), 1.6)
  await glide(page, page.getByLabel('Split', { exact: true }))
  await camera(page, null)
  await pause(page, 1300)
  await glide(page, page.getByLabel('Unified', { exact: true }))
  await pause(page, 600)
  const perFile = page.getByRole('button', { name: 'Show this file as split' }).first()
  await camera(page, perFile, 1.8)
  await glide(page, perFile)
  await pause(page, 600)
  await camera(page, null)
  await pause(page, 1000)
  const copy = page.getByRole('button', { name: 'Copy' }).first()
  await camera(page, copy, 1.9)
  await glide(page, copy)
  await pause(page, 800)
  await glide(page, page.getByRole('menuitem', { name: /Copy diff/ }))
  await pause(page, 700)
})

await browser.close()
for (const f of readdirSync(`${OUT}/raw`)) rmSync(`${OUT}/raw/${f}`)
rmSync(`${OUT}/raw`, { recursive: true })
