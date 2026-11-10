import type { PrFile } from './types'

const KNOWN_COMPOUND = [
  '.blade.php',
  '.d.ts',
  '.test.ts',
  '.spec.ts',
  '.test.tsx',
  '.spec.tsx',
  '.test.js',
  '.spec.js',
  '.stories.ts',
  '.stories.tsx',
  '.min.js',
  '.min.css',
  '.config.js',
  '.config.ts',
  '.config.mjs',
]

const baseName = (filename: string) => (filename.split('/').pop() ?? filename).toLowerCase()

export function normalizeExtension(raw: string): string {
  const ext = raw.trim().toLowerCase()
  if (!ext) return ''
  return ext.startsWith('.') ? ext : '.' + ext
}

export function extensionsOf(filename: string, custom: string[]): string[] {
  const base = baseName(filename)
  const found = new Set<string>()
  for (const c of [...KNOWN_COMPOUND, ...custom]) {
    if (base.length > c.length && base.endsWith(c)) found.add(c)
  }
  const dot = base.lastIndexOf('.')
  found.add(dot > 0 ? base.slice(dot) : dot === 0 ? base : '(none)')
  return [...found]
}

export function matchesExtension(filename: string, ext: string): boolean {
  const base = baseName(filename)
  return ext === '(none)' ? !base.includes('.') : base.endsWith(ext)
}

export const NOTES_CHIP = 'has:notes'

export function matchesChip(file: PrFile, key: string, noted: ReadonlyMap<string, number> = new Map()): boolean {
  if (key === NOTES_CHIP) return (noted.get(file.filename) ?? 0) > 0
  return key.startsWith('status:') ? file.status === key.slice(7) : matchesExtension(file.filename, key)
}
