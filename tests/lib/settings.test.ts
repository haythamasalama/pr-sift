import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULTS, getSettings, globToRegex, matcher, saveSetting } from '../../src/lib/settings'
import { installChrome } from '../helpers/chrome'

describe('globToRegex', () => {
  it('matches a single segment wildcard without crossing folders', () => {
    const re = globToRegex('src/*.php')
    expect(re.test('src/a.php')).toBe(true)
    expect(re.test('src/deep/a.php')).toBe(false)
  })

  it('matches double-star across any depth, including none', () => {
    const re = globToRegex('**/*.php')
    expect(re.test('a.php')).toBe(true)
    expect(re.test('a/b/c.php')).toBe(true)
    expect(re.test('a/b/c.phtml')).toBe(false)
  })

  it('escapes regex metacharacters in the pattern', () => {
    expect(globToRegex('a.b+c').test('a.b+c')).toBe(true)
    expect(globToRegex('a.b').test('aXb')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(globToRegex('**/ReadMe.md').test('docs/README.MD')).toBe(true)
  })
})

describe('matcher', () => {
  it('matches when any glob matches', () => {
    const match = matcher(['**/*.lock', 'package-lock.json'])
    expect(match('composer.lock')).toBe(true)
    expect(match('package-lock.json')).toBe(true)
    expect(match('package.json')).toBe(false)
  })

  it('supports folder scopes', () => {
    const match = matcher(['src/Domain/Order/**'])
    expect(match('src/Domain/Order/Actions/Get.php')).toBe(true)
    expect(match('src/Domain/Core/Get.php')).toBe(false)
  })
})

describe('settings storage', () => {
  beforeEach(() => {
    installChrome()
  })

  it('returns the defaults when nothing is stored', async () => {
    expect(await getSettings()).toEqual(DEFAULTS)
  })

  it('stores only the overridden keys and merges them over the defaults', async () => {
    await saveSetting('sidebarWidth', 480)
    await saveSetting('reviewMode', false)
    const settings = await getSettings()
    expect(settings.sidebarWidth).toBe(480)
    expect(settings.reviewMode).toBe(false)
    expect(settings.hide).toEqual(DEFAULTS.hide)
  })

  it('does not throw when the extension context is gone', async () => {
    const chrome = installChrome()
    delete (chrome.chrome.runtime as { id?: string }).id
    await expect(saveSetting('sidebarWidth', 300)).resolves.toBeUndefined()
    expect(await getSettings()).toEqual(DEFAULTS)
  })
})
