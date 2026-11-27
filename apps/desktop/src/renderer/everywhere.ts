import { computed, shallowRef } from 'vue'
import type { Branch, Project, Repo } from '#shared/ipc'
import { bridge } from './bridge'
import { readCache, writeCache } from './cache'
import { errorText } from './format'
import { loadRepo, type RepoActivity } from './github'
import { isStale } from './useLive'

// What every project holds, for the All projects pages and their counts in the sidebar.
// Each part reads the same saved copies a project page writes, so the numbers show at once and agree with it.

export const repoKey = (gh: { owner: string; repo: string }) => `repo:${gh.owner}/${gh.repo}`.toLowerCase()

// One entry per GitHub repository, even when two projects are folders of the same one.
export function githubProjects(projects: Project[]) {
  const seen = new Map<string, Project>()
  for (const p of projects) if (p.github && !p.missing && !seen.has(repoKey(p.github))) seen.set(repoKey(p.github), p)
  return [...seen.values()]
}

const activity = shallowRef<Record<string, RepoActivity>>({})
const pullsLoading = shallowRef(false)
const pullErrors = shallowRef<string[]>([])
const pullsAt = shallowRef<number | null>(null)

function seedPulls(projects: Project[]) {
  const next = { ...activity.value }
  let oldest: number | null = null
  for (const p of githubProjects(projects)) {
    const key = repoKey(p.github!)
    const saved = readCache<RepoActivity>(key)
    if (saved) {
      next[key] = saved.value
      oldest = oldest === null ? saved.at : Math.min(oldest, saved.at)
    }
  }
  activity.value = next
  if (oldest !== null && pullsAt.value === null) pullsAt.value = oldest
}

// Asks GitHub for every repository whose copy is out of date, a few at a time.
async function loadPulls(projects: Project[], force = false) {
  seedPulls(projects)
  if (pullsLoading.value) return
  const todo = githubProjects(projects).filter((p) => force || isStale(readCache(repoKey(p.github!))?.at))
  if (!todo.length) return
  pullsLoading.value = true
  const failed: string[] = []
  const queue = [...todo]
  const worker = async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      const gh = p.github!
      try {
        const entry = writeCache(repoKey(gh), await loadRepo(gh.owner, gh.repo))
        activity.value = { ...activity.value, [repoKey(gh)]: entry.value }
      } catch (e) {
        failed.push(`${gh.owner}/${gh.repo}: ${errorText(e)}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, todo.length) }, worker))
  pullErrors.value = failed
  pullsAt.value = Date.now()
  pullsLoading.value = false
}

// Folders of the same repository share its branches, so each repository is counted once.
export function branchProjects(projects: Project[]) {
  return [...githubProjects(projects), ...projects.filter((p) => !p.github && !p.missing)]
}
const branchCounts = shallowRef<Record<string, number>>({})
function seedBranches(all: Project[]) {
  const projects = branchProjects(all)
  branchCounts.value = Object.fromEntries(
    projects.flatMap((p) => {
      const saved = readCache<Branch[]>(`branches:${p.path}`)?.value
      return saved ? [[p.path, saved.length]] : []
    }),
  )
}
// Branches are on this computer, so counting them is quick.
async function countBranches(all: Project[]) {
  seedBranches(all)
  await Promise.all(
    branchProjects(all).map(async (p) => {
      try {
        const list = writeCache(`branches:${p.path}`, await bridge.invoke('branches:list', p.path)).value
        branchCounts.value = { ...branchCounts.value, [p.path]: list.length }
      } catch {
        // Not a repository any more; it simply adds nothing.
      }
    }),
  )
}

const worktreeCount = shallowRef<number | undefined>(readCache<Repo[]>('worktrees:all')?.value.reduce(linkedIn, 0))
function linkedIn(sum: number, r: Repo) {
  return sum + r.worktrees.filter((w) => !w.main).length
}
async function countWorktrees() {
  try {
    const repos = writeCache('worktrees:all', await bridge.invoke('worktrees:scan')).value
    worktreeCount.value = repos.reduce(linkedIn, 0)
  } catch {
    // The count stays as it was.
  }
}

export function useEverywhere() {
  const pulls = computed(() => Object.values(activity.value).flatMap((a) => a.pulls))
  return {
    activity,
    pulls,
    pullsLoading,
    pullErrors,
    pullsAt,
    loadPulls,
    seedPulls,
    branchCounts,
    branchTotal: computed(() => {
      const values = Object.values(branchCounts.value)
      return values.length ? values.reduce((a, b) => a + b, 0) : undefined
    }),
    countBranches,
    seedBranches,
    worktreeCount,
    countWorktrees,
    // Sets the worktree count from a page that has just looked.
    setWorktreeCount: (n: number) => (worktreeCount.value = n),
  }
}
