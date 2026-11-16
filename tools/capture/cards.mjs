import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url))
const STORE = root('media/store')

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
// Each store image zooms into the one part that explains it, so the text stays readable at 1280×800.
// crop is [x, y, width, height] in the 3200×2120 screenshot.
const SHOTS = [
  {
    name: 'review',
    hero: true,
    image: 'tree-viewed',
    crop: [160, 200, 2140, 1140],
  },
  {
    name: 'notes-ai',
    title: 'Write notes. Your AI fixes them.',
    sub: 'Private notes on any lines, copied as one prompt for Claude Code, Codex, Cursor or Copilot.',
    image: 'ai-export',
    crop: [976, 966, 1296, 762],
  },
  {
    name: 'merge',
    side: true,
    title: 'Merge without AI co-authors',
    sub: 'Claude, Codex and other AI tools start unchecked, so your name stays on your commit.',
    image: 'merge',
    crop: [2274, 1240, 766, 760],
  },
  {
    name: 'filters',
    title: 'Show only the files you want',
    sub: 'Click a type or a change to see only those files. Shift-click hides it everywhere.',
    image: 'filters',
    crop: [160, 300, 1800, 840],
  },
  {
    name: 'viewed',
    title: 'Never read a file twice',
    sub: 'Mark files or whole folders as viewed. The ring shows what is left.',
    image: 'tree-viewed',
    crop: [160, 200, 1560, 920],
  },
]

const SHOT = { width: 1280, height: 800, side: 60 }
const webp = (name) => readFileSync(root(`media/screenshots/${name}.webp`)).toString('base64')

// Fits the crop into a box and returns the framed image, positioned inside the box.
function fitted(image, [x, y, w, h], box) {
  const scale = Math.min(box.width / w, box.height / h)
  const width = Math.round(w * scale)
  const height = Math.round(h * scale)
  const left = box.left + Math.round((box.width - width) / 2)
  const top = box.top + (box.middle ? Math.round((box.height - height) / 2) : 0)
  return `<div class="frame" style="left:${left}px;top:${top}px;width:${width}px;height:${height}px"><img src="data:image/webp;base64,${webp(image)}" style="left:${-x * scale}px;top:${-y * scale}px;width:${3200 * scale}px"></div>`
}

const SHOT_STYLE = `
  ${FONTS}
  * { margin: 0; box-sizing: border-box; }
  body { width: ${SHOT.width}px; height: ${SHOT.height}px; overflow: hidden; background: #000; color: #fff; font-family: Plex; position: relative; }
  h1 { font-size: 48px; font-weight: 600; letter-spacing: -0.025em; line-height: 1.1; }
  .sub { margin-top: 14px; font-size: 22px; font-weight: 500; line-height: 1.4; color: #8b949e; }
  .logo { position: absolute; right: ${SHOT.side}px; top: 52px; width: 52px; height: 52px; }
  .frame { position: absolute; overflow: hidden; border-radius: 14px; border: 1px solid #30363d; box-shadow: 0 30px 80px -30px rgb(0 0 0 / 0.8); }
  .frame img { position: absolute; max-width: none; }
  .diff { font-family: PlexMono; font-size: 38px; font-weight: 500; letter-spacing: -0.01em; }
  .diff p { display: flex; gap: 20px; padding: 8px 18px; }
  .diff .del { background: rgb(248 81 73 / 0.17); border-radius: 10px 10px 0 0; }
  .diff .add { background: rgb(46 160 67 / 0.2); border-radius: 0 0 10px 10px; }
  .del span { color: #f85149; }
  .add span { color: #3fb950; }`

function storeShot(shot) {
  const inner = SHOT.width - SHOT.side * 2
  if (shot.side) {
    const textWidth = 400
    const box = { left: SHOT.side + textWidth + 40, top: 60, width: inner - textWidth - 40, height: SHOT.height - 120, middle: true }
    return `<!doctype html><style>${SHOT_STYLE}
  .text { position: absolute; left: ${SHOT.side}px; width: ${textWidth}px; top: 50%; transform: translateY(-50%); }
  .logo { top: auto; bottom: 52px; left: ${SHOT.side}px; right: auto; }
</style>
<div class="text"><h1>${shot.title}</h1><p class="sub">${shot.sub}</p></div>${LOGO.replace('<svg ', '<svg class="logo" ')}
${fitted(shot.image, shot.crop, box)}`
  }
  const header = shot.hero
    ? `<div class="diff"><p class="del"><span>−</span>Scroll 214 changed files.</p><p class="add"><span>+</span>Review the 12 that matter.</p></div>`
    : `<h1>${shot.title}</h1><p class="sub">${shot.sub}</p>`
  const top = shot.hero ? 220 : 200
  const box = { left: SHOT.side, top, width: inner, height: SHOT.height - top - 40 }
  return `<!doctype html><style>${SHOT_STYLE}
  header { position: absolute; left: ${SHOT.side}px; right: ${SHOT.side + 80}px; top: 52px; }
</style>
<header>${header}</header>${LOGO.replace('<svg ', '<svg class="logo" ')}
${fitted(shot.image, shot.crop, box)}`
}

for (const [i, shot] of SHOTS.entries()) {
  await render(storeShot(shot), SHOT, `${STORE}/screenshot-${i + 1}-${shot.name}.png`)
}
await browser.close()

console.log('social image and store images written')
