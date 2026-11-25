<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, shallowRef, watch } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  Ellipsis,
  FileCheck,
  FileText,
  FileX,
  FolderGit2,
  GitBranch,
  History,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  UserCheck,
  Users,
} from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { AutoApproveConfig, AutoApproveRule, AutoApproveStatus, Evaluation } from '#shared/ipc'
import { newRule, TEMPLATES } from '#shared/autoapprove'
import { bridge } from '~/bridge'
import { errorText, formatAgo } from '~/format'
import { autoRule, openReview } from '~/navigation'
import { useProjects } from '~/useProjects'
import { BOTS, COMMON_PATHS, hintsFor, searchPeople, type RepoHints } from '~/autoapproveHints'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import CountBadge from '~/components/CountBadge.vue'
import PageHeader from '~/components/PageHeader.vue'
import Segmented from '~/components/Segmented.vue'
import Hint from '~/components/Hint.vue'
import RepoPicker from '~/components/RepoPicker.vue'
import SectionLabel from '~/components/SectionLabel.vue'
import TagInput, { type Suggestion } from '~/components/TagInput.vue'

const { projects } = useProjects()
const status = shallowRef<AutoApproveStatus | null>(null)
const draft = reactive<AutoApproveConfig>({ enabled: false, dryRun: true, intervalMinutes: 10, rules: [] })
// Vue's reactive proxies can't be structured-cloned (IPC and structuredClone both fail on them).
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T
const saved = shallowRef('')
const error = shallowRef('')
const savedNote = shallowRef('')
const goingLive = shallowRef(false)
const moreOpen = shallowRef(false)
const historyOpen = shallowRef(false)
const renaming = shallowRef(false)
const leaving = shallowRef(false)
const deleting = shallowRef(false)

const dirty = computed(() => JSON.stringify(draft) !== saved.value)
// The rule open on its own page; none shows the list of rules.
const rule = computed(() => (autoRule.value ? draft.rules.find((r) => r.id === autoRule.value) : undefined))
const INTERVALS = [5, 10, 15, 30, 60]
const every = (m: number) => `every ${m < 60 ? `${m} minutes` : 'hour'}`
const TEMPLATE_ICON: Record<string, typeof Bot> = { deps: Bot, docs: FileText, small: UserCheck }
const STEPS = [
  { title: 'Write a rule', text: 'Pick repositories, authors, paths and limits.' },
  { title: 'Try it in Dry run', text: 'See what it would approve. Nothing is sent.' },
  { title: 'Go Live', text: 'Matching pull requests are approved for you.' },
]

type Mode = 'off' | 'dry' | 'live'
const mode = computed<Mode>(() => (!draft.enabled ? 'off' : draft.dryRun ? 'dry' : 'live'))
// The coloured dot marks the chosen mode only, so Off stays quiet.
const MODES = computed(() => [
  { value: 'off' as const, label: 'Off' },
  { value: 'dry' as const, label: 'Dry run', dot: mode.value === 'dry' ? 'bg-attention' : undefined },
  { value: 'live' as const, label: 'On', dot: mode.value === 'live' ? 'bg-success-fg' : undefined },
])
const modeModel = computed<Mode>({ get: () => mode.value, set: (v) => setMode(v) })

function load(next: AutoApproveStatus) {
  status.value = next
  if (!dirty.value || !saved.value) {
    Object.assign(draft, clone(next.config))
    saved.value = JSON.stringify(draft)
  }
}

