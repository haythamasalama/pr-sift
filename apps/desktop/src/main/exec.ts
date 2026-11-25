import { execFile } from 'node:child_process'

export interface RunResult {
  code: number
  stdout: string
  stderr: string
}

// Runs a program without a shell, so paths with spaces or quotes are never interpreted.
export function run(file: string, args: string[], options: { cwd?: string; input?: string; timeout?: number } = {}): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = execFile(
      file,
      args,
      { cwd: options.cwd, timeout: options.timeout ?? 60_000, maxBuffer: 64 * 1024 * 1024, windowsHide: true, encoding: 'utf8' },
      (error, stdout, stderr) => {
        const code = error ? (typeof error.code === 'number' ? error.code : -1) : 0
        resolve({ code, stdout: String(stdout), stderr: String(stderr || (error && code === -1 ? error.message : '')) })
      },
    )
    if (options.input !== undefined) {
      child.stdin?.end(options.input)
    }
  })
}

export const git = (cwd: string, args: string[], input?: string) => run('git', args, { cwd, input })
