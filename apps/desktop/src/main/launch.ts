import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import type { OpenResult, OpenTarget } from '#shared/ipc'
import { findProgram } from './paths'

interface Candidate {
  app: string
  file: string
  args: (path: string) => string[]
  // macOS app bundle that must exist for `open -a` candidates.
  bundle?: string
}

const MAC_APPS = (dir: string) => [`/Applications/${dir}`, `${process.env.HOME ?? ''}/Applications/${dir}`]

const EDITORS: Omit<Candidate, 'file'>[] = [
  { app: 'Cursor', args: (p) => [p] },
  { app: 'Visual Studio Code', args: (p) => [p] },
  { app: 'Zed', args: (p) => [p] },
  { app: 'WebStorm', args: (p) => [p] },
  { app: 'PhpStorm', args: (p) => [p] },
  { app: 'IntelliJ IDEA', args: (p) => [p] },
  { app: 'Sublime Text', args: (p) => [p] },
]
const CLI: Record<string, string> = {
  Cursor: 'cursor',
  'Visual Studio Code': 'code',
  Zed: 'zed',
  WebStorm: 'webstorm',
  PhpStorm: 'phpstorm',
  'IntelliJ IDEA': 'idea',
  'Sublime Text': 'subl',
}

function editors(platform: NodeJS.Platform, env: NodeJS.ProcessEnv): Candidate[] {
  const list: Candidate[] = []
  for (const e of EDITORS) {
    if (platform === 'darwin') {
      const bundle = MAC_APPS(`${e.app}.app`).find((p) => existsSync(p))
      if (bundle) list.push({ app: e.app, file: 'open', args: (p) => ['-a', bundle, p], bundle })
      continue
    }
    const file = findProgram(CLI[e.app]!, platform, env, existsSync)
    if (file) list.push({ app: e.app, file, args: e.args })
  }
  return list
}

function terminals(platform: NodeJS.Platform, env: NodeJS.ProcessEnv): Candidate[] {
  if (platform === 'darwin') {
    const list: Candidate[] = []
    for (const app of ['iTerm', 'Warp', 'Ghostty']) {
      const bundle = MAC_APPS(`${app}.app`).find((p) => existsSync(p))
      if (bundle) list.push({ app, file: 'open', args: (p) => ['-a', bundle, p] })
    }
    list.push({ app: 'Terminal', file: 'open', args: (p) => ['-a', 'Terminal', p] })
    return list
  }
  if (platform === 'win32') {
    const wt = findProgram('wt', platform, env, existsSync)
    const list: Candidate[] = []
    if (wt) list.push({ app: 'Windows Terminal', file: wt, args: (p) => ['-d', p] })
    list.push({ app: 'Command Prompt', file: 'cmd.exe', args: (p) => ['/c', 'start', '', '/d', p, 'cmd.exe'] })
    return list
  }
  const options: [string, string, (p: string) => string[]][] = [
    ['x-terminal-emulator', 'Terminal', (p) => ['--working-directory', p]],
    ['gnome-terminal', 'GNOME Terminal', (p) => ['--working-directory', p]],
    ['konsole', 'Konsole', (p) => ['--workdir', p]],
    ['xfce4-terminal', 'Xfce Terminal', (p) => ['--working-directory', p]],
    ['kitty', 'kitty', (p) => ['--directory', p]],
    ['alacritty', 'Alacritty', (p) => ['--working-directory', p]],
  ]
  return options.flatMap(([bin, app, args]) => {
    const file = findProgram(bin, platform, env, existsSync)
    return file ? [{ app, file, args }] : []
  })
}

export function candidates(target: OpenTarget, platform: NodeJS.Platform, env: NodeJS.ProcessEnv): Candidate[] {
  return target === 'editor' ? editors(platform, env) : terminals(platform, env)
}

// Starts the app detached, so it keeps running on its own and PR Sift never waits for it.
export function openIn(target: OpenTarget, path: string, platform: NodeJS.Platform, env: NodeJS.ProcessEnv): Promise<OpenResult> {
  const found = candidates(target, platform, env)[0]
  if (!found) {
    return Promise.resolve({
      ok: false,
      error:
        target === 'editor' ? 'No code editor was found. Install VS Code, Cursor, Zed or a JetBrains IDE.' : 'No terminal app was found.',
    })
  }
  return new Promise((done) => {
    try {
      const child = spawn(found.file, found.args(path), { cwd: path, detached: true, stdio: 'ignore', windowsHide: false })
      child.once('error', (e) => done({ ok: false, app: found.app, error: e.message }))
      child.once('spawn', () => {
        child.unref()
        done({ ok: true, app: found.app })
      })
    } catch (e) {
      done({ ok: false, app: found.app, error: e instanceof Error ? e.message : String(e) })
    }
  })
}
