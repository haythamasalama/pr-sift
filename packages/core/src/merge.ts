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

// Exact identities rather than words like "claude", which also match people with that name.
export const DEFAULT_REMOVED_CO_AUTHORS = [
  '@anthropic.com',
  '+claude[bot]@',
  '@openai.com',
  'chatgpt-codex-connector',
  '+copilot@',
  'copilot-swe-agent',
  'gemini-code-assist',
  'google-labs-jules',
  '@cursor.com',
  'devin-ai-integration',
  '@aider.chat',
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

const emailOf = (person: Person) => person.email.trim().toLowerCase()

// GitHub has no login for commits made with an email it does not know, so the author's own commits are also matched by
// the names and emails on their linked commits and by their noreply address.
function byPrAuthor(commits: CommitSummary[], prAuthor: string | undefined) {
  const login = prAuthor?.toLowerCase()
  if (!login) return () => false
  const own = commits.filter((c) => c.author.login?.toLowerCase() === login).map((c) => c.author)
  const emails = new Set(own.map(emailOf))
  const names = new Set(own.map((a) => a.name.trim().toLowerCase()))
  return (author: CommitSummary['author']) => {
    if (author.login) return author.login.toLowerCase() === login
    const email = emailOf(author)
    return (
      emails.has(email) ||
      names.has(author.name.trim().toLowerCase()) ||
      email === `${login}@users.noreply.github.com` ||
      email.endsWith(`+${login}@users.noreply.github.com`)
    )
  }
}

export function coAuthorsOf(commits: CommitSummary[], prAuthor: string | undefined): Person[] {
  const isPrAuthor = byPrAuthor(commits, prAuthor)
  const people: Person[] = []
  for (const c of commits) {
    if (!isPrAuthor(c.author)) people.push({ name: c.author.name, email: c.author.email })
    people.push(...stripCoAuthors(c.message).coAuthors)
  }
  return unique(people.filter((p) => p.email.trim()))
}

export function isRemovedCoAuthor(person: Person, patterns: string[]): boolean {
  const id = formatPerson(person).toLowerCase()
  return patterns.some((p) => {
    const pattern = p.trim().toLowerCase()
    return pattern !== '' && id.includes(pattern)
  })
}

export function keepsCoAuthor(person: Person, removed: string[], kept: string[]): boolean {
  const email = emailOf(person)
  return kept.some((value) => value.trim().toLowerCase() === email) || !isRemovedCoAuthor(person, removed)
}

// Unchecking someone adds their email to the removed list. Checking someone a broader pattern removes adds them to the
// kept list, so the choice sticks without dropping the pattern for everyone else.
export function rememberCoAuthors(
  choices: { person: Person; keep: boolean }[],
  removed: string[],
  kept: string[],
): { removed: string[]; kept: string[] } {
  let nextRemoved = [...removed]
  let nextKept = [...kept]
  for (const { person, keep } of choices) {
    const email = emailOf(person)
    const same = (value: string) => value.trim().toLowerCase() === email
    if (keep) {
      nextRemoved = nextRemoved.filter((value) => !same(value))
      if (isRemovedCoAuthor(person, nextRemoved) && !nextKept.some(same)) nextKept.push(email)
    } else {
      nextKept = nextKept.filter((value) => !same(value))
      if (!isRemovedCoAuthor(person, nextRemoved)) nextRemoved.push(email)
    }
  }
  return { removed: nextRemoved, kept: nextKept }
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

export const MERGE_METHODS: MergeMethod[] = ['squash', 'merge', 'rebase']

export const MERGE_ACTIONS: Record<MergeMethod, string> = {
  squash: 'Squash and merge',
  merge: 'Merge pull request',
  rebase: 'Rebase and merge',
}

export const chooseMergeMethod = (wanted: MergeMethod, allowed: Record<MergeMethod, boolean>): MergeMethod =>
  allowed[wanted] ? wanted : (MERGE_METHODS.find((m) => allowed[m]) ?? 'merge')

export interface MergeSource {
  title: string
  body: string
  headLabel: string
  commits: CommitSummary[]
  squashTitle?: SquashTitleMode
  squashMessage?: SquashMessageMode
}

// A rebase keeps every commit as it is, so it has no message of its own.
export function defaultMergeMessage(method: MergeMethod, number: number, source: MergeSource): { title: string; body: string } {
  if (method === 'squash')
    return {
      title: defaultSquashTitle(source.title, number, source.commits, source.squashTitle),
      body: defaultSquashBody(source.commits, source.body, source.squashMessage),
    }
  if (method === 'merge') return { title: `Merge pull request #${number} from ${source.headLabel}`, body: source.title }
  return { title: '', body: '' }
}

export interface CoAuthorRules {
  leaveOut: boolean
  removed: string[]
  kept: string[]
}

export interface CoAuthorChoice {
  person: Person
  keep: boolean
}

export const coAuthorChoices = (commits: CommitSummary[], prAuthor: string | undefined, rules: CoAuthorRules): CoAuthorChoice[] =>
  coAuthorsOf(commits, prAuthor).map((person) => ({
    person,
    keep: !rules.leaveOut || keepsCoAuthor(person, rules.removed, rules.kept),
  }))

export const mergeCommitMessage = (method: MergeMethod, body: string, choices: CoAuthorChoice[]): string =>
  method === 'squash'
    ? withCoAuthors(
        body,
        choices.filter((c) => c.keep).map((c) => c.person),
      )
    : body.trim()