const id = () => `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
function addRule(template?: Partial<AutoApproveRule>) {
  const next = { ...newRule(id()), ...clone(template ?? {}) }
  draft.rules.push(next)
  autoRule.value = next.id
}
function duplicate(r: AutoApproveRule) {
  const copy = { ...clone(r), id: id(), name: `${r.name} (copy)` }
  draft.rules.splice(draft.rules.indexOf(r) + 1, 0, copy)
  autoRule.value = copy.id
}
async function removeRule(r: AutoApproveRule) {
  draft.rules.splice(draft.rules.indexOf(r), 1)
  deleting.value = false
  autoRule.value = null
  await save()
}
const numberOrNull = (v: string | number) => (v === '' || v === null ? null : Math.max(0, Math.floor(Number(v)) || 0))
function revert() {
  Object.assign(draft, JSON.parse(saved.value))
  if (autoRule.value && !draft.rules.some((r) => r.id === autoRule.value)) autoRule.value = null
}
// Back to the list; unsaved edits are asked about first.
function back() {
  if (dirty.value) leaving.value = true
  else autoRule.value = null
}
function leave() {
  leaving.value = false
  revert()
  autoRule.value = null
}
// The switch on the list saves at once; other edits wait for Save on the rule's page.
async function toggleRule(r: AutoApproveRule, on: boolean) {
  r.enabled = on
  await save()
}

async function save() {
  error.value = ''
  try {
    const next = await bridge.invoke('autoapprove:save', clone(draft))
    saved.value = ''
    load(next)
    savedNote.value = 'Saved'
    setTimeout(() => (savedNote.value = ''), 2500)
    return true
  } catch (e) {
    error.value = errorText(e)
    return false
  }
}
async function saveAndClose() {
  if (await save()) autoRule.value = null
}

// The mode is a switch for the whole feature, so it is saved at once, without the rule edits still open.
async function applyMode(next: Mode) {
  const base = saved.value ? (JSON.parse(saved.value) as AutoApproveConfig) : clone(draft)
  base.enabled = next !== 'off'
  if (next !== 'off') base.dryRun = next === 'dry'
  draft.enabled = base.enabled
  draft.dryRun = base.dryRun
  try {
    const res = await bridge.invoke('autoapprove:save', base)
    status.value = res
    const keep = clone(draft)
    saved.value = JSON.stringify({ ...clone(res.config) })
    Object.assign(draft, keep)
  } catch (e) {
    error.value = errorText(e)
  }
}
function setMode(next: Mode) {
  if (next === mode.value) return
  if (next === 'live') goingLive.value = true
  else void applyMode(next)
}
async function setCheckEvery(minutes: number) {
  draft.intervalMinutes = minutes
  const base = saved.value ? (JSON.parse(saved.value) as AutoApproveConfig) : clone(draft)
  base.intervalMinutes = minutes
  try {
    const res = await bridge.invoke('autoapprove:save', base)
    status.value = res
    const keep = clone(draft)
    saved.value = JSON.stringify(clone(res.config))
    Object.assign(draft, keep)
  } catch (e) {
    error.value = errorText(e)
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

// ── Live preview: every edit re-checks the draft against what GitHub said a moment ago. ──
const evaluations = shallowRef<Evaluation[] | null>(null)
const previewing = shallowRef(false)
const previewError = shallowRef('')
let previewTimer: ReturnType<typeof setTimeout> | undefined
let previewSeq = 0

async function runPreview(refresh = false) {
  if (!draft.rules.length) {
    evaluations.value = null
    return
  }
  const seq = ++previewSeq
  previewing.value = true
  previewError.value = ''
  try {
    // Every rule is looked at as if it were on, so a rule that is off still shows what it would catch.
    const config = { ...clone(draft), rules: clone(draft.rules).map((r) => ({ ...r, enabled: true })) }
    const result = await bridge.invoke('autoapprove:preview', config, refresh)
    if (seq === previewSeq) evaluations.value = result
  } catch (e) {
    if (seq === previewSeq) previewError.value = errorText(e)
  } finally {
    if (seq === previewSeq) previewing.value = false
  }
}
watch(
  () => JSON.stringify(draft.rules),
  () => {
    clearTimeout(previewTimer)
    previewTimer = setTimeout(() => void runPreview(), 350)
  },
)

const passes = (e: Evaluation, ruleId: string) => !e.blocked && e.checks.some((c) => c.ruleId === ruleId && !c.failed.length)
const matchCount = (r: AutoApproveRule) => evaluations.value?.filter((e) => passes(e, r.id)).length
const forRule = computed(() => {
  const r = rule.value
  if (!r || !evaluations.value) return { yes: [], no: [] as { e: Evaluation; why: string }[] }
  // Pull requests from repositories this rule doesn't cover are other rules' business.
  const outOfScope = (e: Evaluation) =>
    r.repos.length > 0 && !!e.checks.find((c) => c.ruleId === r.id)?.failed.includes('Repository is not in the list')
  const yes = evaluations.value.filter((e) => passes(e, r.id))
  const no = evaluations.value
    .filter((e) => !passes(e, r.id) && !outOfScope(e))
    .map((e) => ({ e, why: e.blocked ?? e.checks.find((c) => c.ruleId === r.id)?.failed.join(' · ') ?? '' }))
  return { yes, no }
})
// A rule as one sentence: plain words, with the values in bold.
type Part = { text: string; bold?: boolean }
const or = (list: string[]): Part[] =>
  list.flatMap((v, i) => [...(i ? [{ text: i === list.length - 1 ? ' or ' : ', ' }] : []), { text: v, bold: true }])
function sentence(r: AutoApproveRule): Part[] {
  const parts: Part[] = [{ text: 'Pull requests ' }]
  if (r.repos.length) parts.push({ text: 'in ' }, ...or(r.repos))
  else parts.push({ text: 'waiting for your review' })
  if (r.baseBranches.length) parts.push({ text: ' into ' }, ...or(r.baseBranches))
  if (r.labels.length) parts.push({ text: ' labelled ' }, ...or(r.labels))
  if (r.authors.length) parts.push({ text: ', from ' }, ...or(r.authors))
  if (r.paths.length) parts.push({ text: ', that only change ' }, ...or(r.paths))
  if (r.blockedPaths.length) parts.push({ text: r.paths.length ? ' and never ' : ', that never change ' }, ...or(r.blockedPaths))
  if (r.requireChecks) parts.push({ text: r.paths.length || r.blockedPaths.length ? ', with passing checks' : ' whose checks pass' })
  parts.push({ text: '.' })
  return parts
}
const initial = (login: string) => (login.replace(/\[bot\]$/, '')[0] ?? '?').toUpperCase()

const openPull = (e: Evaluation) => openReview({ owner: e.pull.owner, repo: e.pull.repo, number: e.pull.number })

// ── Suggestions from the repositories the rule is about. ──
const projectRepos = computed(() =>
  (projects.value ?? []).flatMap((p) => (p.github ? [`${p.github.owner}/${p.github.repo}`.toLowerCase()] : [])),
)
const waitingRepos = computed(() => (evaluations.value ?? []).map((e) => `${e.pull.owner}/${e.pull.repo}`.toLowerCase()))
const repoOptions = computed(() => [...new Set([...projectRepos.value, ...waitingRepos.value])].sort())
const hintRepos = computed(() => {
  const picked = (rule.value?.repos ?? []).filter((r) => !r.endsWith('/*'))
  if (picked.length) return picked
  const owners = (rule.value?.repos ?? []).filter((r) => r.endsWith('/*')).map((r) => r.slice(0, -1))
  const pool = [...new Set([...waitingRepos.value, ...projectRepos.value])]
  return (owners.length ? pool.filter((r) => owners.some((o) => r.startsWith(o))) : pool).slice(0, 3)
})
const hints = shallowRef<RepoHints>({ labels: [], people: [], folders: [] })
watch(
  () => hintRepos.value.join(','),
  async () => {
    const repos = hintRepos.value
    hints.value = repos.length ? await hintsFor(repos) : { labels: [], people: [], folders: [] }
  },
  { immediate: true },
)
// Everyone on any of your projects, so names can be found without knowing which repository they work in.
const everyone = shallowRef<RepoHints['people']>([])
watch(
  () => [...new Set([...projectRepos.value, ...waitingRepos.value])].join(','),
  async (list) => {
    everyone.value = list ? (await hintsFor(list.split(','), 12)).people : []
  },
  { immediate: true },
)
const findPeople = async (text: string): Promise<Suggestion[]> =>
  (await searchPeople(text)).map((p) => ({ value: p.login.toLowerCase(), avatar: p.avatarUrl, detail: p.name ?? undefined }))
const labelSuggestions = computed<Suggestion[]>(() => hints.value.labels.map((l) => ({ value: l.name, color: l.color })))
const peopleSuggestions = computed<Suggestion[]>(() => {
  const authors = (evaluations.value ?? []).map((e) => e.pull.author)
  const people = new Map<string, Suggestion>()
  for (const a of authors)
    people.set(a.toLowerCase(), {
      value: a.toLowerCase(),
      avatar: `https://avatars.githubusercontent.com/${encodeURIComponent(a.replace('[bot]', ''))}?s=32`,
    })
  for (const p of [...everyone.value, ...hints.value.people])
    people.set(p.login.toLowerCase(), { value: p.login.toLowerCase(), avatar: p.avatarUrl, detail: p.name ?? undefined })
  for (const b of BOTS) if (!people.has(b)) people.set(b, { value: b })
  return [...people.values()]
})
const pathSuggestions = computed<Suggestion[]>(() => [...new Set([...hints.value.folders, ...COMMON_PATHS])].map((value) => ({ value })))
const branchSuggestions = computed<Suggestion[]>(() =>
  [...new Set([hints.value.defaultBranch, 'main', 'master', 'develop'].filter((b): b is string => !!b))].map((value) => ({ value })),
)
const hintSource = computed(() => (hintRepos.value.length === 1 ? `Often in ${hintRepos.value[0]}:` : 'Often in these repos:'))

