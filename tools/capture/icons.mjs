import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ICONS = fileURLToPath(new URL('../../apps/extension/icons/', import.meta.url))
const SITE_ICONS = fileURLToPath(new URL('../../apps/site/assets/icons/', import.meta.url))
const logo = readFileSync(`${ICONS}logo.svg`, 'utf8')

const browser = await chromium.launch()

async function render(size) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<!doctype html><style>* { margin: 0 } svg { display: block; width: ${size}px; height: ${size}px }</style>${logo}`)
  const png = await page.screenshot({ omitBackground: true })
  await page.close()
  return png
}

// An ICO file may hold PNG images directly: a 6-byte header, a 16-byte entry per image, then the PNG data.
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(([size, png], i) => {
    const at = 6 + 16 * i
    header.writeUInt8(size >= 256 ? 0 : size, at)
    header.writeUInt8(size >= 256 ? 0 : size, at + 1)
    header.writeUInt16LE(1, at + 4)
    header.writeUInt16LE(32, at + 6)
    header.writeUInt32LE(png.length, at + 8)
    header.writeUInt32LE(offset, at + 12)
    offset += png.length
  })
  return Buffer.concat([header, ...images.map(([, png]) => png)])
}

for (const size of [16, 32, 48, 128]) writeFileSync(`${ICONS}icon-${size}.png`, await render(size))

mkdirSync(SITE_ICONS, { recursive: true })
for (const [name, size] of [
  ['favicon-96.png', 96],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
]) {
  writeFileSync(`${SITE_ICONS}${name}`, await render(size))
}
writeFileSync(
  `${SITE_ICONS}favicon.ico`,
  ico([
    [16, await render(16)],
    [32, await render(32)],
    [48, await render(48)],
  ]),
)

await browser.close()

console.log('extension and site icons written')
