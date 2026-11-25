import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { scanLeftovers } from '../../src/main/leftovers/scan'
import { makeRepo, sh, tempDir, write } from './helpers'

const BIG = 100 * 1024 * 1024 + 1

function scan(root: string, home = tempDir('home-')) {
  return scanLeftovers({ roots: [root], depth: 8, platform: 'linux', home, env: {} })
}

const paths = (list: { path: string }[]) => list.map((l) => l.path).sort()

describe('scanLeftovers', () => {
  it('lists ignored dependency and build folders', async () => {
    const root = tempDir('projects-')
    const app = makeRepo(root, 'app')
    write(join(app, '.gitignore'), 'node_modules/\ndist/\n')
    write(join(app, 'node_modules', 'x', 'index.js'))
    write(join(app, 'dist', 'app.js'))
    write(join(app, 'packages', 'ui', 'node_modules', 'y.js'))
    const found = await scan(root)
    expect(paths(found)).toEqual([join(app, 'dist'), join(app, 'node_modules'), join(app, 'packages', 'ui', 'node_modules')])
    expect(found.find((f) => f.path.endsWith('dist'))).toMatchObject({ kind: 'build' })
  })

  it('never lists a folder git tracks', async () => {
    const root = tempDir('projects-')
    const app = makeRepo(root, 'app')
    write(join(app, 'build', 'keep.txt'))
    sh(app, 'add', '.')
    sh(app, 'commit', '-q', '-m', 'build is source here')
    expect(await scan(root)).toEqual([])
  })

  it('needs the file that makes a folder name mean something', async () => {
    const root = tempDir('projects-')
    write(join(root, 'go-tool', 'vendor', 'lib.go'))
    write(join(root, 'rust', 'Cargo.toml'))
    write(join(root, 'rust', 'target', 'debug', 'bin'))
    write(join(root, 'notes', 'target', 'plan.md'))
    expect(paths(await scan(root))).toEqual([join(root, 'rust', 'target')])
  })

  it('lists big media files that are not tracked', async () => {
    const root = tempDir('projects-')
    const app = makeRepo(root, 'app')
    const big = Buffer.alloc(0)
    write(join(app, 'demo.mov'), big)
    // A sparse file reports a large size without using the disk.
    const { truncateSync } = await import('node:fs')
    truncateSync(join(app, 'demo.mov'), BIG)
    write(join(app, 'small.mp4'), 'tiny')
    const found = await scan(root)
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ kind: 'media', path: join(app, 'demo.mov'), size: BIG })
  })

  it('adds tool caches that exist', async () => {
    const root = tempDir('projects-')
    const home = tempDir('home-')
    write(join(home, '.cache', 'pip', 'http', 'x'))
    const found = await scan(root, home)
    expect(found).toEqual([expect.objectContaining({ kind: 'cache', path: join(home, '.cache', 'pip'), label: 'pip cache' })])
  })
})
