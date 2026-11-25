import { posix, win32 } from 'node:path'

const pathFor = (platform: NodeJS.Platform) => (platform === 'win32' ? win32 : posix)

// Apps opened from the Dock, Start menu or a launcher don't get the shell's PATH, so tools installed with Homebrew,
// winget or a package manager would not be found. These are the usual places, added after whatever PATH already holds.
export function extraPathDirs(platform: NodeJS.Platform, env: NodeJS.ProcessEnv, home: string): string[] {
  const { join } = pathFor(platform)
  if (platform === 'darwin') return ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', join(home, '.local/bin')]
  if (platform === 'win32') {
    const dirs = [
      env.ProgramFiles && join(env.ProgramFiles, 'GitHub CLI'),
      env.ProgramFiles && join(env.ProgramFiles, 'Git', 'cmd'),
      env.LOCALAPPDATA && join(env.LOCALAPPDATA, 'Programs', 'GitHub CLI'),
      env.LOCALAPPDATA && join(env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links'),
    ]
    return dirs.filter((d): d is string => Boolean(d))
  }
  return ['/usr/local/bin', '/usr/bin', '/home/linuxbrew/.linuxbrew/bin', join(home, '.local/bin'), '/snap/bin']
}

export function withExtraPath(platform: NodeJS.Platform, env: NodeJS.ProcessEnv, home: string): string {
  const { delimiter } = pathFor(platform)
  const key = pathKey(platform, env)
  const current = (env[key] ?? '').split(delimiter).filter(Boolean)
  const added = extraPathDirs(platform, env, home).filter((d) => !current.includes(d))
  return [...current, ...added].join(delimiter)
}

export function pathKey(platform: NodeJS.Platform, env: NodeJS.ProcessEnv): string {
  return platform === 'win32' ? (Object.keys(env).find((k) => k.toLowerCase() === 'path') ?? 'Path') : 'PATH'
}

export function findProgram(
  name: string,
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  exists: (path: string) => boolean,
): string | null {
  const { delimiter, join } = pathFor(platform)
  const dirs = (env[pathKey(platform, env)] ?? '').split(delimiter).filter(Boolean)
  const file = platform === 'win32' ? `${name}.exe` : name
  for (const dir of dirs) {
    const candidate = join(dir, file)
    if (exists(candidate)) return candidate
  }
  return null
}
