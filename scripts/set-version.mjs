import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const FILES = [
  'apps/extension/manifest.json',
  'package.json',
  'apps/extension/package.json',
  'apps/site/package.json',
  'packages/core/package.json',
  'tools/capture/package.json',
]

const version = process.argv[2]
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  console.error('Usage: pnpm release:version <major.minor.patch>')
  process.exit(1)
}

for (const file of FILES) {
  const path = fileURLToPath(new URL(`../${file}`, import.meta.url))
  const json = JSON.parse(readFileSync(path, 'utf8'))
  json.version = version
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`)
}
execFileSync('pnpm', ['exec', 'prettier', '--write', ...FILES], { cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: 'ignore' })

console.log(`Set ${FILES.length} files to ${version}. Now move the Unreleased entries in CHANGELOG.md under ## ${version}.`)
