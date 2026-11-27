<script setup lang="ts">
import { useRefresh } from '~/useLive'
import { usePathText } from '~/useProjectFolders'
import { computed, onMounted, shallowRef } from 'vue'
import {
  ArrowDownUp,
  CircleAlert,
  Copy,
  ChevronRight,
  Ellipsis,
  SlidersHorizontal,
  ExternalLink,
  GitMerge,
  GitPullRequest,
  Lock,
  RefreshCw,
  Search,
  Trash2,
  X,
} from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import Hint from './Hint.vue'
import type { Branch } from '#shared/ipc'
import type { PullItem } from '~/github'
import { bridge } from '~/bridge'
import { readCache, writeCache } from '~/cache'
import { errorText, formatAgo } from '~/format'
import { openReview } from '~/navigation'
import ConfirmDialog from './ConfirmDialog.vue'
import Segmented from './Segmented.vue'
import SectionLabel from './SectionLabel.vue'
import StatusPill from './StatusPill.vue'
import ProjectIcon from './ProjectIcon.vue'
import { avatars, findAvatars } from '~/authors'
import TableSkeleton from '~/components/skeletons/TableSkeleton.vue'
import FoldAllButton from './FoldAllButton.vue'

const short = usePathText()
const broken = shallowRef(new Set<string>())
// Who made a branch's last commit, and its name on GitHub when it is there, for their photo.
const person = (b: Branch) => ({
  email: b.email,
  ref: b.upstream?.startsWith('origin/') && !b.gone && b.ahead === 0 ? `refs/heads/${b.upstream.slice(7)}` : undefined,
})

// One repository (a project's Branches tab), or several at once (All branches), each under its own folding heading.
export interface BranchSource {
  path: string
  name: string
  github?: { owner: string; repo: string }
  pulls?: PullItem[]
  // You may delete branches on GitHub, so the dialog offers it.
  canPush?: boolean
}
const props = defineProps<{
  repo?: string
  github?: { owner: string; repo: string }
  pulls?: PullItem[]
  canPush?: boolean
  sources?: BranchSource[]
}>()
const emit = defineEmits<{ count: [n: number, merged: number] }>()

const list = computed<BranchSource[]>(
  () =>
    props.sources ?? (props.repo ? [{ path: props.repo, name: '', github: props.github, pulls: props.pulls, canPush: props.canPush }] : []),
)
const many = computed(() => !!props.sources)
const sourceOf = computed(() => new Map(list.value.map((x) => [x.path, x])))

type Filter = 'all' | 'mine' | 'merged' | 'stale' | 'local' | 'nopr'
type Sort = 'recent' | 'oldest' | 'name'
// A branch with the repository it lives in; `id` is unique across repositories.
type Row = Branch & { src: string; id: string }

// The last lists are shown at once and refreshed behind them.
const byRepo = shallowRef<Record<string, Branch[] | undefined>>(
  Object.fromEntries(list.value.map((x) => [x.path, readCache<Branch[]>(`branches:${x.path}`)?.value])),
)
const rows = computed<Row[]>(() =>
  list.value.flatMap((x) => (byRepo.value[x.path] ?? []).map((b) => ({ ...b, src: x.path, id: `${x.path}\u0000${b.name}` }))),
)
const branches = computed<Row[] | null>(() => (list.value.some((x) => byRepo.value[x.path]) ? rows.value : null))
const error = shallowRef('')
const notice = shallowRef('')
const filter = shallowRef<Filter>('all')
const sort = shallowRef<Sort>('recent')
const query = shallowRef('')
const selected = shallowRef(new Set<string>())
const asking = shallowRef(false)
const alsoRemote = shallowRef(false)
const busy = shallowRef(false)
const loading = shallowRef(false)
const folded = shallowRef(new Set<string>())
// Every project's branches come under one heading per repository, unless asked for one list. Remembered.
const GROUP_KEY = 'ps:branch-grouping'
const byRepository = shallowRef(
  (() => {
    try {
      return localStorage.getItem(GROUP_KEY) !== 'none'
    } catch {
      return true
    }
  })(),
)
function setByRepository(on: boolean) {
  byRepository.value = on
  try {
    localStorage.setItem(GROUP_KEY, on ? 'repo' : 'none')
  } catch {
    // Lasts until the app closes.
  }
}

