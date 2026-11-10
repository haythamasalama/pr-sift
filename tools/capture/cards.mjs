import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ffmpeg from 'ffmpeg-static'
import { chromium } from 'playwright'

const root = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url))
const STORE = root('media/store')
const STORE_SHOTS = ['review', 'filters', 'notes', 'ai-export', 'dark']

const font = (pkg, file) =>
  `data:font/woff2;base64,${readFileSync(root(`apps/site/node_modules/@fontsource/${pkg}/files/${file}`)).toString('base64')}`

const FONTS = `
  @font-face { font-family: Plex; font-weight: 500; src: url(${font('ibm-plex-sans', 'ibm-plex-sans-latin-500-normal.woff2')}); }
  @font-face { font-family: Plex; font-weight: 600; src: url(${font('ibm-plex-sans', 'ibm-plex-sans-latin-600-normal.woff2')}); }
  @font-face { font-family: PlexMono; font-weight: 500; src: url(${font('ibm-plex-mono', 'ibm-plex-mono-latin-500-normal.woff2')}); }`

const LOGO = `<svg viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#fff"/><path d="M22 28h56L57 53v20l-14-7V53L22 28Z" fill="none" stroke="#000" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`

function card({ width, height, unit, diff = 1.1, sub }) {
  return `<!doctype html>
<style>
  ${FONTS}
  * { margin: 0; box-sizing: border-box; }
  body { width: ${width}px; height: ${height}px; overflow: hidden; background: #000; color: #fff; font-family: Plex; padding: ${unit * 2.4}px ${unit * 2.6}px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: ${unit * 0.75}px; font-size: ${unit * 1.75}px; font-weight: 600; letter-spacing: -0.02em; }
  .brand svg { width: ${unit * 2.5}px; height: ${unit * 2.5}px; }
  .diff { margin-top: auto; font-family: PlexMono; font-size: ${unit * diff}px; font-weight: 500; letter-spacing: -0.01em; }
  .diff p { display: flex; gap: ${unit * 0.7}px; padding: ${unit * 0.5}px ${unit * 0.75}px; }
  .del { background: rgb(248 81 73 / 0.17); border-radius: ${unit * 0.35}px ${unit * 0.35}px 0 0; }
  .add { background: rgb(46 160 67 / 0.2); border-radius: 0 0 ${unit * 0.35}px ${unit * 0.35}px; }
  .del span { color: #f85149; }
  .add span { color: #3fb950; }
  .sub { margin-top: ${unit * 1.25}px; font-size: ${unit * 0.85}px; font-weight: 500; color: #8b949e; }
</style>
<div class="brand">${LOGO}PR Sift</div>
<div class="diff">
  <p class="del"><span>−</span>Scroll 214 changed files.</p>
  <p class="add"><span>+</span>Review the 12 that matter.</p>
</div>
${sub ? `<p class="sub">${sub}</p>` : ''}`
}

const browser = await chromium.launch()

async function render(html, { width, height }, path, scale = 1) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale })
  await page.setContent(html)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path })
  await page.close()
}

await render(
  card({ width: 1200, height: 630, unit: 30, diff: 1.75, sub: 'Free Chrome extension for large GitHub pull requests' }),
  { width: 1200, height: 630 },
  root('media/og.png'),
  2,
)

rmSync(STORE, { recursive: true, force: true })
mkdirSync(STORE, { recursive: true })
await render(card({ width: 440, height: 280, unit: 16 }), { width: 440, height: 280 }, `${STORE}/promo-small-440x280.png`)
await render(
  card({ width: 1400, height: 560, unit: 32, diff: 1.5, sub: 'Free Chrome extension for large GitHub pull requests' }),
  { width: 1400, height: 560 },
  `${STORE}/promo-marquee-1400x560.png`,
)
await browser.close()

STORE_SHOTS.forEach((name, i) => {
  execFileSync(ffmpeg, [
    '-y',
    '-loglevel',
    'error',
    '-i',
    root(`media/screenshots/${name}.webp`),
    '-vf',
    'scale=1280:-2:flags=lanczos,crop=1280:800',
    '-q:v',
    '2',
    `${STORE}/screenshot-${i + 1}-${name}.jpg`,
  ])
})

console.log('social image and store images written')
