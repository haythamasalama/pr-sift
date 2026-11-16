export interface SavedFilter {
  name: string
  include: string[]
  includeHidden?: boolean
}

export const SAVED_FILTER_EXAMPLES: readonly SavedFilter[] = [
  { name: 'Backend', include: ['src/**', 'app/**', '**/*.php'] },
  { name: 'Frontend', include: ['resources/js/**', '**/*.vue', '**/*.ts', '**/*.tsx', '**/*.css'] },
  { name: 'Tests', include: ['tests/**', '**/*.test.ts', '**/*.spec.ts', '**/*Test.php'] },
  { name: 'Docs', include: ['docs/**', '**/*.md'] },
  {
    name: 'AI',
    include: ['**/CLAUDE.md', '**/AGENTS.md', '.claude/**', '.cursor/**', '.github/copilot-instructions.md', '**/*.mdc'],
  },
]

const nameKey = (name: string) => name.trim().toLowerCase()

export function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

// The review keys its filter buttons by name, so a second filter with the same name is dropped.
export function cleanSavedFilters(filters: readonly SavedFilter[]): SavedFilter[] {
  const seen = new Set<string>()
  const clean: SavedFilter[] = []
  for (const filter of filters) {
    const name = filter.name.trim()
    const include = filter.include.map((pattern) => pattern.trim()).filter(Boolean)
    if (!name || !include.length || seen.has(nameKey(name))) continue
    seen.add(nameKey(name))
    clean.push({ name, include, includeHidden: filter.includeHidden === true })
  }
  return clean
}

export function missingExamples(filters: readonly Pick<SavedFilter, 'name'>[]): SavedFilter[] {
  const taken = new Set(filters.map((filter) => nameKey(filter.name)))
  return SAVED_FILTER_EXAMPLES.filter((example) => !taken.has(nameKey(example.name))).map((example) => ({
    ...example,
    include: [...example.include],
  }))
}
