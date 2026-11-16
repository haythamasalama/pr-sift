export type MergeMethod = 'squash' | 'merge' | 'rebase'

export interface Person {
  name: string
  email: string
}

export interface CommitSummary {
  message: string
  author: Person & { login?: string }
}

export type SquashTitleMode = 'PR_TITLE' | 'COMMIT_OR_PR_TITLE'
export type SquashMessageMode = 'PR_BODY' | 'COMMIT_MESSAGES' | 'BLANK'

export type MergeReadiness = 'ready' | 'checks' | 'blocked' | 'behind' | 'conflicts' | 'draft' | 'unknown'

const READINESS: Record<string, MergeReadiness> = {
  clean: 'ready',
  has_hooks: 'ready',
  unstable: 'checks',
  blocked: 'blocked',
  behind: 'behind',
  dirty: 'conflicts',
  draft: 'draft',
}

export const mergeReadiness = (state: string | undefined): MergeReadiness => READINESS[state ?? ''] ?? 'unknown'

export const DEFAULT_REMOVED_CO_AUTHORS = [
  'claude',
  'anthropic.com',
  'openai.com',
  'chatgpt',
  'codex',
  'gemini',
  'copilot',
  'cursor',
  'google-labs-jules',
  'devin-ai',
  'aider.chat',
]

const TRAILER = /^co-authored-by:\s*(.*?)\s*<([^<>]+)>\s*$/i

export const formatPerson = (person: Person) => `${person.name} <${person.email}>`

export function parsePerson(value: string): Person | null {
  const match = /^\s*(.*?)\s*<([^<>\s]+@[^<>\s]+)>\s*$/.exec(value)
  return match ? { name: match[1]!, email: match[2]! } : null
}

export function stripCoAuthors(message: string): { text: string; coAuthors: Person[] } {
  const coAuthors: Person[] = []
  const kept: string[] = []
  for (const line of message.split('\n')) {
    const match = TRAILER.exec(line.trim())
    if (match) coAuthors.push({ name: match[1]!, email: match[2]! })
    else kept.push(line)
  }
  const text = kept
    .join('\n')
    .replace(/\n-{3,}\s*$/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { text, coAuthors }
}

function unique(people: Person[]): Person[] {
  const seen = new Set<string>()
  return people.filter((p) => {
    const key = p.email.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function coAuthorsOf(commits: CommitSummary[], prAuthor: string | undefined): Person[] {
  const people: Person[] = []
  for (const c of commits) {
    if (!prAuthor || c.author.login?.toLowerCase() !== prAuthor.toLowerCase()) people.push({ name: c.author.name, email: c.author.email })
    people.push(...stripCoAuthors(c.message).coAuthors)
  }
  return unique(people)
}

export function isRemovedCoAuthor(person: Person, patterns: string[]): boolean {
  const id = formatPerson(person).toLowerCase()
  return patterns.some((p) => {
    const pattern = p.trim().toLowerCase()
    return pattern !== '' && id.includes(pattern)
  })
}

const subjectOf = (message: string) => message.split('\n')[0]!.trim()
const bodyOf = (message: string) => message.split('\n').slice(1).join('\n').trim()

export function defaultSquashTitle(
  prTitle: string,
  number: number,
  commits: CommitSummary[],
  mode: SquashTitleMode = 'COMMIT_OR_PR_TITLE',
) {
  const title = mode === 'COMMIT_OR_PR_TITLE' && commits.length === 1 ? subjectOf(commits[0]!.message) : prTitle
  return `${title} (#${number})`
}

export function defaultSquashBody(commits: CommitSummary[], prBody: string, mode: SquashMessageMode = 'COMMIT_MESSAGES'): string {
  if (mode === 'BLANK') return ''
  if (mode === 'PR_BODY') return stripCoAuthors(prBody).text
  if (commits.length === 1) return stripCoAuthors(bodyOf(commits[0]!.message)).text
  return commits
    .map((c) => {
      const body = stripCoAuthors(bodyOf(c.message)).text
      return body ? `* ${subjectOf(c.message)}\n\n${body}` : `* ${subjectOf(c.message)}`
    })
    .join('\n\n')
}

export function withCoAuthors(body: string, people: Person[]): string {
  const trailers = unique(people).map((p) => `Co-authored-by: ${formatPerson(p)}`)
  return [body.trim(), trailers.join('\n')].filter(Boolean).join('\n\n')
}
