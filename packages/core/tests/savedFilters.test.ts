import { describe, expect, it } from 'vitest'
import { matcher } from '../src/glob'
import { SAVED_FILTER_EXAMPLES, cleanSavedFilters, missingExamples, patternsFromView, splitLines } from '../src/savedFilters'

describe('splitLines', () => {
  it('keeps one trimmed entry per non-empty line', () => {
    expect(splitLines('  src/**\n\n**/*.php  \n')).toEqual(['src/**', '**/*.php'])
    expect(splitLines('')).toEqual([])
  })
})

describe('cleanSavedFilters', () => {
  it('leaves out filters without a name or without patterns', () => {
    expect(
      cleanSavedFilters([
        { name: '', include: ['src/**'] },
        { name: 'Empty', include: [' ', ''] },
        { name: ' Backend ', include: [' src/** ', ''] },
      ]),
    ).toEqual([{ name: 'Backend', include: ['src/**'], includeHidden: false }])
  })

  it('keeps the first filter when two share a name', () => {
    const clean = cleanSavedFilters([
      { name: 'Docs', include: ['docs/**'], includeHidden: true },
      { name: 'docs', include: ['**/*.md'] },
    ])
    expect(clean).toEqual([{ name: 'Docs', include: ['docs/**'], includeHidden: true }])
  })
})

describe('SAVED_FILTER_EXAMPLES', () => {
  it('offers backend, frontend, tests, docs and AI filters', () => {
    expect(SAVED_FILTER_EXAMPLES.map((example) => example.name)).toEqual(['Backend', 'Frontend', 'Tests', 'Docs', 'AI'])
  })

  it.each([
    ['Backend', 'app/Http/Controllers/OrderController.php', true],
    ['Frontend', 'resources/js/Pages/Orders.vue', true],
    ['Tests', 'tests/Feature/OrderTest.php', true],
    ['Tests', 'src/cart.spec.ts', true],
    ['Docs', 'docs/setup.md', true],
    ['AI', 'packages/api/CLAUDE.md', true],
    ['AI', '.cursor/rules/style.mdc', true],
    ['AI', 'README.md', false],
  ])('%s matches %s: %s', (name, path, expected) => {
    const example = SAVED_FILTER_EXAMPLES.find((e) => e.name === name)!
    expect(matcher(example.include)(path)).toBe(expected)
  })
})

describe('missingExamples', () => {
  it('offers only the examples whose name is not taken, ignoring case and spaces', () => {
    const names = missingExamples([{ name: ' backend' }, { name: 'AI' }]).map((example) => example.name)
    expect(names).toEqual(['Frontend', 'Tests', 'Docs'])
  })

  it('returns copies, so editing one does not change the examples', () => {
    const [first] = missingExamples([])
    first!.include.push('lib/**')
    expect(SAVED_FILTER_EXAMPLES[0]!.include).not.toContain('lib/**')
  })
})

describe('patternsFromView', () => {
  it('turns the chosen file types and folders into path patterns', () => {
    expect(patternsFromView(['.php', '.blade.php'], [])).toEqual(['**/*.php', '**/*.blade.php'])
    expect(patternsFromView([], ['src/Domain'])).toEqual(['src/Domain/**'])
    expect(patternsFromView(['.vue'], ['resources/js', 'packages/ui'])).toEqual(['resources/js/**/*.vue', 'packages/ui/**/*.vue'])
    expect(patternsFromView([], [])).toEqual([])
  })
})
