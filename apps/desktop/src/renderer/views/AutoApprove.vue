<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, shallowRef } from 'vue'
import { BadgeCheck, ChevronDown, CircleAlert, Copy, FlaskConical, Play, Plus, Save, Trash2, Undo2 } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { AutoApproveConfig, AutoApproveRule, AutoApproveStatus, Evaluation } from '#shared/ipc'
import { newRule, TEMPLATES } from '#shared/autoapprove'
import { bridge } from '~/bridge'
import { errorText, formatAgo } from '~/format'
import { openReview } from '~/navigation'
import { useProjects } from '~/useProjects'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import PageHeader from '~/components/PageHeader.vue'
import TagInput from '~/components/TagInput.vue'

const { projects } = useProjects()
const status = shallowRef<AutoApproveStatus | null>(null)
const draft = reactive<AutoApproveConfig>({ enabled: false, dryRun: true, intervalMinutes: 10, rules: [] })
const saved = shallowRef('')
const open = reactive(new Set<string>())
const error = shallowRef('')
const savedNote = shallowRef('')
const preview = shallowRef<Evaluation[] | null>(null)
const testing = shallowRef(false)
const goingLive = shallowRef(false)
const showTemplates = shallowRef(false)

const dirty = computed(() => JSON.stringify(draft) !== saved.value)
const INTERVALS = [5, 10, 15, 30, 60]
const projectRepos = computed(() =>
  [...new Set((projects.value ?? []).flatMap((p) => (p.github ? [`${p.github.owner}/${p.github.repo}`.toLowerCase()] : [])))].sort(),
)

const mode = computed(() => {
  const c = status.value?.config
  if (!c?.enabled) return { text: 'Off', tone: '' }
  if (!c.rules.some((r) => r.enabled)) return { text: 'On, but no rule is turned on', tone: 'text-attention' }
  return c.dryRun
    ? { text: 'Dry run: nothing is approved, the log shows what would be', tone: 'text-emphasis' }
    : { text: 'Approving for real', tone: 'text-success' }
})
const description = computed(() => {
  const s = status.value
  if (!s) return 'Approve pull requests waiting for your review when every condition of a rule holds.'
  const parts = [mode.value.text]
  if (s.lastRun) parts.push(`last checked ${formatAgo(s.lastRun)}`)
  if (s.nextRun) parts.push(`next check in ${Math.max(1, Math.round((s.nextRun - Date.now()) / 60_000))} min`)
  return parts.join(' · ')
})

function load(next: AutoApproveStatus) {
  status.value = next
  if (!dirty.value || !saved.value) {
    Object.assign(draft, structuredClone(next.config))
    saved.value = JSON.stringify(draft)
  }
}

