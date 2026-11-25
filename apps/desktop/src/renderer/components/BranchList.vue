<script setup lang="ts">
import { usePathText } from '~/useProjectFolders'
import { computed, onMounted, shallowRef } from 'vue'
import { ArrowDownUp, CircleAlert, Copy, Ellipsis, ExternalLink, GitMerge, GitPullRequest, RefreshCw, Search, Trash2, X } from '@lucide/vue'
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
import { Spinner } from '@/components/ui/spinner'
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

const short = usePathText()

const {
  repo,
  github,
  pulls = [],
  canPush = false,
} = defineProps<{
  repo: string
  github?: { owner: string; repo: string }
  pulls?: PullItem[]
  // You may delete branches on GitHub, so the dialog offers it.
  canPush?: boolean
}>()
const emit = defineEmits<{ count: [n: number] }>()

type Filter = 'all' | 'mine' | 'merged' | 'stale' | 'local'
type Sort = 'recent' | 'oldest' | 'name'

// The last list is shown at once and refreshed behind it.
const branches = shallowRef<Branch[] | null>(readCache<Branch[]>(`branches:${repo}`)?.value ?? null)
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

const STALE = 60 * 24 * 60 * 60 * 1000
const byBranch = computed(() => new Map(pulls.map((p) => [p.branch, p])))
const locked = (b: Branch) => b.current || !!b.worktree
const local = (b: Branch) => !b.upstream && !b.merged
// Old and idle, or its copy on GitHub is gone: likely left behind.
const stale = (b: Branch) => !locked(b) && !byBranch.value.has(b.name) && (b.gone || Date.now() - b.lastCommit > STALE)

const TESTS: Record<Filter, (b: Branch) => boolean> = {
  all: () => true,
  mine: (b) => !!b.mine,
  merged: (b) => b.merged,
  stale,
  local,
}
const LABELS: Record<Filter, string> = { all: 'All', mine: 'Mine', merged: 'Merged', stale: 'Stale', local: 'Local only' }
const SORTS: Record<Sort, string> = { recent: 'Last commit', oldest: 'Oldest commit', name: 'Name' }
const counts = computed(() => {
  const list = branches.value ?? []
  return Object.fromEntries(Object.entries(TESTS).map(([k, t]) => [k, list.filter(t).length])) as Record<Filter, number>
})
const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = (branches.value ?? []).filter(
    (b) => TESTS[filter.value](b) && (!q || [b.name, b.subject, b.author ?? ''].some((x) => x.toLowerCase().includes(q))),
  )
  if (sort.value === 'name') return list.sort((a, b) => a.name.localeCompare(b.name))
  return list.sort((a, b) => (sort.value === 'recent' ? b.lastCommit - a.lastCommit : a.lastCommit - b.lastCommit))
})
const selectable = computed(() => shown.value.filter((b) => !locked(b)))
const picked = computed(() => (branches.value ?? []).filter((b) => selected.value.has(b.name)))
const unmerged = computed(() => picked.value.filter((b) => !b.merged))
const onRemote = computed(() => picked.value.filter((b) => b.upstream?.startsWith('origin/') && !b.gone))
const allState = computed(() => {
  const n = selectable.value.filter((b) => selected.value.has(b.name)).length
  return n === 0 ? false : n === selectable.value.length ? true : 'indeterminate'
})
const FILTERS = computed(() =>
  (Object.keys(LABELS) as Filter[]).map((value) => ({ value, label: LABELS[value], count: counts.value[value] })),
)

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
  const where =
    github && canPush && onRemote.value.length ? 'Deletes the local branch, and on GitHub if you choose.' : 'Deletes the local branch.'
  return `${state} ${where}`
})

const branchUrl = (name: string) =>
  github ? `https://github.com/${github.owner}/${github.repo}/tree/${name.split('/').map(encodeURIComponent).join('/')}` : undefined
// Only branches that exist on GitHub get a link; a local-only branch would open a 404.
const linkFor = (b: Branch) => (b.upstream?.startsWith('origin/') && !b.gone ? branchUrl(b.upstream.slice(7)) : undefined)
const initial = (name?: string) => (name?.trim()[0] ?? '?').toUpperCase()