const ACTION = {
  approved: { label: 'Approved', tone: 'success' },
  'would-approve': { label: 'Would approve', tone: 'info' },
  failed: { label: 'Failed', tone: 'danger' },
} as const
const TONE = { success: 'bg-add-bg text-success-fg', info: 'bg-emphasis/15 text-emphasis', danger: 'bg-destructive/10 text-destructive' }
watch(autoRule, () => {
  renaming.value = false
  moreOpen.value = false
})

let off: (() => void) | undefined
onMounted(async () => {
  off = bridge.on('autoapprove:changed', load)
  try {
    load(await bridge.invoke('autoapprove:status'))
    void runPreview()
  } catch (e) {
    error.value = errorText(e)
  }
})
onBeforeUnmount(() => {
  off?.()
  clearTimeout(previewTimer)
})
</script>

<template>
  <!-- ── One rule, on its own page ── -->
  <template v-if="rule">
    <div class="flex min-h-full flex-col">
      <header class="flex h-16 shrink-0 items-center gap-2 border-b border-border pr-8 pl-6">
        <Button size="icon-sm" variant="ghost" class="text-muted-foreground" aria-label="Back to the rules" @click="back"
          ><ArrowLeft
        /></Button>

        <input
          v-if="renaming || !rule.name"
          v-model="rule.name"
          aria-label="Rule name"
          autofocus
          class="h-8 min-w-0 flex-1 rounded-md bg-transparent px-1 text-base leading-[22px] font-semibold outline-none placeholder:text-faint focus-visible:ring-[3px] focus-visible:ring-ring/50"
          placeholder="Name this rule"
          @keydown.enter="renaming = false"
          @blur="renaming = false"
        />
        <template v-else>
          <h1 class="truncate text-base leading-[22px] font-semibold">{{ rule.name }}</h1>

          <Button size="icon-sm" variant="ghost" class="text-muted-foreground" aria-label="Rename rule" @click="renaming = true"
            ><Pencil
          /></Button>

          <span class="flex-1" />
        </template>
        <Label class="gap-2 text-xs font-normal text-muted-foreground"
          >{{ rule.enabled ? 'On' : 'Off' }} <Switch v-model="rule.enabled" aria-label="Rule on"
        /></Label>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button size="icon-sm" variant="ghost" class="text-muted-foreground" aria-label="More for this rule"><Ellipsis /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-48">
            <DropdownMenuItem @select="duplicate(rule)"><Copy /> Duplicate</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" @select="deleting = true"><Trash2 /> Delete rule</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <Alert v-if="error" variant="destructive" class="mx-8 mt-4 w-auto max-w-[760px]"
        ><CircleAlert /><AlertDescription>{{ error }}</AlertDescription></Alert
      >

      <div class="@container/page flex-1">
        <div class="grid items-start @5xl/page:grid-cols-[minmax(0,760px)_minmax(340px,1fr)]">
          <div class="@container flex min-w-0 flex-col gap-7 px-8 pt-6 pb-7 @5xl/page:pb-24">
            <p class="rounded-lg bg-muted px-3.5 py-3 text-[13px] leading-5">
              Approves
              <template v-for="(p, i) in sentence(rule)" :key="i"
                ><b v-if="p.bold" class="font-semibold">{{ p.text }}</b
                ><template v-else>{{ i === 0 ? p.text.toLowerCase() : p.text }}</template></template
              >
            </p>

            <section class="flex flex-col gap-3">
              <SectionLabel>Which pull requests</SectionLabel>
              <div class="grid items-start gap-x-4 gap-y-3 @xl:grid-cols-[160px_minmax(0,1fr)]">
                <span class="flex h-8 items-center gap-1.5 text-[13px] font-medium"
                  ><FolderGit2 class="size-3.5 text-muted-foreground" />Repositories</span
                >
                <RepoPicker v-model="rule.repos" :options="repoOptions" />
                <span class="flex h-8 items-center gap-1.5 text-[13px] font-medium"
                  ><GitBranch class="size-3.5 text-muted-foreground" />Into branches</span
                >
                <TagInput
                  v-model="rule.baseBranches"
                  label="Into branches"
                  placeholder="Any branch"
                  mono
                  :suggestions="branchSuggestions"
                />
                <span class="flex h-8 items-center gap-1.5 text-[13px] font-medium"
                  ><Tag class="size-3.5 text-muted-foreground" />Has a label</span
                >
                <TagInput
                  v-model="rule.labels"
                  label="Has a label"
                  placeholder="Add a label"
                  :suggestions="labelSuggestions"
                  :suggest-label="labelSuggestions.length ? hintSource : undefined"
                />
                <span class="flex h-8 items-center gap-1.5 text-[13px] font-medium"
                  ><Users class="size-3.5 text-muted-foreground" />Only from</span
                >
                <TagInput
                  v-model="rule.authors"
                  label="Only from"
                  placeholder="Add a person"
                  :suggestions="peopleSuggestions"
                  :search="findPeople"
                  :suggest-label="hintSource"
                />
              </div>
            </section>

            <section class="flex flex-col gap-3">
              <SectionLabel>Files</SectionLabel>
              <div class="grid items-start gap-x-4 gap-y-3 @xl:grid-cols-[160px_minmax(0,1fr)]">
                <Hint text="Every changed file has to match one of these. ** means any folders.">
                  <span class="flex h-8 w-fit items-center gap-1.5 text-[13px] font-medium"
                    ><FileCheck class="size-3.5 text-muted-foreground" />Only changes</span
                  >
                </Hint>
                <TagInput
                  v-model="rule.paths"
                  label="Only changes"
                  placeholder="Add a folder or pattern"
                  mono
                  :suggestions="pathSuggestions"
                  :suggest-label="hintSource"
                />
                <span class="flex h-8 items-center gap-1.5 text-[13px] font-medium"
                  ><FileX class="size-3.5 text-muted-foreground" />Never changes</span
                >
                <TagInput
                  v-model="rule.blockedPaths"
                  label="Never changes"
                  placeholder="Add a folder or pattern"
                  mono
                  :suggestions="pathSuggestions"
                />
              </div>
            </section>

            <section class="flex flex-col gap-3">
              <SectionLabel>Also</SectionLabel>
              <div class="flex flex-wrap gap-x-6 gap-y-2.5 text-[13px]">
                <Label class="font-normal"><Checkbox v-model="rule.requireChecks" /> Checks must pass</Label>
                <Label class="font-normal"><Checkbox v-model="rule.requireMergeable" /> Must be mergeable</Label>
                <Label class="font-normal"><Checkbox v-model="rule.skipChangesRequested" /> Nobody asked for changes</Label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                class="-ml-2 w-fit text-muted-foreground"
                :aria-expanded="moreOpen"
                @click="moreOpen = !moreOpen"
              >
                <ChevronDown class="transition-transform" :class="{ 'rotate-180': moreOpen }" /> More conditions
              </Button>
              <div v-if="moreOpen" class="grid items-start gap-x-4 gap-y-3 @xl:grid-cols-[160px_minmax(0,1fr)]">
                <span class="flex h-8 items-center text-[13px] font-medium">Never from</span>
                <TagInput
                  v-model="rule.excludeAuthors"
                  label="Never from"
                  placeholder="Nobody. Type a name to search"
                  :suggestions="peopleSuggestions"
                  :search="findPeople"
                  :chips="false"
                />
                <span class="flex h-8 items-center text-[13px] font-medium">Not with labels</span>
                <TagInput
                  v-model="rule.blockedLabels"
                  label="Not with labels"
                  placeholder="None"
                  :suggestions="labelSuggestions"
                  :chips="false"
                />
                <span class="flex h-8 items-center text-[13px] font-medium">Title has one of</span>
                <TagInput
                  v-model="rule.titleWords"
                  label="Title has one of"
                  placeholder="Any title"
                  :suggestions="[{ value: 'chore(deps)' }, { value: 'docs:' }, { value: 'docs(' }]"
                  :chips="false"
                />
                <span class="flex h-8 items-center text-[13px] font-medium">Size</span>
                <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                  <Label class="gap-1.5 font-normal"
                    >At most
                    <Input
                      inputmode="numeric"
                      class="h-7 w-14 text-center"
                      placeholder="any"
                      :model-value="rule.maxFiles ?? ''"
                      @update:model-value="(v) => (rule!.maxFiles = numberOrNull(v))"
                    />
                    files</Label
                  >
                  <Label class="gap-1.5 font-normal"
                    >and
                    <Input
                      inputmode="numeric"
                      class="h-7 w-16 text-center"
                      placeholder="any"
                      :model-value="rule.maxLines ?? ''"
                      @update:model-value="(v) => (rule!.maxLines = numberOrNull(v))"
                    />
                    changed lines</Label
                  >
                </div>
                <span class="flex h-8 items-center text-[13px] font-medium">Wait</span>
                <Label class="gap-1.5 text-[13px] font-normal"
                  ><Input
                    inputmode="numeric"
                    class="h-7 w-14 text-center"
                    :model-value="rule.minAgeMinutes"
                    @update:model-value="(v) => (rule!.minAgeMinutes = numberOrNull(v) ?? 0)"
                  />
                  minutes after the last push, so the author can still fix things</Label
                >
                <Label for="rule-comment" class="flex h-8 items-center text-[13px] font-medium">Review comment</Label>
                <Textarea id="rule-comment" v-model="rule.comment" rows="2" placeholder="Left empty, the approval has no comment." />
              </div>
            </section>
          </div>

          <aside
            aria-label="Would approve now"
            class="flex min-w-0 flex-col gap-3 px-8 pb-24 @5xl/page:sticky @5xl/page:top-0 @5xl/page:h-[calc(100vh-4rem)] @5xl/page:overflow-y-auto @5xl/page:border-l @5xl/page:border-accent @5xl/page:pt-6"
          >
            <div class="flex items-center gap-2">
              <SectionLabel>Would approve now</SectionLabel>
              <span class="flex-1" />

              <Button
                size="icon-sm"
                variant="ghost"
                class="text-muted-foreground"
                aria-label="Refresh"
                :disabled="previewing"
                @click="runPreview(true)"
                ><Spinner v-if="previewing" /><RefreshCw v-else
              /></Button>
            </div>
            <p v-if="previewError" class="text-xs text-destructive">{{ previewError }}</p>
            <div v-else-if="!evaluations" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Asking GitHub…</div>
            <p v-else-if="!forRule.yes.length && !forRule.no.length" class="text-muted-foreground">
              No open pull requests {{ rule.repos.length ? 'in these repositories' : 'waiting for your review' }} right now.
            </p>
            <ul v-else class="overflow-hidden rounded-lg border border-border">
              <li v-for="e in forRule.yes" :key="e.pull.url" class="border-t border-accent first:border-t-0">
                <button type="button" class="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60" @click="openPull(e)">
                  <img
                    :src="`https://avatars.githubusercontent.com/${encodeURIComponent(e.pull.author.replace('[bot]', ''))}?s=40`"
                    alt=""
                    class="size-5 shrink-0 rounded-full bg-accent"
                  />
                  <span class="flex min-w-0 flex-1 flex-col">
                    <span class="truncate text-[13px] font-medium">{{ e.pull.title }}</span>
                    <span class="truncate text-xs text-muted-foreground">#{{ e.pull.number }} · {{ e.pull.author }}</span>
                  </span>
                  <span class="inline-flex shrink-0 items-center gap-1 text-xs text-success-fg"><Check class="size-3.5" />Matches</span>
                </button>
              </li>
              <li v-for="{ e, why } in forRule.no" :key="e.pull.url" class="border-t border-accent first:border-t-0">
                <button type="button" class="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/60" @click="openPull(e)">
                  <span class="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px]">{{
                    initial(e.pull.author)
                  }}</span>
                  <span class="flex min-w-0 flex-1 flex-col">
                    <span class="truncate text-[13px] text-muted-foreground">{{ e.pull.title }}</span>
                    <span class="truncate text-xs text-muted-foreground">#{{ e.pull.number }} · {{ e.pull.author }}</span>
                    <span class="mt-1 line-clamp-2 text-xs text-faint" :title="why">{{ why }}</span>
                  </span>
                </button>
              </li>
            </ul>
          </aside>
        </div>
      </div>

      <div
        v-if="dirty"
        class="sticky bottom-0 z-10 flex h-16 shrink-0 items-center gap-2 border-t border-border bg-background px-8"
        role="region"
        aria-label="Unsaved changes"
      >
        <span class="flex-1 text-xs text-muted-foreground">Unsaved changes</span>
        <Button variant="outline" @click="revert">Discard</Button>
        <Button variant="success" @click="saveAndClose">Save rule</Button>
      </div>
    </div>
  </template>

  <!-- ── The list of rules ── -->
  <template v-else>
    <PageHeader
      title="Auto-approve"
      description="Approves pull requests that match a rule. Dry run shows what it would approve without approving."
    >
      <Segmented v-model="modeModel" :options="MODES" label="Mode" />
      <Hint text="What it approved">
        <Button size="icon" variant="ghost" class="text-muted-foreground" aria-label="What it approved" @click="historyOpen = true"
          ><History
        /></Button>
      </Hint>
    </PageHeader>

    <Alert v-if="error || status?.lastError" variant="destructive" class="mx-8 mt-4 w-auto max-w-[960px]"
      ><CircleAlert /><AlertDescription>{{ error || status?.lastError }}</AlertDescription></Alert
    >

    <!-- No rules yet: explain the feature and offer the templates -->
    <section v-if="!draft.rules.length" aria-label="Get started" class="flex w-full max-w-[880px] flex-col gap-8 px-8 py-10">
      <div class="flex flex-col items-start gap-3">
        <span class="flex size-10 items-center justify-center rounded-lg bg-add-bg text-success-fg"><ShieldCheck class="size-5" /></span>
        <h2 class="text-lg font-semibold">Let PR Sift approve the safe pull requests</h2>
        <p class="max-w-[600px] text-muted-foreground">
          A rule says which pull requests are safe to approve: who opened them, where, and what they change. PR Sift checks the open pull
          requests in the repositories you name, and any waiting for your review, and approves the ones that match.
        </p>
      </div>
      <ol class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <li v-for="(step, i) in STEPS" :key="step.title" class="flex gap-3">
          <span
            class="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground tabular-nums"
            >{{ i + 1 }}</span
          >
          <span class="flex flex-col gap-0.5">
            <span class="font-medium">{{ step.title }}</span>
            <span class="text-xs text-muted-foreground">{{ step.text }}</span>
          </span>
        </li>
      </ol>
      <div class="flex flex-col gap-3">
        <SectionLabel>Start from a template</SectionLabel>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Item
            v-for="t in TEMPLATES"
            :key="t.id"
            as="button"
            type="button"
            variant="outline"
            class="flex-col items-start text-left hover:bg-muted"
            @click="addRule(t.rule)"
          >
            <ItemMedia variant="icon"><component :is="TEMPLATE_ICON[t.id] ?? Sparkles" /></ItemMedia>
            <ItemContent>
              <ItemTitle>{{ t.label }}</ItemTitle>
              <ItemDescription class="line-clamp-none">{{ t.description }}</ItemDescription>
            </ItemContent>
            <span class="flex items-center gap-1 text-xs font-medium text-emphasis">Use this <ArrowRight class="size-3" /></span>
          </Item>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <Button variant="outline" @click="addRule()"><Plus /> Start with a blank rule</Button>
        <span class="text-xs text-muted-foreground">Nothing is approved until you switch the mode to On.</span>
      </div>
    </section>

    <div v-else class="flex w-full max-w-[960px] flex-col gap-3 px-8 py-6">
      <div class="flex items-center gap-2">
        <SectionLabel>Rules</SectionLabel>
        <CountBadge>{{ draft.rules.length }}</CountBadge>
        <span class="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="sm" class="text-muted-foreground">From a template <ChevronDown /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-64">
            <DropdownMenuItem v-for="t in TEMPLATES" :key="t.id" @select="addRule(t.rule)"
              ><component :is="TEMPLATE_ICON[t.id] ?? Sparkles" /> {{ t.label }}</DropdownMenuItem
            >
          </DropdownMenuContent>
        </DropdownMenu>
        <Button @click="addRule()"><Plus /> New rule</Button>
      </div>
      <ul class="overflow-hidden rounded-lg border border-border">
        <li
          v-for="r in draft.rules"
          :key="r.id"
          class="flex items-center gap-4 border-t border-accent p-4 first:border-t-0 hover:bg-muted/60"
        >
          <Switch
            :model-value="r.enabled"
            :aria-label="`Turn ${r.name || 'this rule'} on or off`"
            @update:model-value="(v) => toggleRule(r, v)"
          />
          <button type="button" class="flex min-w-0 flex-1 flex-col gap-1 text-left" @click="autoRule = r.id">
            <span class="text-sm font-semibold" :class="r.enabled ? '' : 'text-muted-foreground'">{{ r.name || 'Untitled rule' }}</span>
            <span class="text-[13px] leading-5 text-muted-foreground"
              ><template v-for="(p, i) in sentence(r)" :key="i"
                ><b v-if="p.bold" class="font-medium text-foreground">{{ p.text }}</b
                ><template v-else>{{ p.text }}</template></template
              ></span
            >
          </button>
          <Badge v-if="!r.enabled" variant="secondary" class="bg-muted font-normal text-muted-foreground">Paused</Badge>
          <Badge v-else-if="matchCount(r)" variant="secondary" class="bg-add-bg font-normal text-success-fg"
            >{{ matchCount(r) }} would be approved</Badge
          >
          <Badge v-else-if="matchCount(r) === 0" variant="secondary" class="bg-muted font-normal text-muted-foreground"
            >None right now</Badge
          >
          <Spinner v-else class="text-muted-foreground" />

          <Button size="icon-sm" variant="ghost" class="text-muted-foreground" :aria-label="`Edit ${r.name}`" @click="autoRule = r.id"
            ><Pencil
          /></Button>
        </li>
      </ul>
      <p class="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
        Looks
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button type="button" class="inline-flex items-center gap-0.5 text-foreground hover:underline" aria-label="How often to look">
              {{ every(draft.intervalMinutes) }}<ChevronDown class="size-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-auto">
            <DropdownMenuRadioGroup :model-value="String(draft.intervalMinutes)" @update:model-value="(v) => setCheckEvery(Number(v))">
              <DropdownMenuRadioItem v-for="m in INTERVALS" :key="m" :value="String(m)">{{ every(m) }}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        while PR Sift is open. Your own pull requests and drafts are never approved.
        <template v-if="status?.lastRun">Last look {{ formatAgo(status.lastRun) }}.</template>
      </p>
    </div>
  </template>

  <Sheet v-model:open="historyOpen">
    <SheetContent class="w-[min(520px,94vw)] gap-0 p-0 sm:max-w-none">
      <SheetHeader class="border-b border-border p-5 pr-12">
        <SheetTitle>What it approved</SheetTitle>
        <SheetDescription>{{
          mode === 'dry'
            ? 'In a dry run, what it would have approved. Nothing was sent to GitHub.'
            : 'Approvals sent under your name, newest first.'
        }}</SheetDescription>
        <div class="flex items-center gap-2 pt-2">
          <Button size="sm" variant="outline" :disabled="status?.running || !draft.enabled" @click="runNow"
            ><Spinner v-if="status?.running" /><RefreshCw v-else /> Look now</Button
          >
          <span class="flex-1" />
          <Button
            v-if="status?.log.length"
            size="sm"
            variant="ghost"
            class="text-muted-foreground"
            @click="bridge.invoke('autoapprove:clear-log').then(load)"
            >Clear</Button
          >
        </div>
      </SheetHeader>
      <p v-if="!status?.log.length" class="p-5 text-muted-foreground">
        Nothing yet. Approvals, and in a dry run what would be approved, show up here.
      </p>
      <ul v-else class="overflow-y-auto">
        <li v-for="entry in status.log" :key="entry.id" class="flex items-center gap-3 border-b border-accent px-5 py-2.5">
          <Badge variant="secondary" class="w-[104px] shrink-0 justify-center font-normal" :class="TONE[ACTION[entry.action].tone]">{{
            ACTION[entry.action].label
          }}</Badge>
          <div class="flex min-w-0 flex-1 flex-col">
            <a :href="entry.pull.url" target="_blank" rel="noreferrer" class="truncate hover:text-emphasis">{{ entry.pull.title }}</a>
            <span class="truncate text-xs text-muted-foreground"
              >{{ entry.pull.owner }}/{{ entry.pull.repo }} #{{ entry.pull.number }} · {{ entry.rule }} · {{ formatAgo(entry.at)
              }}<template v-if="entry.error"> · {{ entry.error }}</template></span
            >
          </div>
        </li>
      </ul>
    </SheetContent>
  </Sheet>

  <ConfirmDialog
    :open="goingLive"
    title="Approve for real?"
    description="From the next look, pull requests that match a rule that is on are approved on GitHub under your name. Everyone on the pull request sees the approval."
    confirm="Turn on"
    @update:open="(v) => (goingLive = v)"
    @confirm="((goingLive = false), applyMode('live'))"
  />
  <ConfirmDialog
    :open="leaving"
    title="Discard your changes?"
    description="The edits to this rule since the last save are thrown away."
    confirm="Discard"
    @update:open="(v) => (leaving = v)"
    @confirm="leave"
  />
  <ConfirmDialog
    :open="deleting"
    :title="`Delete ${rule?.name || 'this rule'}?`"
    description="The rule goes away for good. What it approved before stays on GitHub."
    confirm="Delete rule"
    @update:open="(v) => (deleting = v)"
    @confirm="rule && removeRule(rule)"
  />
</template>
