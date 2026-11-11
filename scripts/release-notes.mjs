import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const version = (process.argv[2] ?? '').replace(/^v/, '')
const changelog = readFileSync(fileURLToPath(new URL('../CHANGELOG.md', import.meta.url)), 'utf8')

const lines = changelog.split('\n')
const start = lines.findIndex((line) => line === `## ${version}` || line.startsWith(`## ${version} - `))
if (!version || start === -1) {
  console.error(`CHANGELOG.md has no "## ${version}" section. Add one before tagging v${version}.`)
  process.exit(1)
}

const end = lines.findIndex((line, i) => i > start && line.startsWith('## '))
const notes = lines
  .slice(start + 1, end === -1 ? undefined : end)
  .join('\n')
  .trim()
  .replace(/^### /gm, '## ')

console.log(notes)
