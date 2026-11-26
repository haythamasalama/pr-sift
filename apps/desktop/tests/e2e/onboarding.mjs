// The first-run steps with a projects folder chosen, in both modes.
// Usage: node tests/e2e/onboarding.mjs <projects folder> [screenshots folder]
import { _electron as electron } from 'playwright'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [projects, shots = tmpdir()] = process.argv.slice(2)
const app = fileURLToPath(new URL('../../out/main/index.js', import.meta.url))
const config = mkdtempSync(join(tmpdir(), 'pr-sift-onboarding-'))
const electronApp = await electron.launch({
  args: [app, '--no-sandbox', '--disable-gpu'],
  env: { ...process.env, XDG_CONFIG_HOME: config, APPDATA: config },
})
await electronApp.evaluate(() => {
  const json = (body, headers = {}) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', ...headers } })
  globalThis.fetch = async (input) => {
    const url = new URL(String(input))
    if (url.pathname === '/user')
      return json({ login: 'octo-test', name: 'Octo Test', avatar_url: null }, { 'x-oauth-scopes': 'repo, read:org' })
    if (url.pathname === '/graphql')
      return json({
        data: {
          viewer: { login: 'octo-test' },
          search: { nodes: [] },
          review: { nodes: [] },
          mine: { nodes: [] },
          assigned: { nodes: [] },
        },
      })
    return json([])
  }
})
const page = await electronApp.firstWindow()
await page.setViewportSize({ width: 1180, height: 780 })
await page.emulateMedia({ colorScheme: 'light' })
await page.getByLabel('Personal access token').fill('ghp_example_token_for_onboarding')
await page.screenshot({ path: join(shots, 'ob-1-sign-in-light.png') })
await page.getByRole('button', { name: 'Sign in', exact: true }).click()
await page.getByRole('heading', { name: 'Pick your style' }).waitFor()
await page.getByRole('radio', { name: /Mono/ }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: join(shots, 'ob-2-style-mono-light.png') })
await page.getByRole('radio', { name: /GitHub/ }).click()
await page.getByRole('button', { name: 'Continue' }).click()
await page.getByRole('heading', { name: 'Add your projects' }).waitFor()
// The folder picker answers with the test folder, as if it was chosen in the system dialog.
await electronApp.evaluate(({ dialog }, root) => {
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [root] })
}, projects)
await page.getByRole('button', { name: 'Choose a folder' }).click()
await page.getByText(/repositories not added yet/).waitFor({ timeout: 15000 })
await page.screenshot({ path: join(shots, 'ob-3a-found-light.png') })
for (const name of ['shop', 'docs']) await page.getByRole('checkbox', { name, exact: true }).click()
await page.getByRole('button', { name: 'Add 2 projects' }).click()
await page.getByRole('button', { name: /Start using PR Sift/ }).waitFor()
await page.screenshot({ path: join(shots, 'ob-3-projects-light.png') })
await page.emulateMedia({ colorScheme: 'dark' })
await page.waitForTimeout(200)
await page.screenshot({ path: join(shots, 'ob-3-projects-dark.png') })
await page.getByRole('button', { name: /Start using PR Sift/ }).click()
await page.getByRole('heading', { name: 'Needs you' }).waitFor()
await page.screenshot({ path: join(shots, 'ob-4-app.png') })
await page.setViewportSize({ width: 560, height: 700 })
await page
  .getByRole('button', { name: 'octo-test' })
  .click()
  .catch(() => undefined)
await electronApp.close()
console.log('Onboarding run passed')
