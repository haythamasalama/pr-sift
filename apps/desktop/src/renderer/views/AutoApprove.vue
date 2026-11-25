<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, shallowRef, watch } from 'vue'
import {
  ArrowRight,
  Bot,
  ChevronDown,
  CircleAlert,
  Copy,
  FileText,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Undo2,
  UserCheck,
} from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'
import { Label } from '@/components/ui/label'
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
import { BOTS, COMMON_PATHS, hintsFor, searchPeople, type RepoHints } from '~/autoapproveHints'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import Hint from '~/components/Hint.vue'
import RepoPicker from '~/components/RepoPicker.vue'
import SectionLabel from '~/components/SectionLabel.vue'
import StatusPill from '~/components/StatusPill.vue'
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
const selectedId = shallowRef<string | null>(null)
const moreOpen = shallowRef(false)

const dirty = computed(() => JSON.stringify(draft) !== saved.value)
const rule = computed(() => draft.rules.find((r) => r.id === selectedId.value) ?? draft.rules[0])
const INTERVALS = [5, 10, 15, 30, 60]
const every = (m: number) => `every ${m < 60 ? `${m} min` : '1 h'}`
const TEMPLATE_ICON: Record<string, typeof Bot> = { deps: Bot, docs: FileText, small: UserCheck }
const STEPS = [
  { title: 'Write a rule', text: 'Pick repositories, authors, paths and limits.' },
  { title: 'Try it in Dry run', text: 'See what it would approve. Nothing is sent.' },
  { title: 'Go Live', text: 'Matching pull requests are approved for you.' },
]

type Mode = 'off' | 'dry' | 'live'
const mode = computed<Mode>(() => (!draft.enabled ? 'off' : draft.dryRun ? 'dry' : 'live'))
const MODES = [
  { value: 'off' as const, label: 'Off' },
  { value: 'dry' as const, label: 'Dry run' },
  { value: 'live' as const, label: 'Live' },
]
const MODE_HINT: Record<Mode, string> = {
  off: 'Nothing is checked. Your rules are kept.',
  dry: 'Dry run: shows what it would approve. Nothing is sent to GitHub.',
  live: 'Live: approves matching pull requests on GitHub under your name.',
}
const description = computed(() => {
  const s = status.value
  return s?.lastRun ? `while PR Sift is open · last check ${formatAgo(s.lastRun)}` : 'while PR Sift is open'
})

function load(next: AutoApproveStatus) {
  status.value = next
  if (!dirty.value || !saved.value) {
    Object.assign(draft, clone(next.config))
    saved.value = JSON.stringify(draft)
  }
  if (!draft.rules.some((r) => r.id === selectedId.value)) selectedId.value = draft.rules[0]?.id ?? null
}