const id = () => `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
function addRule(template?: Partial<AutoApproveRule>) {
  const rule = { ...newRule(id()), ...structuredClone(template ?? {}) }
  draft.rules.push(rule)
  open.add(rule.id)
  showTemplates.value = false
}
function duplicate(rule: AutoApproveRule) {
  const copy = { ...structuredClone(rule), id: id(), name: `${rule.name} (copy)` }
  draft.rules.splice(draft.rules.indexOf(rule) + 1, 0, copy)
  open.add(copy.id)
}
const removeRule = (rule: AutoApproveRule) => draft.rules.splice(draft.rules.indexOf(rule), 1)
const toggleOpen = (rule: AutoApproveRule) => (open.has(rule.id) ? open.delete(rule.id) : open.add(rule.id))
const numberOrNull = (v: string | number) => (v === '' || v === null ? null : Math.max(0, Math.floor(Number(v)) || 0))
function revert() {
  Object.assign(draft, JSON.parse(saved.value))
}

async function save() {
  error.value = ''
  try {
    const next = await bridge.invoke('autoapprove:save', structuredClone(draft))
    saved.value = ''
    load(next)
    savedNote.value = 'Saved.'
    setTimeout(() => (savedNote.value = ''), 2500)
  } catch (e) {
    error.value = errorText(e)
  }
}

function setMode(value: unknown) {
  if (value === 'live' && draft.dryRun) goingLive.value = true
  else if (value === 'dry') draft.dryRun = true
}

async function test() {
  testing.value = true
  error.value = ''
  try {
    if (dirty.value) await save()
    preview.value = await bridge.invoke('autoapprove:preview')
  } catch (e) {
    error.value = errorText(e)
  } finally {
    testing.value = false
  }
}

async function runNow() {
  error.value = ''
  try {
    if (dirty.value) await save()
    load(await bridge.invoke('autoapprove:run'))
  } catch (e) {
    error.value = errorText(e)
  }
}

const summary = (r: AutoApproveRule) => {
  const parts: string[] = []
  parts.push(r.repos.length ? r.repos.join(', ') : 'every repository')
  if (r.authors.length) parts.push(`by ${r.authors.join(', ')}`)
  if (r.paths.length) parts.push(`only ${r.paths.length} path ${r.paths.length === 1 ? 'pattern' : 'patterns'}`)
  if (r.maxLines !== null) parts.push(`≤ ${r.maxLines} lines`)
  if (r.maxFiles !== null) parts.push(`≤ ${r.maxFiles} files`)
  if (r.requireChecks) parts.push('checks green')
  return parts.join(' · ')
}

const ACTION = {
  approved: { label: 'Approved', cls: 'border-success/50 text-success' },
  'would-approve': { label: 'Would approve', cls: 'border-emphasis/50 text-emphasis' },
  failed: { label: 'Failed', cls: 'border-destructive/50 text-destructive' },
} as const

let off: (() => void) | undefined
onMounted(async () => {
  off = bridge.on('autoapprove:changed', load)
  try {
    load(await bridge.invoke('autoapprove:status'))
  } catch (e) {
    error.value = errorText(e)
  }
})
onBeforeUnmount(() => off?.())
</script>

<template>
  <PageHeader title="Auto-approve" :description="description">
    <Button variant="outline" :disabled="testing || !draft.rules.length" title="See what each rule says, without approving" @click="test">
      <Spinner v-if="testing" /><FlaskConical v-else /> Test rules
    </Button>
    <Button variant="outline" :disabled="status?.running || !draft.enabled" @click="runNow">
      <Spinner v-if="status?.running" /><Play v-else /> Check now
    </Button>
  </PageHeader>

  <div class="flex max-w-4xl flex-col gap-6 p-6">
    <Alert v-if="error || status?.lastError" variant="destructive"
      ><CircleAlert /><AlertDescription>{{ error || status?.lastError }}</AlertDescription></Alert
    >

    <section class="flex flex-col gap-4 rounded-lg border border-border p-4">
      <label class="flex items-center gap-3">
        <Switch v-model="draft.enabled" />
        <span class="flex flex-col">
          <span class="font-medium">Look for pull requests to approve</span>
          <span class="text-xs text-muted-foreground"
            >While PR Sift is open, it checks the pull requests waiting for your review on a timer.</span
          >
        </span>
      </label>
      <div class="flex flex-wrap items-center gap-x-6 gap-y-3 pl-11">
        <div class="flex items-center gap-2">
          <span class="text-sm">Mode</span>
          <ToggleGroup :model-value="draft.dryRun ? 'dry' : 'live'" type="single" variant="outline" size="sm" @update:model-value="setMode">
            <ToggleGroupItem value="dry">Dry run</ToggleGroupItem>
            <ToggleGroupItem value="live">Approve for real</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm">Check every</span>
          <ToggleGroup
            :model-value="String(draft.intervalMinutes)"
            type="single"
            variant="outline"
            size="sm"
            @update:model-value="(v) => v && (draft.intervalMinutes = Number(v))"
          >
            <ToggleGroupItem v-for="m in INTERVALS" :key="m" :value="String(m)">{{ m < 60 ? `${m} min` : '1 h' }}</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <p class="pl-11 text-xs text-muted-foreground">
        Never approved, whatever the rules say: drafts, your own pull requests, and a commit you already approved. Each approval names the
        exact commit that was checked, so a push that lands meanwhile is not approved.
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <h2 class="flex-1 font-semibold">
          Rules <span class="font-normal text-muted-foreground">{{ draft.rules.length }}</span>
        </h2>
        <span v-if="savedNote" class="text-xs text-success">{{ savedNote }}</span>
        <Button v-if="dirty" size="sm" variant="ghost" @click="revert"><Undo2 /> Discard changes</Button>
        <Button size="sm" :disabled="!dirty" @click="save"><Save /> Save</Button>
      </div>
      <p class="text-xs text-muted-foreground">
        A pull request is approved when it meets every condition of at least one rule that is on. Leave a list empty to allow anything.
      </p>

      <article v-for="rule in draft.rules" :key="rule.id" class="overflow-hidden rounded-lg border border-border">
        <header class="flex items-center gap-3 bg-secondary/60 px-4 py-2.5">
          <Switch v-model="rule.enabled" size="sm" :aria-label="`Turn ${rule.name} on or off`" />
          <button type="button" class="flex min-w-0 flex-1 flex-col text-left" @click="toggleOpen(rule)">
            <span class="truncate font-medium" :class="{ 'text-muted-foreground': !rule.enabled }">{{ rule.name || 'Untitled rule' }}</span>
            <span class="truncate text-xs text-muted-foreground">{{ summary(rule) }}</span>
          </button>
          <Button size="icon-sm" variant="ghost" title="Duplicate" aria-label="Duplicate rule" @click="duplicate(rule)"><Copy /></Button>
          <Button size="icon-sm" variant="ghost" title="Delete rule" aria-label="Delete rule" @click="removeRule(rule)"><Trash2 /></Button>
          <Button size="icon-sm" variant="ghost" :aria-label="open.has(rule.id) ? 'Collapse' : 'Expand'" @click="toggleOpen(rule)">
            <ChevronDown class="transition-transform" :class="{ 'rotate-180': open.has(rule.id) }" />
          </Button>
        </header>

        <div v-if="open.has(rule.id)" class="grid gap-x-6 gap-y-4 p-4 md:grid-cols-2">
          <label class="flex flex-col gap-1 md:col-span-2">
            <span class="text-sm font-medium">Name</span>
            <Input v-model="rule.name" placeholder="Dependency updates" />
          </label>

          <h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase md:col-span-2">Where and who</h3>
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">Repositories</span>
            <TagInput v-model="rule.repos" label="Repositories" placeholder="owner/repo or owner/*" />
            <div v-if="projectRepos.length" class="flex flex-wrap gap-1">
              <button
                v-for="r in projectRepos.filter((x) => !rule.repos.includes(x))"
                :key="r"
                type="button"
                class="rounded-md border border-dashed border-border px-1.5 text-xs text-muted-foreground hover:text-foreground"
                @click="rule.repos.push(r)"
              >
                + {{ r }}
              </button>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">Target branches</span>
            <TagInput v-model="rule.baseBranches" label="Target branches" placeholder="main, develop" />
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">Only these authors</span>
            <TagInput v-model="rule.authors" label="Only these authors" placeholder="login or dependabot[bot]" />
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">Never these authors</span>
            <TagInput v-model="rule.excludeAuthors" label="Never these authors" placeholder="login" />
          </div>

          <h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase md:col-span-2">What it changes</h3>
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">Every file must match</span>
            <TagInput v-model="rule.paths" label="Allowed paths" placeholder="docs/**, **/*.md" />
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">No file may match</span>
            <TagInput v-model="rule.blockedPaths" label="Blocked paths" placeholder=".github/**, **/migrations/**" />
          </div>
          <label class="flex flex-col gap-1">
            <span class="text-sm font-medium">At most this many files</span>
            <Input
              type="number"
              min="0"
              :model-value="rule.maxFiles ?? ''"
              placeholder="No limit"
              @update:model-value="(v) => (rule.maxFiles = numberOrNull(v))"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-sm font-medium">At most this many changed lines</span>
            <Input
              type="number"
              min="0"
              :model-value="rule.maxLines ?? ''"
              placeholder="No limit"
              @update:model-value="(v) => (rule.maxLines = numberOrNull(v))"
            />
          </label>
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">Needs one of these labels</span>
            <TagInput v-model="rule.labels" label="Needed labels" placeholder="dependencies, safe-to-merge" />
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">Not with these labels</span>
            <TagInput v-model="rule.blockedLabels" label="Blocked labels" placeholder="do-not-merge, wip" />
          </div>
          <div class="flex flex-col gap-1 md:col-span-2">
            <span class="text-sm font-medium">Title contains one of</span>
            <TagInput v-model="rule.titleWords" label="Title words" placeholder="chore(deps), docs:" />
          </div>

          <h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase md:col-span-2">Safety</h3>
          <div class="flex flex-col gap-2.5">
            <label class="flex items-center gap-2 text-sm"><Switch v-model="rule.requireChecks" size="sm" /> All checks passed</label>
            <label class="flex items-center gap-2 text-sm"><Switch v-model="rule.requireMergeable" size="sm" /> No merge conflicts</label>
            <label class="flex items-center gap-2 text-sm"
              ><Switch v-model="rule.skipChangesRequested" size="sm" /> Nobody asked for changes</label
            >
          </div>
          <label class="flex flex-col gap-1">
            <span class="text-sm font-medium">Wait after the last push (minutes)</span>
            <Input
              type="number"
              min="0"
              :model-value="rule.minAgeMinutes"
              @update:model-value="(v) => (rule.minAgeMinutes = numberOrNull(v) ?? 0)"
            />
            <span class="text-xs text-muted-foreground">Gives the author time to push a fix before you approve.</span>
          </label>
          <label class="flex flex-col gap-1 md:col-span-2">
            <span class="text-sm font-medium">Review comment</span>
            <Textarea v-model="rule.comment" rows="2" placeholder="Left empty, the approval has no comment." />
          </label>
        </div>
      </article>

      <div class="flex flex-col gap-2">
        <div class="flex gap-2">
          <Button variant="outline" size="sm" @click="addRule()"><Plus /> New rule</Button>
          <Button variant="outline" size="sm" @click="showTemplates = !showTemplates"><BadgeCheck /> From a template</Button>
        </div>
        <ul v-if="showTemplates" class="grid gap-2 md:grid-cols-3">
          <li v-for="t in TEMPLATES" :key="t.id">
            <button
              type="button"
              class="flex h-full w-full flex-col gap-1 rounded-lg border border-border p-3 text-left hover:bg-accent/50"
              @click="addRule(t.rule)"
            >
              <span class="font-medium">{{ t.label }}</span>
              <span class="text-xs text-muted-foreground">{{ t.description }}</span>
            </button>
          </li>
        </ul>
      </div>
    </section>

    <section v-if="preview" class="flex flex-col gap-2">
      <h2 class="font-semibold">
        Test result <span class="font-normal text-muted-foreground">{{ preview.length }} waiting for you</span>
      </h2>
      <p v-if="!preview.length" class="text-muted-foreground">Nobody is waiting for your review right now.</p>
      <ul v-else class="divide-y divide-border overflow-hidden rounded-lg border border-border">
        <li v-for="e in preview" :key="e.pull.url" class="flex flex-col gap-1 px-4 py-2.5">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="min-w-0 flex-1 truncate text-left font-medium hover:underline"
              @click="openReview({ owner: e.pull.owner, repo: e.pull.repo, number: e.pull.number })"
            >
              {{ e.pull.title }}
            </button>
            <Badge v-if="e.matched" variant="outline" class="border-success/50 text-success">Matches {{ e.matched }}</Badge>
            <Badge v-else-if="e.blocked" variant="outline">{{ e.blocked }}</Badge>
            <Badge v-else variant="outline" class="border-attention/50 text-attention">No rule matches</Badge>
          </div>
          <span class="text-xs text-muted-foreground">{{ e.pull.owner }}/{{ e.pull.repo }} #{{ e.pull.number }} · {{ e.pull.author }}</span>
          <ul v-if="!e.matched && !e.blocked" class="flex flex-col gap-0.5 text-xs">
            <li v-for="c in e.checks" :key="c.ruleId">
              <span class="font-medium">{{ c.rule }}:</span> <span class="text-muted-foreground">{{ c.failed.join(' · ') }}</span>
            </li>
            <li v-if="!e.checks.length" class="text-muted-foreground">No rule is turned on.</li>
          </ul>
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-2">
      <div class="flex items-center">
        <h2 class="flex-1 font-semibold">Activity</h2>
        <Button v-if="status?.log.length" size="xs" variant="ghost" @click="bridge.invoke('autoapprove:clear-log').then(load)"
          >Clear</Button
        >
      </div>
      <p v-if="!status?.log.length" class="text-muted-foreground">
        Nothing yet. Approvals, and in a dry run what would be approved, show up here.
      </p>
      <ul v-else class="divide-y divide-border overflow-hidden rounded-lg border border-border">
        <li v-for="entry in status.log" :key="entry.id" class="flex items-center gap-3 px-4 py-2">
          <Badge variant="outline" :class="ACTION[entry.action].cls">{{ ACTION[entry.action].label }}</Badge>
          <div class="flex min-w-0 flex-1 flex-col">
            <a :href="entry.pull.url" target="_blank" rel="noreferrer" class="truncate hover:underline">{{ entry.pull.title }}</a>
            <span class="truncate text-xs text-muted-foreground"
              >{{ entry.pull.owner }}/{{ entry.pull.repo }} #{{ entry.pull.number }} · {{ entry.rule }} · {{ formatAgo(entry.at)
              }}<template v-if="entry.error"> · {{ entry.error }}</template></span
            >
          </div>
        </li>
      </ul>
    </section>
  </div>

  <ConfirmDialog
    :open="goingLive"
    title="Approve for real?"
    description="From the next check, pull requests that match a rule are approved on GitHub under your name. Run a dry run first to see what that would be."
    confirm="Approve for real"
    @update:open="(v) => (goingLive = v)"
    @confirm="((draft.dryRun = false), (goingLive = false))"
  />
</template>
