import { describe, expect, it } from 'vitest'
import { nextTick, shallowRef } from 'vue'
import { useFileFilter } from '../../src/composables/useFileFilter'
import { DEFAULTS } from '../../src/lib/settings'
import type { PrFile, Settings } from '../../src/lib/types'
import { installChrome } from '../helpers/chrome'
import { file } from '@pr-sift/core/testing'

function setup(files: PrFile[], overrides: Partial<Settings> = {}, viewed: string[] = []) {
  installChrome()
  const filesRef = shallowRef(files)
  const settings = shallowRef<Settings>({ ...DEFAULTS, ...overrides })
  const viewedNames = shallowRef(new Set(viewed))
  const filter = useFileFilter(filesRef, settings, (f) => viewedNames.value.has(f.filename))
  filter.reviewMode.value = false
  return { filter, files: filesRef, settings, viewedNames }
}

const names = (list: PrFile[]) => list.map((f) => f.filename)

describe('progress', () => {
  it('counts every visible-by-rules file, whatever the search or chips are', async () => {
    const { filter } = setup([file('src/a.php'), file('src/b.ts'), file('docs/readme.md'), file('composer.lock')], {}, ['src/a.php'])
    const before = filter.progress.value
    expect(before).toEqual({ total: 3, done: 1, left: 2 })
    filter.query.value = 'readme'
    await filter.toggleChip('.ts')
    expect(filter.progress.value).toEqual(before)
  })
})

describe('files with notes', () => {
  it('offers a chip that shows only the files that have notes', async () => {
    installChrome()
    const files = shallowRef([file('src/a.php'), file('src/b.php')])
    const noted = shallowRef<ReadonlyMap<string, number>>(new Map([['src/b.php', 2]]))
    const filter = useFileFilter(files, shallowRef<Settings>({ ...DEFAULTS }), () => false, noted)
    filter.reviewMode.value = false

    const chip = filter.chips.value.find((c) => c.ext === 'has:notes')
    expect(chip).toMatchObject({ label: 'with notes', count: 2 })

    await filter.toggleChip('has:notes')
    expect(filter.candidates.value.map((f) => f.filename)).toEqual(['src/b.php'])
  })

  it('has no chip when nothing has a note', () => {
    installChrome()
    const filter = useFileFilter(shallowRef([file('a.php')]), shallowRef<Settings>({ ...DEFAULTS }), () => false)
    expect(filter.chips.value.some((c) => c.ext === 'has:notes')).toBe(false)
  })
})

