import { describe, expect, it } from 'vitest'
import { extensionsOf, matchesChip, matchesExtension, normalizeExtension } from '../../src/lib/extensions'
import { file } from '../helpers/fixtures'

describe('extensionsOf', () => {
  it('returns the last extension', () => {
    expect(extensionsOf('src/Foo.php', [])).toEqual(['.php'])
  })

  it('also reports well-known compound extensions', () => {
    expect(extensionsOf('views/show.blade.php', [])).toEqual(expect.arrayContaining(['.blade.php', '.php']))
    expect(extensionsOf('types/index.d.ts', [])).toEqual(expect.arrayContaining(['.d.ts', '.ts']))
  })

  it('supports user-defined suffixes', () => {
    expect(extensionsOf('stubs/make.model.stub', ['.model.stub'])).toEqual(expect.arrayContaining(['.model.stub', '.stub']))
  })

  it('handles dotfiles and files without an extension', () => {
    expect(extensionsOf('.gitignore', [])).toEqual(['.gitignore'])
    expect(extensionsOf('Dockerfile', [])).toEqual(['(none)'])
  })

  it('does not treat the whole name as a compound suffix', () => {
    expect(extensionsOf('.d.ts', [])).not.toContain('.d.ts')
  })
})

describe('matchesExtension', () => {
  it('matches case-insensitively on the file name', () => {
    expect(matchesExtension('a/B.PHP', '.php')).toBe(true)
    expect(matchesExtension('a/b.phpx', '.php')).toBe(false)
  })

  it('matches files without an extension', () => {
    expect(matchesExtension('bin/Makefile', '(none)')).toBe(true)
    expect(matchesExtension('bin/a.sh', '(none)')).toBe(false)
  })
})

describe('matchesChip', () => {
  it('matches status chips against the file status', () => {
    expect(matchesChip(file('a.php', { status: 'removed' }), 'status:removed')).toBe(true)
    expect(matchesChip(file('a.php'), 'status:removed')).toBe(false)
  })

  it('falls back to extension matching', () => {
    expect(matchesChip(file('a.php'), '.php')).toBe(true)
  })
})

describe('normalizeExtension', () => {
  it('lowercases and adds the leading dot', () => {
    expect(normalizeExtension(' Blade.PHP ')).toBe('.blade.php')
    expect(normalizeExtension('.ts')).toBe('.ts')
  })

  it('returns an empty string for blank input', () => {
    expect(normalizeExtension('   ')).toBe('')
  })
})
