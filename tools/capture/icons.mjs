import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ICONS = fileURLToPath(new URL('../../apps/extension/icons/', import.meta.url))
const logo = readFileSync(`${ICONS}logo.svg`, 'utf8')

const browser = await chromium.launch()
for (const size of [16, 32, 48, 128]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<!doctype html><style>* { margin: 0 } svg { display: block; width: ${size}px; height: ${size}px }</style>${logo}`)
  await page.screenshot({ path: `${ICONS}icon-${size}.png`, omitBackground: true })
  await page.close()
}
await browser.close()

console.log('extension icons written')
