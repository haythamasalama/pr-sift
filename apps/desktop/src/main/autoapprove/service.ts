import type { ApiRequest, ApiResponse, AutoApproveConfig, AutoApproveLogEntry, AutoApproveStatus, Evaluation, PullFacts } from '#shared/ipc'
import type { Store } from '../store'
import { cleanConfig, DEFAULT_CONFIG, evaluate } from './rules'

const CONFIG_KEY = 'autoApprove'
const LOG_KEY = 'autoApproveLog'
const LOG_LIMIT = 300

const QUERY = `query {
  viewer { login }
  search(query: "is:open is:pr review-requested:@me archived:false sort:updated-desc", type: ISSUE, first: 40) {
    nodes { ... on PullRequest {
      number title url isDraft updatedAt baseRefName headRefOid additions deletions changedFiles mergeable
      repository { name owner { login } }
      author { login }
      labels(first: 20) { nodes { name } }
      files(first: 100) { nodes { path } }
      latestReviews(first: 30) { nodes { state author { login } commit { oid } } }
      commits(last: 1) { nodes { commit { pushedDate committedDate statusCheckRollup { state } } } }
    } }
  }
}`

interface RawPull {
  number: number
  title: string
  url: string
  isDraft: boolean
  updatedAt: string
  baseRefName: string
  headRefOid: string
  additions: number
  deletions: number
  changedFiles: number
  mergeable?: PullFacts['mergeable']
  repository?: { name: string; owner: { login: string } }
  author: { login: string } | null
  labels: { nodes: { name: string }[] }
  files: { nodes: { path: string }[] } | null
  latestReviews: { nodes: { state: string; author: { login: string } | null; commit: { oid: string } | null }[] }
  commits: {
    nodes: { commit: { pushedDate: string | null; committedDate: string; statusCheckRollup: { state: PullFacts['checks'] } | null } }[]
  }
}

export function toFacts(p: RawPull, me: string): PullFacts {
  const last = p.commits.nodes[0]?.commit
  const mine = p.latestReviews.nodes.find((r) => r.author?.login.toLowerCase() === me.toLowerCase() && r.state === 'APPROVED')
  return {
    owner: p.repository!.owner.login,
    repo: p.repository!.name,
    number: p.number,
    title: p.title,
    url: p.url,
    author: p.author?.login ?? 'ghost',
    draft: p.isDraft,
    base: p.baseRefName,
    headSha: p.headRefOid,
    pushedAt: Date.parse(last?.pushedDate ?? last?.committedDate ?? p.updatedAt),
    labels: p.labels.nodes.map((l) => l.name),
    files: p.files?.nodes.map((f) => f.path) ?? [],
    changedFiles: p.changedFiles,
    additions: p.additions,
    deletions: p.deletions,
    checks: last?.statusCheckRollup?.state ?? undefined,
    mergeable: p.mergeable,
    changesRequested: p.latestReviews.nodes.some((r) => r.state === 'CHANGES_REQUESTED'),
    myApprovedSha: mine?.commit?.oid,
  }
}

export interface AutoApproveDeps {
  store: Store
  request: (req: ApiRequest) => Promise<ApiResponse>
  onChange: (status: AutoApproveStatus) => void
  now?: () => number
  setTimer?: (fn: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}

// Looks at the pull requests waiting for your review on a timer and approves the ones a rule allows.
export class AutoApproveService {
  private timer: unknown
  private running = false
  private lastRun?: number
  private nextRun?: number
  private lastError?: string
  // Commits already logged as "would approve", so a dry run doesn't repeat itself every round.
  private seen = new Set<string>()

  constructor(private readonly deps: AutoApproveDeps) {}

  private now() {
    return this.deps.now?.() ?? Date.now()
  }

  async config(): Promise<AutoApproveConfig> {
    return cleanConfig((await this.deps.store.getOne<AutoApproveConfig>(CONFIG_KEY)) ?? DEFAULT_CONFIG)
  }

  async log(): Promise<AutoApproveLogEntry[]> {
    return (await this.deps.store.getOne<AutoApproveLogEntry[]>(LOG_KEY)) ?? []
  }

