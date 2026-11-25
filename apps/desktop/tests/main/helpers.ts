import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

export const sh = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

export function tempDir(prefix: string) {
  return realpathSync(mkdtempSync(join(tmpdir(), prefix)))
}

export function write(path: string, content: string | Buffer = 'x') {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

export function makeRepo(root: string, name: string) {
  const repo = join(root, name)
  mkdirSync(repo, { recursive: true })
  sh(repo, 'init', '-q', '-b', 'main')
  sh(repo, 'config', 'user.email', 'test@example.com')
  sh(repo, 'config', 'user.name', 'Test')
  sh(repo, 'config', 'commit.gpgsign', 'false')
  write(join(repo, 'README.md'), 'hello\n')
  sh(repo, 'add', '.')
  sh(repo, 'commit', '-q', '-m', 'init')
  return repo
}
