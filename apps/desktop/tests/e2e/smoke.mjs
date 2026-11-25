// Launches the built app with a throwaway profile, signs in against a stubbed GitHub, and walks through every screen.
// Usage: node tests/e2e/smoke.mjs <projects folder> <screenshots folder>
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
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ login: 'octo-test', name: 'Octo Test', avatar_url: null }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-oauth-scopes': 'repo, read:org' },
    })
})
const page = await electronApp.firstWindow()
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
await page.setViewportSize({ width: 1180, height: 780 })

await page.getByText('Sign in to GitHub').waitFor()
await electronApp.evaluate(async ({ BrowserWindow }) => {
  for (let i = 0; i < 50 && !BrowserWindow.getAllWindows()[0]?.isVisible(); i++) await new Promise((r) => setTimeout(r, 100))
})
await page.screenshot({ path: join(shots, '1-sign-in.png') })
await page.getByLabel('Personal access token').fill('ghp_example_token_for_smoke_test')
await page.getByRole('button', { name: 'Sign in', exact: true }).click()
await page.getByRole('heading', { name: 'Worktrees' }).waitFor()

await page.evaluate((roots) => window.prSift.invoke('settings:set', { roots: [roots] }), projects)
await page.reload()
await page.getByText('feature/cart').waitFor()
await page.waitForTimeout(800)
await page.screenshot({ path: join(shots, '2-worktrees.png') })

const row = page.locator('li', { hasText: 'feature/cart' })
await row.getByRole('button', { name: 'Move to Trash' }).click()
await page.screenshot({ path: join(shots, '3-confirm.png') })
await page.getByRole('dialog').getByRole('button', { name: 'Move to Trash' }).click()
await page.waitForTimeout(800)
await page.screenshot({ path: join(shots, '4-removed.png') })

await page.getByRole('button', { name: 'Cleanup' }).click()
await page.getByText('Build output').first().waitFor({ timeout: 20_000 })
await page.waitForTimeout(800)
await page.screenshot({ path: join(shots, '5-cleanup.png') })

await page.getByRole('button', { name: 'Settings' }).click()
await page.screenshot({ path: join(shots, '6-settings.png') })
await page.getByRole('button', { name: 'octo-test' }).click()
await page.screenshot({ path: join(shots, '7-account.png') })

await electronApp.close()
if (errors.length) {
  console.error('Console errors:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('Smoke run passed')
