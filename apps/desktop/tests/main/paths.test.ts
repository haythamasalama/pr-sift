import { describe, expect, it } from 'vitest'
import { posix, win32 } from 'node:path'

const { delimiter, join } = posix
import { extraPathDirs, findProgram, withExtraPath } from '../../src/main/paths'

describe('withExtraPath', () => {
  it('adds Homebrew on macOS after what PATH already has', () => {
    const path = withExtraPath('darwin', { PATH: ['/usr/bin', '/bin'].join(delimiter) }, '/Users/me')
    const parts = path.split(delimiter)
    expect(parts.slice(0, 2)).toEqual(['/usr/bin', '/bin'])
    expect(parts).toContain('/opt/homebrew/bin')
    expect(parts.filter((p) => p === '/usr/bin')).toHaveLength(1)
  })

  it('uses the GitHub CLI install folders on Windows', () => {
    const dirs = extraPathDirs(
      'win32',
      { ProgramFiles: 'C:\\Program Files', LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' },
      'C:\\Users\\me',
    )
    expect(dirs).toContain('C:\\Program Files\\GitHub CLI')
  })
})

describe('findProgram', () => {
  it('finds the first match on PATH', () => {
    const env = { PATH: ['/a', '/b'].join(delimiter) }
    expect(findProgram('gh', 'linux', env, (p) => p === join('/b', 'gh'))).toBe(join('/b', 'gh'))
  })

  it('looks for .exe on Windows', () => {
    const env = { Path: 'C:\\Windows;C:\\tools' }
    expect(findProgram('gh', 'win32', env, (p) => p.startsWith('C:\\tools'))).toBe(win32.join('C:\\tools', 'gh.exe'))
  })

  it('returns null when it is not installed', () => {
    expect(findProgram('gh', 'darwin', { PATH: '/usr/bin' }, () => false)).toBeNull()
  })
})