  async status(): Promise<AutoApproveStatus> {
    return {
      config: await this.config(),
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      running: this.running,
      lastError: this.lastError,
      log: await this.log(),
    }
  }

  private async changed() {
    const status = await this.status()
    this.deps.onChange(status)
    return status
  }

  async save(input: unknown) {
    const config = cleanConfig(input)
    await this.deps.store.set({ [CONFIG_KEY]: config })
    this.seen.clear()
    await this.schedule()
    return this.changed()
  }

  async clearLog() {
    await this.deps.store.set({ [LOG_KEY]: [] })
    this.seen.clear()
    return this.changed()
  }

  async start() {
    await this.schedule()
  }

  stop() {
    if (this.timer !== undefined) (this.deps.clearTimer ?? clearTimeout)(this.timer as never)
    this.timer = undefined
    this.nextRun = undefined
  }

  private async schedule() {
    this.stop()
    const config = await this.config()
    if (!config.enabled || !config.rules.some((r) => r.enabled)) return
    const ms = config.intervalMinutes * 60_000
    this.nextRun = this.now() + ms
    this.timer = (this.deps.setTimer ?? setTimeout)(() => void this.run().catch(() => undefined), ms)
  }

  private async fetch(): Promise<{ me: string; pulls: PullFacts[] }> {
    const res = await this.deps.request({ type: 'gh', path: '/graphql', method: 'POST', body: { query: QUERY } })
    const body = res.data as {
      data?: { viewer: { login: string }; search: { nodes: (RawPull | null)[] } }
      message?: string
      errors?: { message: string }[]
    }
    if (!res.ok || !body?.data) throw new Error(body?.message ?? body?.errors?.[0]?.message ?? `GitHub answered ${res.status}.`)
    const me = body.data.viewer.login
    return { me, pulls: body.data.search.nodes.filter((n): n is RawPull => !!n?.repository).map((n) => toFacts(n, me)) }
  }

  // What every rule says about every pull request waiting for you. Approves nothing.
  async preview(): Promise<Evaluation[]> {
    const config = await this.config()
    const { me, pulls } = await this.fetch()
    return pulls.map((p) => evaluate(config, p, me, this.now()))
  }

  async run(): Promise<AutoApproveStatus> {
    if (this.running) return this.status()
    this.running = true
    this.lastError = undefined
    await this.changed()
    try {
      const config = await this.config()
      const { me, pulls } = await this.fetch()
      const entries: AutoApproveLogEntry[] = []
      for (const pull of pulls) {
        const result = evaluate(config, pull, me, this.now())
        if (!result.matched) continue
        const ruleId = result.checks.find((c) => !c.failed.length)!.ruleId
        const rule = config.rules.find((r) => r.id === ruleId)!
        const key = `${pull.url}@${pull.headSha}`
        const entry = { id: `${this.now()}-${entries.length}`, at: this.now(), rule: rule.name, pull: result.pull }
        if (config.dryRun) {
          if (this.seen.has(key)) continue
          this.seen.add(key)
          entries.push({ ...entry, action: 'would-approve' })
          continue
        }
        // Approving a named commit means a push that lands meanwhile is never approved by accident.
        const res = await this.deps.request({
          type: 'gh',
          path: `/repos/${encodeURIComponent(pull.owner)}/${encodeURIComponent(pull.repo)}/pulls/${pull.number}/reviews`,
          method: 'POST',
          body: { event: 'APPROVE', commit_id: pull.headSha, ...(rule.comment.trim() ? { body: rule.comment.trim() } : {}) },
        })
        const error = res.ok ? undefined : ((res.data as { message?: string } | null)?.message ?? `GitHub answered ${res.status}.`)
        entries.push({ ...entry, action: res.ok ? 'approved' : 'failed', error })
      }
      if (entries.length) await this.deps.store.set({ [LOG_KEY]: [...entries.reverse(), ...(await this.log())].slice(0, LOG_LIMIT) })
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e)
    } finally {
      this.running = false
      this.lastRun = this.now()
      await this.schedule()
    }
    return this.changed()
  }
}