const STALE = 60 * 24 * 60 * 60 * 1000
const pullsBy = computed(() => new Map(list.value.map((x) => [x.path, new Map((x.pulls ?? []).map((p) => [p.branch, p]))])))
const pullFor = (b: Row) => pullsBy.value.get(b.src)?.get(b.name)
const githubOf = (b: Row) => sourceOf.value.get(b.src)?.github
const locked = (b: Row) => b.protected || b.current || !!b.worktree
const lockedWhy = (b: Row) => (b.protected ? 'The main branch is never deleted' : 'Checked out, so it can’t be deleted')
const local = (b: Row) => !b.upstream && !b.merged
// Old and idle, or its copy on GitHub is gone: likely left behind.
const stale = (b: Row) => !locked(b) && !pullFor(b) && (b.gone || Date.now() - b.lastCommit > STALE)

const TESTS: Record<Filter, (b: Row) => boolean> = {
  all: () => true,
  mine: (b) => !!b.mine,
  merged: (b) => b.merged,
  stale,
  local,
  nopr: (b) => !b.protected && !pullFor(b),
}
const LABELS: Record<Filter, string> = {
  all: 'All',
  mine: 'Mine',
  merged: 'Merged',
  stale: 'Stale',
  local: 'Local only',
  nopr: 'No pull request',
}
// One project's list, or every project's, which asks a different question first.
const ORDER = computed<Filter[]>(() =>
  many.value ? ['all', 'merged', 'stale', 'nopr', 'mine'] : ['all', 'mine', 'merged', 'stale', 'local'],
)
const SORTS: Record<Sort, string> = { recent: 'Last commit', oldest: 'Oldest commit', name: 'Name' }
const counts = computed(() => {
  const all = branches.value ?? []
  return Object.fromEntries(Object.entries(TESTS).map(([k, t]) => [k, all.filter(t).length])) as Record<Filter, number>
})
const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  const found = (branches.value ?? []).filter(
    (b) => TESTS[filter.value](b) && (!q || [b.name, b.subject, b.author ?? ''].some((x) => x.toLowerCase().includes(q))),
  )
  // The main branch stays on top; the rest follow the chosen sort.
  const main = found.filter((b) => b.protected)
  const rest = found.filter((b) => !b.protected)
  if (sort.value === 'name') rest.sort((a, b) => a.name.localeCompare(b.name))
  else rest.sort((a, b) => (sort.value === 'recent' ? b.lastCommit - a.lastCommit : a.lastCommit - b.lastCommit))
  return [...main, ...rest]
})
// With several repositories: one heading each, biggest first.
const sections = computed(() => {
  if (!many.value || !byRepository.value)
    return [{ key: '', name: '', github: undefined, project: { name: '' }, rows: shown.value, merged: 0, open: true }]
  return list.value
    .map((x) => {
      const mine = shown.value.filter((b) => b.src === x.path)
      return {
        key: x.path,
        name: x.github ? `${x.github.owner}/${x.github.repo}` : x.name,
        github: x.github,
        project: { name: x.name, github: x.github },
        rows: mine,
        merged: mine.filter((b) => b.merged).length,
        open: !folded.value.has(x.path),
      }
    })
    .filter((x) => x.rows.length)
    .sort((a, b) => b.rows.length - a.rows.length || a.name.localeCompare(b.name))
})
const allFolded = computed(() => sections.value.every((s) => !s.open))
function foldAll(fold: boolean) {
  folded.value = fold ? new Set(sections.value.map((s) => s.key)) : new Set()
}
function fold(key: string) {
  const next = new Set(folded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  folded.value = next
}
const sourceName = (b: Row) => {
  const x = sourceOf.value.get(b.src)
  return x?.github ? `${x.github.owner}/${x.github.repo}` : (x?.name ?? '')
}
const selectable = computed(() => shown.value.filter((b) => !locked(b)))
const picked = computed(() => (branches.value ?? []).filter((b) => selected.value.has(b.id)))
const unmerged = computed(() => picked.value.filter((b) => !b.merged))
const canDeleteRemote = (b: Row) => !!githubOf(b) && !!sourceOf.value.get(b.src)?.canPush
const onRemote = computed(() => picked.value.filter((b) => b.upstream?.startsWith('origin/') && !b.gone))
const remoteDeletable = computed(() => onRemote.value.filter(canDeleteRemote))
const allState = computed(() => {
  const n = selectable.value.filter((b) => selected.value.has(b.id)).length
  return n === 0 ? false : n === selectable.value.length ? true : 'indeterminate'
})
const FILTERS = computed(() => ORDER.value.map((value) => ({ value, label: LABELS[value], count: counts.value[value] })))

// What deleting the picked branches does, in one line.
const summary = computed(() => {
  const n = picked.value.length
  const merged = n - unmerged.value.length
  const state =
    unmerged.value.length === 0
      ? n === 1
        ? 'Merged.'
        : n === 2
          ? 'Both merged.'
          : 'All merged.'
      : merged
        ? `${unmerged.value.length} not merged yet.`
        : n === 1
          ? 'Not merged yet.'
          : 'None merged yet.'
  const where = remoteDeletable.value.length ? 'Deletes the local branch, and on GitHub if you choose.' : 'Deletes the local branch.'
  return `${state} ${where}`
})

const branchUrl = (gh: { owner: string; repo: string }, name: string) =>
  `https://github.com/${gh.owner}/${gh.repo}/tree/${name.split('/').map(encodeURIComponent).join('/')}`
// Only branches that exist on GitHub get a link; a local-only branch would open a 404.
const linkFor = (b: Row) => {
  const gh = githubOf(b)
  return gh && b.upstream?.startsWith('origin/') && !b.gone ? branchUrl(gh, b.upstream.slice(7)) : undefined
}
const initial = (name?: string) => (name?.trim()[0] ?? '?').toUpperCase()
const firstName = computed(() => picked.value[0]?.name ?? '')

function toggle(id: string, on: boolean) {
  const next = new Set(selected.value)
  if (on) next.add(id)
  else next.delete(id)
  selected.value = next
}
function toggleAll(on: boolean) {
  const next = new Set(selected.value)
  for (const b of selectable.value) {
    if (on) next.add(b.id)
    else next.delete(b.id)
  }
  selected.value = next
}

function openPicked() {
  for (const b of picked.value.slice(0, 10)) {
    const url = linkFor(b)
    if (url) window.open(url, '_blank', 'noreferrer')
  }
}

async function copyName(name: string) {
  await navigator.clipboard.writeText(name)
  notice.value = `Copied ${name}`
}

async function load() {
  error.value = ''
  loading.value = true
  const failed: string[] = []
  await Promise.all(
    list.value.map(async (x) => {
      try {
        const next = writeCache(`branches:${x.path}`, await bridge.invoke('branches:list', x.path)).value
        byRepo.value = { ...byRepo.value, [x.path]: next }
        void findAvatars(x.github, next.map(person))
      } catch (e) {
        failed.push(many.value ? `${x.name}: ${errorText(e)}` : errorText(e))
        if (!byRepo.value[x.path]) byRepo.value = { ...byRepo.value, [x.path]: [] }
      }
    }),
  )
  error.value = failed.join('\n')
  emit('count', rows.value.length, rows.value.filter((b) => b.merged).length)
  const ids = new Set(rows.value.map((b) => b.id))
  selected.value = new Set([...selected.value].filter((id) => ids.has(id)))
  loading.value = false
}

function askDelete(ids: string[]) {
  selected.value = new Set(ids)
  asking.value = true
}

async function confirmDelete() {
  busy.value = true
  const bySrc = new Map<string, Row[]>()
  for (const b of picked.value) bySrc.set(b.src, [...(bySrc.get(b.src) ?? []), b])
  let deleted = 0
  let remote = 0
  const failed: string[] = []
  try {
    for (const [src, picks] of bySrc) {
      const res = await bridge.invoke(
        'branches:delete-many',
        src,
        picks.map((b) => b.name),
        { force: true, remote: alsoRemote.value && picks.some(canDeleteRemote) },
      )
      deleted += res.deleted.length
      remote += res.remoteDeleted.length
      failed.push(...res.failed.map((f) => `${f.name}: ${f.error}`))
    }
    const parts = [`Deleted ${deleted} ${deleted === 1 ? 'branch' : 'branches'}`]
    if (remote) parts.push(`${remote} on GitHub too`)
    notice.value = parts.join(', ') + '.'
    selected.value = new Set()
  } catch (e) {
    failed.push(errorText(e))
  } finally {
    busy.value = false
    asking.value = false
    await load()
    error.value = [error.value, ...failed].filter(Boolean).join('\n')
  }
}

onMounted(() => {
  if (branches.value) emit('count', rows.value.length, rows.value.filter((b) => b.merged).length)
  for (const x of list.value) void findAvatars(x.github, (byRepo.value[x.path] ?? []).map(person))
  void load()
})
// Refresh (⌘R) looks again.
useRefresh(load)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <InputGroup class="w-[280px] max-w-full">
        <InputGroupAddon><Search /></InputGroupAddon>
        <InputGroupInput v-model="query" placeholder="Filter branches" aria-label="Filter branches" />
      </InputGroup>
      <Segmented v-model="filter" :options="FILTERS" label="Show" />
      <span class="ml-auto flex shrink-0 items-center gap-2">
        <span v-if="notice" class="text-xs text-muted-foreground">{{ notice }}</span>
        <FoldAllButton v-if="many && byRepository && sections.length" :all-folded="allFolded" @fold="foldAll" />
        <DropdownMenu v-if="many">
          <DropdownMenuTrigger as-child>
            <Button size="sm" variant="outline"
              ><SlidersHorizontal /> View<span v-if="byRepository" class="text-muted-foreground">· by repository</span></Button
            >
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-48">
            <DropdownMenuLabel>Group by</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              :model-value="byRepository ? 'repo' : 'none'"
              @update:model-value="(v) => setByRepository(v === 'repo')"
            >
              <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="repo">Repository</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button size="sm" variant="outline"><ArrowDownUp /> {{ SORTS[sort] }}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-44">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup v-model="sort">
              <DropdownMenuRadioItem v-for="(label, value) in SORTS" :key="value" :value="value">{{ label }}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="icon-sm" variant="ghost" class="text-muted-foreground" aria-label="Refresh" :disabled="loading" @click="load"
          ><RefreshCw :class="{ 'animate-spin': loading }"
        /></Button>
      </span>
    </div>

    <Alert v-if="error" variant="destructive"
      ><CircleAlert /><AlertDescription class="whitespace-pre-line">{{ error }}</AlertDescription></Alert
    >
    <TableSkeleton v-if="!branches" :columns="['w-[86px]', 'w-12', 'w-14']" label="Loading branches" />
    <p v-else-if="!shown.length" class="text-muted-foreground">No branches match.</p>
    <div v-else class="@container overflow-hidden rounded-lg border border-border">
      <div class="flex h-9 items-center gap-4 border-b border-border px-4">
        <Checkbox
          :model-value="allState"
          :disabled="!selectable.length"
          :aria-label="`Select every ${LABELS[filter].toLowerCase()} branch`"
          @update:model-value="(v) => toggleAll(v === true)"
        />
        <SectionLabel class="flex-1">{{ LABELS[filter] }} · {{ shown.length }}</SectionLabel>
        <SectionLabel class="w-[160px] @max-2xl:w-[110px]">Pull request</SectionLabel>
        <SectionLabel class="w-[220px] @max-3xl:hidden">Last commit</SectionLabel>
        <SectionLabel class="w-[100px] @max-4xl:hidden">Ahead / behind</SectionLabel>
        <span class="w-16" />
      </div>
      <template v-for="sec in sections" :key="sec.key">
        <button
          v-if="sec.key"
          type="button"
          class="flex h-9 w-full items-center gap-2.5 border-t border-border bg-muted/40 px-4 text-left first:border-t-0 hover:bg-muted"
          :aria-expanded="sec.open"
          @click="fold(sec.key)"
        >
          <ChevronRight class="size-3.5 shrink-0 text-muted-foreground transition-transform" :class="sec.open ? 'rotate-90' : ''" />
          <ProjectIcon :project="sec.project!" :size="18" />
          <span class="min-w-0 truncate text-[13px] font-semibold">{{ sec.name }}</span>
          <span class="text-xs text-muted-foreground tabular-nums">{{ sec.rows.length }}</span>
          <span class="ml-auto text-xs text-muted-foreground">{{ sec.merged }} merged</span>
        </button>
        <ul v-if="sec.open" :class="sec.key ? 'border-t border-accent' : ''">
          <li
            v-for="b in sec.rows"
            :key="b.id"
            :data-branch="b.name"
            class="group flex h-12 items-center gap-4 border-t border-accent px-4 transition-colors first:border-t-0"
            :class="[selected.has(b.id) ? 'bg-emphasis/8' : 'hover:bg-muted/60', locked(b) ? '' : 'cursor-pointer']"
            @click="!locked(b) && toggle(b.id, !selected.has(b.id))"
          >
            <Hint :text="locked(b) ? lockedWhy(b) : ''" :disabled="!locked(b)">
              <Checkbox
                :model-value="selected.has(b.id)"
                :disabled="locked(b)"
                :aria-label="`Select ${b.name}`"
                @click.stop
                @update:model-value="(v) => toggle(b.id, v === true)"
              />
            </Hint>
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <span class="max-w-[75%] shrink-0 truncate font-mono text-[12.5px]" :title="b.subject ? `${b.name}\n${b.subject}` : b.name">{{
                b.name
              }}</span>
              <span v-if="many && !byRepository" class="shrink-0 text-xs text-muted-foreground">{{ sourceName(b) }}</span>
              <Hint v-if="b.protected" text="The main branch. It stays at the top and is never deleted.">
                <Lock class="size-3.5 shrink-0 text-muted-foreground" aria-label="Main branch" />
              </Hint>
              <div class="flex h-5 min-w-0 flex-wrap items-center gap-x-2 overflow-hidden">
                <StatusPill v-if="b.current" tone="info" class="text-[11px]">Checked out</StatusPill>
                <Hint v-else-if="b.worktree" :text="`Checked out in ${short(b.worktree)}`">
                  <StatusPill tone="info" class="text-[11px]">In a worktree</StatusPill>
                </Hint>
                <Hint v-if="local(b)" text="Only on this computer. It was never pushed to GitHub.">
                  <StatusPill class="text-[11px]">Local only</StatusPill>
                </Hint>
              </div>
            </div>
            <span class="flex w-[160px] shrink-0 items-center text-xs @max-2xl:w-[110px]">
              <button
                v-if="pullFor(b)"
                type="button"
                class="inline-flex items-center gap-1.5 text-success-fg hover:underline"
                @click.stop="openReview({ owner: pullFor(b)!.owner, repo: pullFor(b)!.repo, number: pullFor(b)!.number })"
              >
                <GitPullRequest class="size-3.5" />#{{ pullFor(b)!.number }} {{ pullFor(b)!.draft ? 'Draft' : 'Open' }}
              </button>
              <Hint v-else-if="b.merged" text="Its commits are already in the main branch, so deleting it loses nothing.">
                <span class="inline-flex items-center gap-1.5 text-merged"><GitMerge class="size-3.5" />Merged</span>
              </Hint>
              <Hint v-else-if="b.gone" text="The branch was deleted on GitHub. This copy is only here now.">
                <span class="text-attention">Gone on GitHub</span>
              </Hint>
              <span v-else class="text-faint">—</span>
            </span>
            <span class="flex w-[220px] shrink-0 items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground @max-3xl:hidden">
              <img
                v-if="b.email && avatars[b.email] && !broken.has(b.email)"
                :src="avatars[b.email]!"
                alt=""
                class="size-4 shrink-0 rounded-full bg-accent"
                @error="broken = new Set([...broken, b.email])"
              />
              <span
                v-else
                class="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-[9px] text-foreground"
                aria-hidden="true"
                >{{ initial(b.author) }}</span
              >
              <span class="truncate">{{ b.author ?? 'Unknown' }}</span>
              <span class="shrink-0">· {{ formatAgo(b.lastCommit) }}</span>
            </span>
            <Hint
              :text="`${b.ahead} ${b.ahead === 1 ? 'commit' : 'commits'} not on GitHub, ${b.behind} on GitHub not pulled`"
              :disabled="!b.upstream"
            >
              <span class="w-[100px] shrink-0 text-xs text-muted-foreground tabular-nums @max-4xl:hidden">{{
                b.upstream ? `${b.ahead} / ${b.behind}` : '—'
              }}</span>
            </Hint>
            <span class="flex w-16 shrink-0 justify-end gap-0.5">
              <Button v-if="linkFor(b)" size="icon-sm" variant="ghost" as-child class="text-muted-foreground" @click.stop>
                <a :href="linkFor(b)" target="_blank" rel="noreferrer" :aria-label="`Open ${b.name} on GitHub`"><ExternalLink /></a>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button size="icon-sm" variant="ghost" class="text-muted-foreground" :aria-label="`More for ${b.name}`" @click.stop
                    ><Ellipsis
                  /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-52">
                  <DropdownMenuItem @select="copyName(b.name)"><Copy /> Copy the name</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem v-if="!b.protected" variant="destructive" :disabled="locked(b)" @select="askDelete([b.id])"
                    ><Trash2 /> Delete branch</DropdownMenuItem
                  >
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          </li>
        </ul>
      </template>
    </div>

    <!-- Floats over the list while branches are picked, so the action stays in reach. -->
    <div
      v-if="selected.size"
      role="region"
      aria-label="Selected branches"
      class="sticky bottom-6 z-10 mx-auto flex h-12 max-w-full items-center gap-3 rounded-lg border border-border bg-popover pr-2 pl-4 shadow-lg"
    >
      <span class="font-semibold whitespace-nowrap tabular-nums">{{ selected.size }} selected</span>
      <span class="truncate text-xs text-muted-foreground @max-3xl:hidden">{{ summary }}</span>
      <span class="h-5 w-px shrink-0 bg-border" aria-hidden="true" />
      <Button v-if="onRemote.length && picked.some(githubOf)" size="sm" variant="outline" @click="openPicked"
        ><ExternalLink /> Open on GitHub</Button
      >
      <Button size="sm" variant="destructive" @click="asking = true"
        ><Trash2 /> Delete {{ selected.size === 1 ? 'branch' : `${selected.size} branches` }}</Button
      >

      <Button size="icon-sm" variant="ghost" class="text-muted-foreground" aria-label="Clear the selection" @click="selected = new Set()"
        ><X
      /></Button>
    </div>
  </div>

  <ConfirmDialog
    :open="asking"
    :title="selected.size === 1 ? `Delete ${firstName}?` : `Delete ${selected.size} branches?`"
    :description="
      unmerged.length
        ? 'Some of these have commits that are not merged into the default branch. They will be lost unless they exist somewhere else.'
        : 'They are merged, so no work is lost.'
    "
    :confirm="selected.size === 1 ? 'Delete branch' : `Delete ${selected.size} branches`"
    :busy="busy"
    @update:open="(v) => (asking = v)"
    @confirm="confirmDelete"
  >
    <ul v-if="unmerged.length" class="max-h-32 overflow-auto text-xs text-attention">
      <li v-for="b in unmerged" :key="b.id">{{ b.name }}: not merged</li>
    </ul>
    <label v-if="remoteDeletable.length" class="flex items-start gap-2 text-sm">
      <Checkbox v-model="alsoRemote" class="mt-0.5" />
      <span
        >Also delete {{ remoteDeletable.length === 1 ? 'its copy' : `the ${remoteDeletable.length} copies` }} on GitHub.
        <span class="block text-xs text-muted-foreground">A branch with an open pull request is kept on GitHub.</span></span
      >
    </label>
  </ConfirmDialog>
</template>