const id = () => `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
function addRule(template?: Partial<AutoApproveRule>) {
  const next = { ...newRule(id()), ...clone(template ?? {}) }
  draft.rules.push(next)
  selectedId.value = next.id
}
function duplicate(r: AutoApproveRule) {
  const copy = { ...clone(r), id: id(), name: `${r.name} (copy)` }
  draft.rules.splice(draft.rules.indexOf(r) + 1, 0, copy)
  selectedId.value = copy.id
}
function removeRule(r: AutoApproveRule) {
  const i = draft.rules.indexOf(r)
  draft.rules.splice(i, 1)
  selectedId.value = draft.rules[Math.max(0, i - 1)]?.id ?? null
}
const numberOrNull = (v: string | number) => (v === '' || v === null ? null : Math.max(0, Math.floor(Number(v)) || 0))
function revert() {
  Object.assign(draft, JSON.parse(saved.value))
  if (!draft.rules.some((r) => r.id === selectedId.value)) selectedId.value = draft.rules[0]?.id ?? null
}

async function save() {
  error.value = ''
  try {
    const next = await bridge.invoke('autoapprove:save', clone(draft))
    saved.value = ''
    load(next)
    savedNote.value = 'Saved'
    setTimeout(() => (savedNote.value = ''), 2500)
  } catch (e) {
    error.value = errorText(e)
  }
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
const hintSource = computed(() => (hintRepos.value.length === 1 ? 'In this repo:' : 'In these repos:'))

const ACTION = {
  approved: { label: 'Approved', tone: 'success' },
  'would-approve': { label: 'Would approve', tone: 'info' },
  failed: { label: 'Failed', tone: 'danger' },
} as const

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
  <header class="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-border px-8 py-[22px]">
    <div class="flex min-w-[280px] flex-1 flex-col gap-0.5">
      <h1 class="text-xl font-semibold tracking-[-0.01em]">Auto-approve</h1>
      <p class="flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-muted-foreground">
        Checks open pull requests in your rules' repositories, and those waiting for your review,
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="xs" aria-label="How often to check"
              >{{ every(draft.intervalMinutes) }}<ChevronDown data-icon="inline-end"
            /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-auto">
            <DropdownMenuRadioGroup :model-value="String(draft.intervalMinutes)" @update:model-value="(v) => setCheckEvery(Number(v))">
              <DropdownMenuRadioItem v-for="m in INTERVALS" :key="m" :value="String(m)">{{ every(m) }}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {{ description }}
      </p>
    </div>
    <Hint text="Check the pull requests waiting for you right now">
      <Button variant="outline" :disabled="status?.running || !draft.enabled" @click="runNow">
        <Spinner v-if="status?.running" /><Play v-else /> Check now
      </Button>
    </Hint>
    <div class="flex flex-col items-end gap-1.5">
      <ToggleGroup
        type="single"
        variant="outline"
        :model-value="mode"
        aria-label="Mode"
        @update:model-value="(v) => v && setMode(v as Mode)"
      >
        <ToggleGroupItem
          v-for="m in MODES"
          :key="m.value"
          :value="m.value"
          :class="m.value === 'dry' ? 'data-[state=on]:text-attention' : m.value === 'live' ? 'data-[state=on]:text-success-fg' : ''"
          >{{ m.label }}</ToggleGroupItem
        >
      </ToggleGroup>
      <span class="text-xs text-faint">{{ MODE_HINT[mode] }}</span>
    </div>
  </header>

  <Alert v-if="error || status?.lastError" variant="destructive" class="mx-8 mt-4 w-auto"
    ><CircleAlert /><AlertDescription>{{ error || status?.lastError }}</AlertDescription></Alert
  >

  <!-- No rules yet: explain the feature and offer the templates -->
  <section v-if="!draft.rules.length" aria-label="Get started" class="mx-auto flex w-full max-w-[880px] flex-col gap-8 px-8 py-12">
    <div class="flex flex-col items-start gap-3">
      <span class="flex size-10 items-center justify-center rounded-lg bg-success-fg/12 text-success-fg"
        ><ShieldCheck class="size-5"
      /></span>
      <h2 class="text-lg font-semibold">Let PR Sift approve the safe pull requests</h2>
      <p class="max-w-[600px] text-muted-foreground">
        A rule says which pull requests are safe to approve: who opened them, where, and what they change. PR Sift checks the open pull
        requests in the repositories you name, and any waiting for your review, and approves the ones that match.
      </p>
    </div>

    <ol class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <li v-for="(step, i) in STEPS" :key="step.title" class="flex gap-3">
        <span
          class="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold text-muted-foreground tabular-nums"
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
      <span class="text-xs text-faint">Nothing is approved until you switch the mode to Live.</span>
    </div>
  </section>

  <!-- Wide: rules | editor | preview. Narrower: the preview drops under the editor, then the rules go on top. -->
  <div v-else class="@container">
    <div class="flex min-h-0 flex-col @3xl:flex-row @3xl:items-stretch">
      <!-- Rules -->
      <div class="shrink-0 border-b border-border @3xl:w-52 @3xl:border-r @3xl:border-b-0">
        <aside aria-label="Rules" class="flex flex-col gap-1 px-3.5 py-[18px] @3xl:sticky @3xl:top-0">
          <SectionLabel class="px-2 pb-2">Rules</SectionLabel>
          <button
            v-for="r in draft.rules"
            :key="r.id"
            type="button"
            class="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors"
            :class="rule?.id === r.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'"
            @click="selectedId = r.id"
          >
            <Switch v-model="r.enabled" size="sm" :aria-label="`Turn ${r.name} on or off`" @click.stop />
            <span class="flex min-w-0 flex-col">
              <span
                class="truncate font-medium"
                :class="r.enabled ? (rule?.id === r.id ? '' : 'text-foreground/80') : 'text-muted-foreground'"
                >{{ r.name || 'Untitled rule' }}</span
              >
              <span class="text-xs text-faint">
                <template v-if="!r.enabled">Off</template>
                <template v-else-if="matchCount(r) !== undefined">{{ matchCount(r) }} match now</template>
                <template v-else>&nbsp;</template>
              </span>
            </span>
          </button>
          <Button variant="outline" class="mt-2" @click="addRule()"><Plus /> New rule</Button>
          <SectionLabel class="px-2 pt-6 pb-2">Start from</SectionLabel>
          <Hint v-for="t in TEMPLATES" :key="t.id" :text="t.description" side="right">
            <Button
              variant="ghost"
              size="sm"
              class="h-auto justify-start py-1.5 text-left whitespace-normal text-muted-foreground"
              @click="addRule(t.rule)"
            >
              <component :is="TEMPLATE_ICON[t.id] ?? Sparkles" />{{ t.label }}
            </Button>
          </Hint>
        </aside>
      </div>

      <div class="flex min-w-0 flex-1 flex-col @5xl:flex-row @5xl:items-start">
        <!-- The chosen rule -->
        <section v-if="rule" aria-label="Rule" class="@container flex min-w-0 flex-1 flex-col gap-[18px] px-7 py-5">
          <div class="flex items-center gap-2.5">
            <input
              v-model="rule.name"
              aria-label="Rule name"
              class="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-faint"
              placeholder="Name this rule"
            />
            <span v-if="savedNote" class="text-xs text-success-fg">{{ savedNote }}</span>
            <Hint text="Duplicate this rule">
              <Button size="icon-sm" variant="ghost" class="text-faint" aria-label="Duplicate rule" @click="duplicate(rule)"
                ><Copy
              /></Button>
            </Hint>
            <Hint text="Delete this rule">
              <Button
                size="icon-sm"
                variant="ghost"
                class="text-faint hover:text-destructive"
                aria-label="Delete rule"
                @click="removeRule(rule)"
                ><Trash2
              /></Button>
            </Hint>
            <Hint v-if="dirty" text="Throw away the changes since the last save">
              <Button size="icon-sm" variant="ghost" class="text-faint" aria-label="Discard changes" @click="revert"><Undo2 /></Button>
            </Hint>
            <Button size="sm" variant="success" :disabled="!dirty" @click="save">Save</Button>
          </div>
          <p class="-mt-2 text-xs text-faint">
            A pull request is approved when it meets every condition of at least one rule that is on. Leave a field empty to allow anything.
          </p>

          <SectionLabel>Where</SectionLabel>
          <div class="grid grid-cols-1 gap-4 @xl:grid-cols-2">
            <Field>
              <FieldLabel>Repositories</FieldLabel>
              <RepoPicker v-model="rule.repos" :options="repoOptions" />
            </Field>
            <Field>
              <FieldLabel>Into branches</FieldLabel>
              <TagInput v-model="rule.baseBranches" label="Into branches" placeholder="Any branch" mono :suggestions="branchSuggestions" />
            </Field>
          </div>

          <SectionLabel>Who</SectionLabel>
          <div class="grid grid-cols-1 gap-4 @xl:grid-cols-2">
            <Field>
              <FieldLabel>Only from</FieldLabel>
              <TagInput
                v-model="rule.authors"
                label="Only from"
                placeholder="Anyone. Type a name to search"
                :suggestions="peopleSuggestions"
                :search="findPeople"
                suggest-label="People here:"
              />
            </Field>
            <Field>
              <FieldLabel>Never from</FieldLabel>
              <TagInput
                v-model="rule.excludeAuthors"
                label="Never from"
                placeholder="Nobody. Type a name to search"
                :suggestions="peopleSuggestions"
                :search="findPeople"
                :chips="false"
              />
            </Field>
          </div>

          <SectionLabel>What it changes</SectionLabel>
          <div class="grid grid-cols-1 gap-4 @xl:grid-cols-2">
            <Field>
              <Hint text="Every changed file has to match one of these patterns. ** means any folders.">
                <FieldLabel class="w-fit">Every file is in</FieldLabel>
              </Hint>
              <TagInput
                v-model="rule.paths"
                label="Every file is in"
                placeholder="Any file"
                mono
                :suggestions="pathSuggestions"
                :suggest-label="hintSource"
              />
            </Field>
            <Field>
              <FieldLabel>Has one of these labels</FieldLabel>
              <TagInput
                v-model="rule.labels"
                label="Has one of these labels"
                placeholder="Any labels"
                :suggestions="labelSuggestions"
                :suggest-label="labelSuggestions.length ? hintSource.replace('In', 'Labels in') : undefined"
              />
            </Field>
          </div>
          <div class="flex flex-wrap items-center gap-x-[22px] gap-y-2 text-[13px] text-foreground/80">
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
            <Hint text="Gives the author time to push a fix before you approve.">
              <Label class="gap-1.5 font-normal"
                >Wait
                <Input
                  inputmode="numeric"
                  class="h-7 w-14 text-center"
                  :model-value="rule.minAgeMinutes"
                  @update:model-value="(v) => (rule!.minAgeMinutes = numberOrNull(v) ?? 0)"
                />
                min after the last push</Label
              >
            </Hint>
          </div>
          <div class="flex flex-wrap gap-[22px] text-[13px] text-foreground/80">
            <Label class="font-normal"><Switch v-model="rule.requireChecks" size="sm" /> CI passed</Label>
            <Label class="font-normal"><Switch v-model="rule.requireMergeable" size="sm" /> No conflicts</Label>
            <Label class="font-normal"><Switch v-model="rule.skipChangesRequested" size="sm" /> Nobody asked for changes</Label>
          </div>

          <Button
            variant="ghost"
            size="sm"
            class="-ml-2 w-fit text-muted-foreground"
            :aria-expanded="moreOpen"
            @click="moreOpen = !moreOpen"
          >
            <ChevronDown class="transition-transform" :class="{ 'rotate-180': moreOpen }" /> More conditions and the review comment
          </Button>
          <div v-if="moreOpen" class="grid grid-cols-1 gap-4 @xl:grid-cols-2">
            <Field>
              <FieldLabel>No file may be in</FieldLabel>
              <TagInput
                v-model="rule.blockedPaths"
                label="No file may be in"
                placeholder="Nothing blocked"
                mono
                :suggestions="pathSuggestions"
              />
            </Field>
            <Field>
              <FieldLabel>Not with these labels</FieldLabel>
              <TagInput v-model="rule.blockedLabels" label="Not with these labels" placeholder="None" :suggestions="labelSuggestions" />
            </Field>
            <Field>
              <FieldLabel>Title has one of</FieldLabel>
              <TagInput
                v-model="rule.titleWords"
                label="Title has one of"
                placeholder="Any title"
                :suggestions="[{ value: 'chore(deps)' }, { value: 'docs:' }, { value: 'docs(' }]"
              />
            </Field>
            <Field>
              <FieldLabel for="rule-comment">Review comment</FieldLabel>
              <Textarea id="rule-comment" v-model="rule.comment" rows="2" placeholder="Left empty, the approval has no comment." />
            </Field>
          </div>
        </section>

        <!-- What the chosen rule catches right now -->
        <aside
          v-if="rule"
          aria-label="Preview"
          class="order-first mx-7 mt-5 flex max-h-[320px] shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-[12.5px] @5xl:sticky @5xl:order-none @5xl:top-5 @5xl:my-5 @5xl:mr-6 @5xl:ml-0 @5xl:max-h-[calc(100vh-40px)] @5xl:mt-5 @5xl:w-[280px] @6xl:w-[300px]"
        >
          <div class="flex items-start gap-2 px-3.5 pt-3.5 pb-2.5">
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <span class="text-[13px] font-semibold">This rule right now</span>
              <span class="text-xs text-faint"
                >Open pull requests {{ rule.repos.length ? 'in these repositories' : 'waiting for your review' }}, checked against “{{
                  rule.name || 'this rule'
                }}” as you edit.</span
              >
            </div>
            <Hint text="Ask GitHub again">
              <Button
                size="icon-xs"
                variant="ghost"
                class="text-faint"
                aria-label="Refresh"
                :disabled="previewing"
                @click="runPreview(true)"
              >
                <Spinner v-if="previewing" /><RefreshCw v-else />
              </Button>
            </Hint>
          </div>
          <p v-if="previewError" class="px-3.5 pb-3 text-xs text-destructive">{{ previewError }}</p>
          <div v-else-if="!evaluations" class="flex items-center gap-2 px-3.5 pb-3 text-faint">
            <Spinner class="size-3" /> Asking GitHub…
          </div>
          <template v-else>
            <div class="flex gap-2 px-3.5 pb-3">
              <StatusPill tone="success">{{ forRule.yes.length }} would be approved</StatusPill>
              <StatusPill>{{ forRule.no.length }} not</StatusPill>
            </div>
            <p v-if="!evaluations.length" class="border-t border-border px-3.5 py-3 text-faint">
              No open pull requests to check right now.
            </p>
            <ul class="overflow-y-auto">
              <li v-for="e in forRule.yes" :key="e.pull.url" class="border-t border-border">
                <button type="button" class="flex w-full gap-2 px-3.5 py-[9px] text-left hover:bg-secondary" @click="openPull(e)">
                  <span class="font-bold text-success-fg" aria-label="Would be approved">✓</span>
                  <span class="flex min-w-0 flex-col gap-0.5">
                    <span class="font-medium">{{ e.pull.title }}</span>
                    <span class="truncate text-xs text-faint"
                      >{{ e.pull.repo }} #{{ e.pull.number }} · {{ e.pull.author
                      }}<template v-if="e.pull.changedFiles !== undefined">
                        · {{ e.pull.changedFiles }} {{ e.pull.changedFiles === 1 ? 'file' : 'files' }}</template
                      ></span
                    >
                  </span>
                </button>
              </li>
              <li v-for="{ e, why } in forRule.no" :key="e.pull.url" class="border-t border-border">
                <button
                  type="button"
                  class="flex w-full gap-2 px-3.5 py-[9px] text-left opacity-80 hover:bg-secondary hover:opacity-100"
                  @click="openPull(e)"
                >
                  <span class="font-bold text-faint" aria-label="Not approved">–</span>
                  <span class="flex min-w-0 flex-col gap-0.5">
                    <span class="font-medium text-foreground/80">{{ e.pull.title }}</span>
                    <span class="text-xs text-faint">#{{ e.pull.number }} · {{ why }}</span>
                  </span>
                </button>
              </li>
            </ul>
          </template>
        </aside>
      </div>
    </div>
  </div>

  <section v-if="draft.rules.length || status?.log.length" class="flex flex-col gap-2 border-t border-border px-8 py-6">
    <div class="flex items-center">
      <SectionLabel class="flex-1">Activity</SectionLabel>
      <Button v-if="status?.log.length" size="xs" variant="ghost" @click="bridge.invoke('autoapprove:clear-log').then(load)">Clear</Button>
    </div>
    <p v-if="!status?.log.length" class="text-faint">Nothing yet. Approvals, and in a dry run what would be approved, show up here.</p>
    <ul v-else class="overflow-hidden rounded-lg border border-border bg-card">
      <li v-for="entry in status.log" :key="entry.id" class="flex items-center gap-3 border-t border-border px-5 py-2.5 first:border-t-0">
        <StatusPill :tone="ACTION[entry.action].tone" class="w-[118px] justify-center">{{ ACTION[entry.action].label }}</StatusPill>
        <div class="flex min-w-0 flex-1 flex-col">
          <a :href="entry.pull.url" target="_blank" rel="noreferrer" class="truncate hover:text-emphasis">{{ entry.pull.title }}</a>
          <span class="truncate text-xs text-faint"
            >{{ entry.pull.owner }}/{{ entry.pull.repo }} #{{ entry.pull.number }} · {{ entry.rule }} · {{ formatAgo(entry.at)
            }}<template v-if="entry.error"> · {{ entry.error }}</template></span
          >
        </div>
      </li>
    </ul>
  </section>

  <ConfirmDialog
    :open="goingLive"
    title="Approve for real?"
    description="From the next check, pull requests that match a rule that is on are approved on GitHub under your name. Everyone on the pull request sees the approval."
    confirm="Go live"
    @update:open="(v) => (goingLive = v)"
    @confirm="((goingLive = false), applyMode('live'))"
  />
</template>