function toggle(name: string, on: boolean) {
  const next = new Set(selected.value)
  if (on) next.add(name)
  else next.delete(name)
  selected.value = next
}
function toggleAll(on: boolean) {
  const next = new Set(selected.value)
  for (const b of selectable.value) {
    if (on) next.add(b.name)
    else next.delete(b.name)
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
  try {
    branches.value = writeCache(`branches:${repo}`, await bridge.invoke('branches:list', repo)).value
    emit('count', branches.value.length)
    const names = new Set(branches.value.map((b) => b.name))
    selected.value = new Set([...selected.value].filter((n) => names.has(n)))
  } catch (e) {
    error.value = errorText(e)
    branches.value ??= []
  } finally {
    loading.value = false
  }
}

function askDelete(names: string[]) {
  selected.value = new Set(names)
  asking.value = true
}

async function confirmDelete() {
  busy.value = true
  try {
    const res = await bridge.invoke('branches:delete-many', repo, [...selected.value], {
      force: true,
      remote: alsoRemote.value && !!github && canPush,
    })
    const parts = [`Deleted ${res.deleted.length} ${res.deleted.length === 1 ? 'branch' : 'branches'}`]
    if (res.remoteDeleted.length) parts.push(`${res.remoteDeleted.length} on GitHub too`)
    notice.value = parts.join(', ') + '.'
    error.value = res.failed.map((f) => `${f.name}: ${f.error}`).join('\n')
    selected.value = new Set()
  } catch (e) {
    error.value = errorText(e)
  } finally {
    busy.value = false
    asking.value = false
    await load()
  }
}

onMounted(() => {
  if (branches.value) emit('count', branches.value.length)
  void load()
})
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
          ><Spinner v-if="loading" /><RefreshCw v-else
        /></Button>
      </span>
    </div>

    <Alert v-if="error" variant="destructive"
      ><CircleAlert /><AlertDescription class="whitespace-pre-line">{{ error }}</AlertDescription></Alert
    >
    <div v-if="!branches" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Reading branches…</div>
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
      <ul>
        <li
          v-for="b in shown"
          :key="b.name"
          class="group flex h-12 items-center gap-4 border-t border-accent px-4 transition-colors first:border-t-0"
          :class="[selected.has(b.name) ? 'bg-emphasis/8' : 'hover:bg-muted/60', locked(b) ? '' : 'cursor-pointer']"
          @click="!locked(b) && toggle(b.name, !selected.has(b.name))"
        >
          <Hint :text="locked(b) ? 'Checked out, so it can’t be deleted' : ''" :disabled="!locked(b)">
            <Checkbox
              :model-value="selected.has(b.name)"
              :disabled="locked(b)"
              :aria-label="`Select ${b.name}`"
              @click.stop
              @update:model-value="(v) => toggle(b.name, v === true)"
            />
          </Hint>
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <span class="truncate font-mono text-[12.5px]" :title="b.subject ? `${b.name}\n${b.subject}` : b.name">{{ b.name }}</span>
            <StatusPill v-if="b.current" tone="info" class="text-[11px]">Checked out</StatusPill>
            <Hint v-else-if="b.worktree" :text="`Checked out in ${short(b.worktree)}`">
              <StatusPill tone="info" class="text-[11px]">In a worktree</StatusPill>
            </Hint>
            <Hint v-if="local(b)" text="Only on this computer. It was never pushed to GitHub.">
              <StatusPill class="text-[11px]">Local only</StatusPill>
            </Hint>
          </div>
          <span class="flex w-[160px] shrink-0 items-center text-xs @max-2xl:w-[110px]">
            <button
              v-if="byBranch.get(b.name)"
              type="button"
              class="inline-flex items-center gap-1.5 text-success-fg hover:underline"
              @click.stop="
                openReview({ owner: byBranch.get(b.name)!.owner, repo: byBranch.get(b.name)!.repo, number: byBranch.get(b.name)!.number })
              "
            >
              <GitPullRequest class="size-3.5" />#{{ byBranch.get(b.name)!.number }} {{ byBranch.get(b.name)!.draft ? 'Draft' : 'Open' }}
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
            <span
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
                <DropdownMenuItem variant="destructive" :disabled="locked(b)" @select="askDelete([b.name])"
                  ><Trash2 /> Delete branch</DropdownMenuItem
                >
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </li>
      </ul>
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
      <Button v-if="github && onRemote.length" size="sm" variant="outline" @click="openPicked"><ExternalLink /> Open on GitHub</Button>
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
    :title="selected.size === 1 ? `Delete ${[...selected][0]}?` : `Delete ${selected.size} branches?`"
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
      <li v-for="b in unmerged" :key="b.name">{{ b.name }}: not merged</li>
    </ul>
    <label v-if="github && canPush && onRemote.length" class="flex items-start gap-2 text-sm">
      <Checkbox v-model="alsoRemote" class="mt-0.5" />
      <span
        >Also delete {{ onRemote.length === 1 ? 'its copy' : `the ${onRemote.length} copies` }} on GitHub.
        <span class="block text-xs text-muted-foreground">A branch with an open pull request is kept on GitHub.</span></span
      >
    </label>
  </ConfirmDialog>
</template>
