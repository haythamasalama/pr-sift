import { graphql } from './github'

// What a repository offers as suggestions while writing a rule: its labels, the people on it, its top folders.
export interface RepoHints {
  labels: { name: string; color: string }[]
  people: { login: string; name?: string | null; avatarUrl?: string }[]
  folders: string[]
  defaultBranch?: string
}

const QUERY = `query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef { name }
    labels(first: 100, orderBy: { field: NAME, direction: ASC }) { nodes { name color } }
    mentionableUsers(first: 100) { nodes { login name avatarUrl } }
    object(expression: "HEAD:") { ... on Tree { entries { name type } } }
  }
}`

interface Raw {
  repository: {
    defaultBranchRef: { name: string } | null
    labels: { nodes: { name: string; color: string }[] }
    mentionableUsers: { nodes: { login: string; name: string | null; avatarUrl: string }[] }
    object: { entries?: { name: string; type: string }[] } | null
  } | null
}

const cache = new Map<string, Promise<RepoHints>>()

export function repoHints(full: string): Promise<RepoHints> {
  const key = full.toLowerCase()
  const hit = cache.get(key)
  if (hit) return hit
  const [owner, name] = full.split('/')
  const job = graphql<Raw>(QUERY, { owner, name })
    .then((d) => {
      const r = d.repository
      return {
        labels: r?.labels.nodes ?? [],
        people: r?.mentionableUsers.nodes ?? [],
        folders: (r?.object?.entries ?? [])
          .filter((e) => e.type === 'tree' && !e.name.startsWith('.git') && e.name !== 'node_modules')
          .map((e) => `${e.name}/**`),
        defaultBranch: r?.defaultBranchRef?.name,
      }
    })
    .catch(() => {
      cache.delete(key)
      return { labels: [], people: [], folders: [] }
    })
  cache.set(key, job)
  return job
}

// Merged hints for several repositories, each list without repeats.
export async function hintsFor(repos: string[], limit = 4): Promise<RepoHints> {
  const all = await Promise.all(repos.slice(0, limit).map(repoHints))
  const uniq = <T>(list: T[], key: (x: T) => string) => [...new Map(list.map((x) => [key(x).toLowerCase(), x])).values()]
  return {
    labels: uniq(
      all.flatMap((h) => h.labels),
      (l) => l.name,
    ),
    people: uniq(
      all.flatMap((h) => h.people),
      (p) => p.login,
    ),
    folders: uniq(
      all.flatMap((h) => h.folders),
      (f) => f,
    ),
    defaultBranch: all.find((h) => h.defaultBranch)?.defaultBranch,
  }
}

// Patterns that are useful in most repositories, offered next to the repository's own folders.
export const COMMON_PATHS = [
  '**/*.md',
  'docs/**',
  '**/*.lock',
  '**/package.json',
  '**/composer.json',
  '.github/**',
  '**/migrations/**',
  'tests/**',
]
export const BOTS = ['dependabot[bot]', 'renovate[bot]']

export interface Person {
  login: string
  name?: string | null
  avatarUrl?: string
}

const SEARCH = `query($q: String!) {
  search(query: $q, type: USER, first: 8) { nodes { ... on User { login name avatarUrl } ... on Organization { login name avatarUrl } } }
}`
const searches = new Map<string, Promise<Person[]>>()

// GitHub people whose login or name starts with what was typed, for names that are not on your repositories.
export function searchPeople(text: string): Promise<Person[]> {
  const q = text.trim().toLowerCase()
  if (q.length < 2) return Promise.resolve([])
  const hit = searches.get(q)
  if (hit) return hit
  const job = graphql<{ search: { nodes: (Person | Record<string, never>)[] } }>(SEARCH, { q: `${q} in:login in:name` })
    .then((d) => d.search.nodes.filter((n): n is Person => 'login' in n && !!n.login))
    .catch(() => {
      searches.delete(q)
      return []
    })
  searches.set(q, job)
  return job
}