describe('useFileFilter', () => {
  const files = [file('src/a.php'), file('src/b.ts'), file('docs/readme.md'), file('composer.lock'), file('app.min.js')]

  it('hides generated files by default and counts them', () => {
    const { filter } = setup(files)
    expect(names(filter.candidates.value)).toEqual(['src/a.php', 'src/b.ts', 'docs/readme.md'])
    expect(filter.hiddenCount.value).toBe(2)
  })

  it('shows hidden files on request', () => {
    const { filter } = setup(files)
    filter.showHidden.value = true
    expect(filter.candidates.value).toHaveLength(5)
  })

  it('builds extension chips with counts', () => {
    const { filter } = setup(files)
    const php = filter.chips.value.find((c) => c.ext === '.php')
    expect(php).toMatchObject({ count: 1, custom: false })
  })

  it('shows only a type when its chip is clicked and undoes it on the second click', async () => {
    const { filter } = setup(files)
    await filter.toggleChip('.ts')
    expect(names(filter.inScope.value)).toEqual(['src/b.ts'])
    expect(filter.filtersActive.value).toBe(true)
    await filter.toggleChip('.ts')
    expect(filter.inScope.value).toHaveLength(3)
    expect(filter.filtersActive.value).toBe(false)
  })

  it('always hides a type with the hide gesture and persists only that choice', async () => {
    const chrome = installChrome()
    const filter = useFileFilter(shallowRef(files), shallowRef(DEFAULTS), () => false)
    await filter.toggleChip('.md', true)
    expect(names(filter.inScope.value)).not.toContain('docs/readme.md')
    expect(chrome.store.settings).toMatchObject({ hiddenTypes: ['.md'] })
    await filter.toggleChip('.ts')
    expect(chrome.store.settings).toMatchObject({ hiddenTypes: ['.md'] })
  })

  it('clicking a hidden type brings it back', async () => {
    const { filter } = setup(files)
    await filter.toggleChip('.md', true)
    await filter.toggleChip('.md')
    expect(names(filter.inScope.value)).toContain('docs/readme.md')
    expect(filter.chips.value.find((c) => c.ext === '.md')!.state).toBeUndefined()
  })

  it('shows an explicitly included type even when a rule hides it', async () => {
    const { filter } = setup(files)
    await filter.toggleChip('.lock')
    expect(names(filter.inScope.value)).toEqual(['composer.lock'])
  })

  it('keeps an active filter visible even when no file matches its chip any more', async () => {
    const { filter } = setup(files)
    await filter.toggleChip('.ts')
    filter.query.value = 'readme'
    const chip = filter.chips.value.find((c) => c.ext === '.ts')
    expect(chip).toMatchObject({ count: 0, state: 'include' })
  })

  it('restores saved hidden types', () => {
    const { filter } = setup(files)
    filter.loadHiddenTypes(['.md'])
    expect(names(filter.inScope.value)).not.toContain('docs/readme.md')
  })

  it('resets every filter and the saved hidden types', async () => {
    const chrome = installChrome()
    const filter = useFileFilter(shallowRef(files), shallowRef(DEFAULTS), () => false)
    await filter.toggleChip('.md', true)
    await filter.toggleChip('.ts')
    filter.query.value = 'x'
    filter.setScopes(['path:src'])
    filter.showHidden.value = true
    await filter.resetFilters()
    expect(filter.filtersActive.value).toBe(false)
    expect(filter.query.value).toBe('')
    expect(filter.scopes.value).toEqual([])
    expect(chrome.store.settings).toMatchObject({ hiddenTypes: [] })
  })

  it('filters by file name or by suffix when the query starts with a dot', () => {
    const { filter } = setup(files)
    filter.query.value = 'readme'
    expect(names(filter.inScope.value)).toEqual(['docs/readme.md'])
    filter.query.value = '.ts'
    expect(names(filter.inScope.value)).toEqual(['src/b.ts'])
  })

  it('combines several scopes as a union', () => {
    const { filter } = setup(files)
    filter.setScopes(['path:docs'])
    filter.toggleScope('path:src')
    expect(filter.inScope.value).toHaveLength(3)
    filter.toggleScope('path:src')
    expect(names(filter.inScope.value)).toEqual(['docs/readme.md'])
  })

  it('applies named presets and toggles them off', () => {
    const { filter } = setup(files, { presets: [{ name: 'PHP', include: ['**/*.php'] }] })
    filter.togglePreset('PHP')
    expect(names(filter.inScope.value)).toEqual(['src/a.php'])
    filter.togglePreset('PHP')
    expect(filter.inScope.value).toHaveLength(3)
  })

  it('removes viewed files in review mode and reports progress', async () => {
    const { filter, viewedNames } = setup(files, {}, ['src/a.php'])
    expect(filter.progress.value).toEqual({ total: 3, done: 1, left: 2 })
    expect(filter.inScope.value).toHaveLength(3)
    filter.reviewMode.value = true
    expect(names(filter.inScope.value)).toEqual(['src/b.ts', 'docs/readme.md'])
    expect(names(filter.viewedInView.value)).toEqual(['src/a.php'])
    viewedNames.value = new Set(['src/a.php', 'src/b.ts'])
    await nextTick()
    expect(filter.inScope.value).toHaveLength(1)
  })

  it('selects a single folder for the tree highlight', () => {
    const { filter } = setup(files)
    expect(filter.selectedFolder.value).toBe('')
    filter.setScopes(['path:src'])
    expect(filter.selectedFolder.value).toBe('src')
    filter.setScopes(['path:src', 'path:docs'])
    expect(filter.selectedFolder.value).toBe('')
  })
})
