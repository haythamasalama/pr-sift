import { stat } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import type { Project } from '#shared/ipc'
import { git } from '../exec'
import type { Store } from '../store'
import { findRepos } from '../worktrees/discover'
import { pickGithubRemote } from './remote'

const KEY = 'projects'

export interface ProjectDeps {
  store: Store
  roots: () => Promise<{ roots: string[]; depth: number }>
  pickFolder: () => Promise<string | null>
}

async function isRepo(path: string) {
  try {
    return (await stat(resolve(path, '.git'))).isDirectory()
  } catch {
    return false
  }
}

export class ProjectService {
  // Paths the window may add: ones found in the project folders or under a folder the person picked.
  private offered = new Set<string>()

  constructor(private readonly deps: ProjectDeps) {}

  async paths(): Promise<string[]> {
    return (await this.deps.store.getOne<string[]>(KEY)) ?? []
  }

  async has(path: string) {
    return (await this.paths()).includes(resolve(path))
  }

  async require(path: string) {
    const target = resolve(path)
    if (!(await this.has(target))) throw new Error('This folder is not one of your projects.')
    return target
  }

  async describe(path: string): Promise<Project> {
    const name = basename(path)
    if (!(await isRepo(path))) return { path, name, missing: true }
    const [remotes, head] = await Promise.all([git(path, ['remote', '-v']), git(path, ['symbolic-ref', '--quiet', '--short', 'HEAD'])])
    return {
      path,
      name,
      github: remotes.code === 0 ? pickGithubRemote(remotes.stdout) : undefined,
      branch: head.code === 0 ? head.stdout.trim() || undefined : undefined,
    }
  }

  async list(): Promise<Project[]> {
    const projects = await Promise.all((await this.paths()).map((p) => this.describe(p)))
    return projects.sort((a, b) => a.name.localeCompare(b.name))
  }

  async candidates(): Promise<string[]> {
    const { roots, depth } = await this.deps.roots()
    const added = new Set(await this.paths())
    const found = (await findRepos(roots, depth)).filter((p) => !added.has(p))
    for (const p of found) this.offered.add(p)
    return found
  }

  // A repository is added straight away; any other folder returns the repositories found inside it.
  async browse(): Promise<string[] | null> {
    const picked = await this.deps.pickFolder()
    if (!picked) return null
    const target = resolve(picked)
    const { depth } = await this.deps.roots()
    const found = (await isRepo(target)) ? [target] : await findRepos([target], depth)
    for (const p of found) this.offered.add(p)
    return found
  }

  async add(paths: string[]): Promise<Project[]> {
    const current = await this.paths()
    const next = [...current]
    for (const raw of paths) {
      const p = resolve(raw)
      if (!this.offered.has(p) || next.includes(p) || !(await isRepo(p))) continue
      next.push(p)
    }
    await this.deps.store.set({ [KEY]: next })
    return this.list()
  }

  async remove(path: string): Promise<Project[]> {
    const target = resolve(path)
    await this.deps.store.set({ [KEY]: (await this.paths()).filter((p) => p !== target) })
    return this.list()
  }
}
