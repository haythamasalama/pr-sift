import { matcher } from '@pr-sift/core'
import type { AutoApproveConfig, AutoApproveRule, Evaluation, PullFacts, RuleCheck } from '#shared/ipc'
import { DEFAULT_CONFIG, newRule } from '#shared/autoapprove'

export { DEFAULT_CONFIG, newRule }

const list = (v: unknown, max = 50, lower = false) =>
  Array.isArray(v)
    ? [
        ...new Set(
          v
            .map((x) => String(x).trim().slice(0, 200))
            .map((x) => (lower ? x.toLowerCase() : x))
            .filter(Boolean),
        ),
      ].slice(0, max)
    : []
const count = (v: unknown, max: number) => {
  if (v === null || v === undefined || v === '') return null
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : null
}

// Whatever the window sends is checked field by field; anything odd falls back to the safe default.
export function cleanConfig(input: unknown): AutoApproveConfig {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const rules = Array.isArray(raw.rules) ? raw.rules.slice(0, 50) : []
  const ids = new Set<string>()
  return {
    enabled: raw.enabled === true,
    dryRun: raw.dryRun !== false,
    intervalMinutes: Math.min(Math.max(count(raw.intervalMinutes, 1440) ?? DEFAULT_CONFIG.intervalMinutes, 2), 1440),
    rules: rules.flatMap((r, i) => {
      const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>
      let id = typeof o.id === 'string' && /^[\w-]{1,64}$/.test(o.id) ? o.id : `rule-${i + 1}`
      while (ids.has(id)) id += '-x'
      ids.add(id)
      const base = newRule(id)
      return [
        {
          ...base,
          name: typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 80) : `Rule ${i + 1}`,
          enabled: o.enabled !== false,
          repos: list(o.repos, 50, true),
          authors: list(o.authors, 50, true),
          excludeAuthors: list(o.excludeAuthors, 50, true),
          paths: list(o.paths),
          blockedPaths: list(o.blockedPaths),
          labels: list(o.labels),
          blockedLabels: list(o.blockedLabels),
          titleWords: list(o.titleWords),
          baseBranches: list(o.baseBranches),
          maxFiles: count(o.maxFiles, 100_000),
          maxLines: count(o.maxLines, 10_000_000),
          requireChecks: o.requireChecks !== false,
          requireMergeable: o.requireMergeable !== false,
          skipChangesRequested: o.skipChangesRequested !== false,
          minAgeMinutes: count(o.minAgeMinutes, 10_080) ?? 0,
          comment: typeof o.comment === 'string' ? o.comment.slice(0, 2000) : base.comment,
        },
      ]
    }),
  }
}

const repoMatches = (patterns: string[], owner: string, repo: string) => {
  const full = `${owner}/${repo}`.toLowerCase()
  return patterns.some((p) => p === full || (p.endsWith('/*') && p.slice(0, -2) === owner.toLowerCase()))
}
// GitHub's GraphQL names bots without the "[bot]" the website shows, so compare logins without it.
const person = (login: string) => login.toLowerCase().replace(/\[bot\]$/, '')
// A bare folder name such as "docs" or "app/Models" means everything inside it.
const expand = (globs: string[]) => globs.flatMap((g) => (/[*?]/.test(g) || /\.[^/]+$/.test(g) ? [g] : [g, `${g.replace(/\/+$/, '')}/**`]))
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// Every reason the rule does not match this pull request; an empty list means it matches.
export function checkRule(rule: AutoApproveRule, pull: PullFacts, now: number): string[] {
  const failed: string[] = []
  const author = person(pull.author)
  const labels = pull.labels.map((l) => l.toLowerCase())
  if (rule.repos.length && !repoMatches(rule.repos, pull.owner, pull.repo)) failed.push('Repository is not in the list')
  if (rule.authors.length && !rule.authors.some((a) => person(a) === author)) failed.push(`Author ${pull.author} is not in the list`)
  if (rule.excludeAuthors.some((a) => person(a) === author)) failed.push(`Author ${pull.author} is excluded`)
  if (rule.baseBranches.length && !rule.baseBranches.includes(pull.base)) failed.push(`Targets ${pull.base}, which is not allowed`)
  if (rule.labels.length && !rule.labels.some((l) => labels.includes(l.toLowerCase()))) failed.push('Has none of the needed labels')
  const blockedLabel = rule.blockedLabels.find((l) => labels.includes(l.toLowerCase()))
  if (blockedLabel) failed.push(`Has the label ${blockedLabel}`)
  if (rule.titleWords.length && !rule.titleWords.some((w) => pull.title.toLowerCase().includes(w.toLowerCase())))
    failed.push('Title has none of the words')
  if (rule.maxFiles !== null && pull.changedFiles > rule.maxFiles)
    failed.push(`Changes ${plural(pull.changedFiles, 'file')}, more than ${rule.maxFiles}`)
  const lines = pull.additions + pull.deletions
  if (rule.maxLines !== null && lines > rule.maxLines) failed.push(`Changes ${plural(lines, 'line')}, more than ${rule.maxLines}`)
  const fileRules = rule.paths.length || rule.blockedPaths.length
  if (fileRules && pull.files.length < pull.changedFiles) failed.push('Too many files to check every path')
  else {
    if (rule.paths.length) {
      const allowed = matcher(expand(rule.paths))
      const outside = pull.files.find((f) => !allowed(f))
      if (outside) failed.push(`Changes ${outside}, which no allowed path covers`)
    }
    if (rule.blockedPaths.length) {
      const blocked = matcher(expand(rule.blockedPaths))
      const hit = pull.files.find((f) => blocked(f))
      if (hit) failed.push(`Changes ${hit}, which is blocked`)
    }
  }
  if (rule.requireChecks && pull.checks !== 'SUCCESS')
    failed.push(pull.checks ? `Checks are ${pull.checks.toLowerCase()}` : 'Has no passing checks')
  if (rule.requireMergeable && pull.mergeable !== 'MERGEABLE')
    failed.push(pull.mergeable === 'CONFLICTING' ? 'Has merge conflicts' : 'GitHub has not worked out if it can merge yet')
  if (rule.skipChangesRequested && pull.changesRequested) failed.push('Someone asked for changes')
  const ageMinutes = (now - pull.pushedAt) / 60_000
  if (rule.minAgeMinutes && ageMinutes < rule.minAgeMinutes)
    failed.push(`Last push was ${Math.max(0, Math.floor(ageMinutes))} min ago; waiting for ${rule.minAgeMinutes}`)
  return failed
}

export function evaluate(config: AutoApproveConfig, pull: PullFacts, me: string, now = Date.now()): Evaluation {
  const ref = {
    owner: pull.owner,
    repo: pull.repo,
    number: pull.number,
    title: pull.title,
    url: pull.url,
    author: pull.author,
    headSha: pull.headSha,
    changedFiles: pull.changedFiles,
  }
  // These hold whatever the rules say.
  if (pull.draft) return { pull: ref, checks: [], blocked: 'It is a draft' }
  if (person(pull.author) === person(me)) return { pull: ref, checks: [], blocked: 'You opened it' }
  if (pull.myApprovedSha === pull.headSha) return { pull: ref, checks: [], blocked: 'You already approved this commit' }
  const checks: RuleCheck[] = config.rules
    .filter((r) => r.enabled)
    .map((r) => ({ rule: r.name, ruleId: r.id, failed: checkRule(r, pull, now) }))
  return { pull: ref, checks, matched: checks.find((c) => !c.failed.length)?.rule }
}
