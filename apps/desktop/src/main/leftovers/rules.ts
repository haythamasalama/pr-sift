import { join } from 'node:path'
import type { LeftoverKind } from '#shared/ipc'

export interface FolderRule {
  name: string
  kind: LeftoverKind
  label: string
  rebuild: string
  // A file that must sit beside the folder, so `target` only matches a Rust crate and `vendor` only a PHP project.
  beside?: string[]
}

export const FOLDER_RULES: FolderRule[] = [
  { name: 'node_modules', kind: 'dependencies', label: 'Node packages', rebuild: 'npm, pnpm or yarn install' },
  { name: '.venv', kind: 'dependencies', label: 'Python virtual environment', rebuild: 'python -m venv .venv, then pip install' },
  { name: 'venv', kind: 'dependencies', label: 'Python virtual environment', rebuild: 'python -m venv venv, then pip install' },
  { name: 'Pods', kind: 'dependencies', label: 'CocoaPods', rebuild: 'pod install', beside: ['Podfile'] },
  { name: 'vendor', kind: 'dependencies', label: 'Composer packages', rebuild: 'composer install', beside: ['composer.json'] },
  { name: '.gradle', kind: 'dependencies', label: 'Gradle project cache', rebuild: 'the next Gradle build' },
  { name: 'dist', kind: 'build', label: 'Build output', rebuild: 'the project’s build' },
  { name: 'build', kind: 'build', label: 'Build output', rebuild: 'the project’s build' },
  { name: '.next', kind: 'build', label: 'Next.js build', rebuild: 'next build or next dev' },
  { name: '.nuxt', kind: 'build', label: 'Nuxt build', rebuild: 'nuxt build or nuxt dev' },
  { name: '.output', kind: 'build', label: 'Nitro output', rebuild: 'the project’s build' },
  { name: '.turbo', kind: 'build', label: 'Turborepo cache', rebuild: 'the next turbo run' },
  { name: '.parcel-cache', kind: 'build', label: 'Parcel cache', rebuild: 'the next Parcel build' },
  { name: '.svelte-kit', kind: 'build', label: 'SvelteKit build', rebuild: 'the next SvelteKit build' },
  { name: 'coverage', kind: 'build', label: 'Test coverage report', rebuild: 'the next test run with coverage' },
  { name: 'target', kind: 'build', label: 'Rust build', rebuild: 'cargo build', beside: ['Cargo.toml'] },
  { name: 'DerivedData', kind: 'build', label: 'Xcode build', rebuild: 'the next Xcode build' },
  { name: '__pycache__', kind: 'build', label: 'Python bytecode', rebuild: 'running the code again' },
  { name: '.pytest_cache', kind: 'cache', label: 'pytest cache', rebuild: 'the next pytest run' },
  { name: '.mypy_cache', kind: 'cache', label: 'mypy cache', rebuild: 'the next mypy run' },
]

export const RULE_BY_NAME = new Map(FOLDER_RULES.map((r) => [r.name, r]))

export const MEDIA_EXTENSIONS = new Set([
  '.mov',
  '.mp4',
  '.m4v',
  '.mkv',
  '.avi',
  '.webm',
  '.wav',
  '.aif',
  '.aiff',
  '.flac',
  '.mp3',
  '.psd',
  '.psb',
  '.sketch',
  '.fig',
  '.ai',
  '.tif',
  '.tiff',
  '.heic',
  '.raw',
  '.cr2',
  '.nef',
  '.dng',
])

export const MEDIA_MIN_BYTES = 100 * 1024 * 1024
export const FOLDER_MIN_BYTES = 50 * 1024 * 1024

export interface CacheLocation {
  path: string
  label: string
  rebuild: string
}

// Tool caches outside any project, per system. Each refills itself the next time the tool needs it.
export function toolCaches(platform: NodeJS.Platform, home: string, env: NodeJS.ProcessEnv): CacheLocation[] {
  if (platform === 'darwin') {
    return [
      { path: join(home, 'Library/Developer/Xcode/DerivedData'), label: 'Xcode build data', rebuild: 'the next Xcode build' },
      { path: join(home, 'Library/Caches/Homebrew'), label: 'Homebrew downloads', rebuild: 'the next brew install' },
      { path: join(home, 'Library/Caches/pip'), label: 'pip cache', rebuild: 'the next pip install' },
      { path: join(home, 'Library/Caches/CocoaPods'), label: 'CocoaPods cache', rebuild: 'the next pod install' },
      { path: join(home, '.npm/_cacache'), label: 'npm cache', rebuild: 'the next npm install' },
      { path: join(home, '.gradle/caches'), label: 'Gradle cache', rebuild: 'the next Gradle build' },
      { path: join(home, 'Library/Caches/Yarn'), label: 'Yarn cache', rebuild: 'the next yarn install' },
    ]
  }
  if (platform === 'win32') {
    const local = env.LOCALAPPDATA ?? join(home, 'AppData', 'Local')
    return [
      { path: join(local, 'npm-cache', '_cacache'), label: 'npm cache', rebuild: 'the next npm install' },
      { path: join(local, 'pip', 'Cache'), label: 'pip cache', rebuild: 'the next pip install' },
      { path: join(local, 'Yarn', 'Cache'), label: 'Yarn cache', rebuild: 'the next yarn install' },
      { path: join(home, '.gradle', 'caches'), label: 'Gradle cache', rebuild: 'the next Gradle build' },
    ]
  }
  const cache = env.XDG_CACHE_HOME ?? join(home, '.cache')
  return [
    { path: join(cache, 'pip'), label: 'pip cache', rebuild: 'the next pip install' },
    { path: join(cache, 'yarn'), label: 'Yarn cache', rebuild: 'the next yarn install' },
    { path: join(home, '.npm/_cacache'), label: 'npm cache', rebuild: 'the next npm install' },
    { path: join(home, '.gradle/caches'), label: 'Gradle cache', rebuild: 'the next Gradle build' },
  ]
}
