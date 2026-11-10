import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'))
const output = `review-lens-${version}.zip`

for (const required of ['dist/content.js', 'dist/background.js', 'dist/options.html', 'icons/icon-128.png']) {
  if (!existsSync(required)) throw new Error(`Missing ${required}. Run "pnpm build" first.`)
}

rmSync(output, { force: true })
execFileSync('zip', ['-r', '-q', output, 'manifest.json', 'dist', 'icons', '-x', '*.map', '*.DS_Store'], { stdio: 'inherit' })
console.log(`Created ${output}`)
