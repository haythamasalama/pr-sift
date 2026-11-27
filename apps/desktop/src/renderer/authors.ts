import { shallowRef } from 'vue'
import { readCache, writeCache } from './cache'
import { graphql } from './github'
import { loginFromEmail } from './noreply'

// GitHub photos for the people behind git commits, found by their commit email.
// A GitHub noreply address names the account itself; any other email is looked up once in the repository's history.

const avatarUrl = (login: string, size = 32) => `https://avatars.githubusercontent.com/${encodeURIComponent(login)}?s=${size}`

type Found = Record<string, string | null>
const WEEK = 7 * 24 * 60 * 60 * 1000
// Email to photo URL, null when GitHub knows no account for it. Shared by every list.
export const avatars = shallowRef<Found>({})
const asking = new Set<string>()

// `people` are commit emails, each with a branch on GitHub whose last commit they made, when there is one.
export async function findAvatars(github: { owner: string; repo: string } | undefined, people: { email?: string; ref?: string }[]) {
  const refOf = new Map<string, string>()
  for (const p of people) if (p.email && p.ref && !refOf.has(p.email)) refOf.set(p.email, p.ref)
  const emails = people.map((p) => p.email)
  const key = github ? `authors:${github.owner}/${github.repo}`.toLowerCase() : ''
  const saved = key ? readCache<Found>(key) : undefined
  const fresh = !!saved && Date.now() - saved.at < WEEK
  const next: Found = { ...avatars.value, ...(fresh ? saved!.value : {}) }
  const unknown: string[] = []
  for (const email of new Set(emails.filter((e): e is string => !!e))) {
    if (email in next) continue
    const login = loginFromEmail(email)
    if (login) next[email] = avatarUrl(login)
    else if (!asking.has(email)) unknown.push(email)
  }
  avatars.value = next
  if (!github || !unknown.length) return
  // One request: for each email, the newest commit by it on the main branch, and the account behind that commit.
  const batch = unknown.slice(0, 30)
  batch.forEach((e) => asking.add(e))
  try {
    const fields = batch
      .map((_, i) => `a${i}: history(first: 1, author: { emails: [$e${i}] }) { nodes { author { user { login } } } }`)
      .join('\n')
    // Someone who never committed to the main branch is found through the last commit of their branch.
    const refs = batch
      .map((e, i) => (refOf.has(e) ? `b${i}: object(expression: $r${i}) { ... on Commit { author { email user { login } } } }` : ''))
      .join('\n')
    const vars = batch.map((e, i) => `$e${i}: String!${refOf.has(e) ? `, $r${i}: String!` : ''}`).join(', ')
    const data = await graphql<{
      repository: {
        defaultBranchRef: { target: Record<string, { nodes: { author: { user: { login: string } | null } | null }[] }> } | null
      } & Record<string, { author: { email: string; user: { login: string } | null } | null } | null>
    }>(
      `query($owner: String!, $name: String!, ${vars}) { repository(owner: $owner, name: $name) { defaultBranchRef { target { ... on Commit { ${fields} } } } ${refs} } }`,
      {
        owner: github.owner,
        name: github.repo,
        ...Object.fromEntries(batch.flatMap((e, i) => [[`e${i}`, e], ...(refOf.has(e) ? [[`r${i}`, refOf.get(e)!]] : [])])),
      },
    )
    const target = data.repository.defaultBranchRef?.target ?? {}
    const found: Found = {}
    batch.forEach((email, i) => {
      const tip = data.repository[`b${i}`]?.author
      const login = target[`a${i}`]?.nodes[0]?.author?.user?.login ?? (tip?.email.toLowerCase() === email ? tip.user?.login : undefined)
      found[email] = login ? avatarUrl(login) : null
    })
    avatars.value = { ...avatars.value, ...found }
    if (key) writeCache(key, { ...(fresh ? saved!.value : {}), ...found })
  } catch {
    // No photos this time; the initials stay.
  } finally {
    batch.forEach((e) => asking.delete(e))
  }
}
