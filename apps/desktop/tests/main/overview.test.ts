import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { detectStack, findIcon, readmeIntro, scoreIcon } from '../../src/main/projects/overview'
import { deleteBranches } from '../../src/main/projects/branches'
import { makeRepo, sh, tempDir, write } from './helpers'

describe('project icons', () => {
  it('prefers a favicon in a public folder over a logo deep in the source', () => {
    expect(scoreIcon('public/favicon.svg')).toBeGreaterThan(scoreIcon('src/components/ui/logo.png'))
    expect(scoreIcon('apps/web/public/favicon.ico')).toBeGreaterThan(scoreIcon('docs/logo.svg'))
  })

  it('finds the icon and skips dependency folders', async () => {
    const root = tempDir('icon-')
    write(join(root, 'node_modules/pkg/favicon.png'), 'nope')
    write(join(root, 'public/favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
    const icon = await findIcon(root)
    expect(icon?.startsWith('data:image/svg+xml;base64,')).toBe(true)
    expect(await findIcon(tempDir('empty-'))).toBeUndefined()
  })
})

describe('project overview', () => {
  it('reads the stack from the files at the top', async () => {
    const root = tempDir('stack-')
    write(join(root, 'composer.json'), JSON.stringify({ description: 'Shop API', require: { 'laravel/framework': '^11' } }))
    write(join(root, 'package.json'), JSON.stringify({ devDependencies: { vite: '6', vue: '3' } }))
    write(join(root, 'pnpm-lock.yaml'), '')
    write(join(root, 'Dockerfile'), '')
    expect(await detectStack(root)).toEqual({
      stack: ['Laravel', 'Vue', 'Vite', 'PHP', 'Docker'],
      description: 'Shop API',
      packageManager: 'pnpm',
    })
  })

  it('takes the first real paragraph of the README', () => {
    const text =
      '# Shop\n\n[![CI](x)](y) ![badge](z)\n\n<p align="center">logo</p>\n\nShop is the **backend** for [our store](https://x), with orders and payments.\n\nMore.'
    expect(readmeIntro(text)).toBe('Shop is the backend for our store, with orders and payments.')
  })
})

describe('deleteBranches', () => {
  it('deletes several branches, keeps checked-out ones, and deletes on GitHub only without an open pull request', async () => {
    const repo = makeRepo(tempDir('bulk-'), 'app')
    sh(repo, 'remote', 'add', 'origin', 'git@github.com:acme/app.git')
    for (const b of ['done', 'open-pr', 'wip']) sh(repo, 'branch', b)
    // Pretend done and open-pr were pushed.
    for (const b of ['done', 'open-pr']) {
      sh(repo, 'update-ref', `refs/remotes/origin/${b}`, 'HEAD')
      sh(repo, 'branch', `--set-upstream-to=origin/${b}`, b)
    }
    const removed: string[] = []
    const res = await deleteBranches(
      repo,
      ['done', 'open-pr', 'wip', 'main'],
      { force: false, remote: true },
      {
        hasOpenPull: async (_o, _r, branch) => branch === 'open-pr',
        remove: async (_o, _r, branch) => (removed.push(branch), { ok: true }),
      },
    )
    expect(res.deleted).toEqual(['done', 'open-pr', 'wip'])
    expect(res.remoteDeleted).toEqual(['done'])
    expect(removed).toEqual(['done'])
    expect(res.failed.map((f) => f.name)).toEqual(['open-pr', 'main'])
  })
})
