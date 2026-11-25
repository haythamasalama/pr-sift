<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { CircleAlert, ExternalLink, RefreshCw, Search, Trash2 } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import Hint from './Hint.vue'
import type { Branch } from '#shared/ipc'
import type { PullItem } from '~/github'
import { bridge } from '~/bridge'
import { appInfo } from '~/appInfo'
import { errorText, formatAgo, shortPath } from '~/format'
import { openReview } from '~/navigation'
import ConfirmDialog from './ConfirmDialog.vue'
import Segmented from './Segmented.vue'
import SectionLabel from './SectionLabel.vue'
import StatusPill, { type Tone } from './StatusPill.vue'

const { repo, github, pulls = [] } = defineProps<{ repo: string; github?: { owner: string; repo: string }; pulls?: PullItem[] }>()
const emit = defineEmits<{ count: [n: number] }>()

type Filter = 'all' | 'cleanup' | 'merged' | 'gone' | 'local' | 'stale'

const branches = shallowRef<Branch[] | null>(null)
const error = shallowRef('')
const notice = shallowRef('')
const filter = shallowRef<Filter>('all')
const query = shallowRef('')
const selected = shallowRef(new Set<string>())
const asking = shallowRef(false)
const alsoRemote = shallowRef(false)
const busy = shallowRef(false)

const STALE = 60 * 24 * 60 * 60 * 1000
const byBranch = computed(() => new Map(pulls.map((p) => [p.branch, p])))
const locked = (b: Branch) => b.current || !!b.worktree
// Safe to delete: merged, or its remote branch is gone, and not checked out anywhere.
const removable = (b: Branch) => !locked(b) && (b.merged || b.gone)
const stale = (b: Branch) => Date.now() - b.lastCommit > STALE && !locked(b) && !byBranch.value.has(b.name)
const local = (b: Branch) => !b.upstream && !b.merged

const TESTS: Record<Filter, (b: Branch) => boolean> = {
  all: () => true,
  cleanup: (b) => removable(b) || stale(b),
  merged: (b) => b.merged,
  gone: (b) => b.gone,
  local,
  stale,
}
const counts = computed(() => {
  const list = branches.value ?? []
  return Object.fromEntries(Object.entries(TESTS).map(([k, t]) => [k, list.filter(t).length])) as Record<Filter, number>
})
const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (branches.value ?? []).filter(
    (b) => TESTS[filter.value](b) && (!q || b.name.toLowerCase().includes(q) || b.subject.toLowerCase().includes(q)),
  )
})
const selectable = computed(() => shown.value.filter((b) => !locked(b)))
const picked = computed(() => (branches.value ?? []).filter((b) => selected.value.has(b.name)))
const unmerged = computed(() => picked.value.filter((b) => !b.merged))
const onRemote = computed(() => picked.value.filter((b) => b.upstream?.startsWith('origin/') && !b.gone))
const allState = computed(() => {
  const n = selectable.value.filter((b) => selected.value.has(b.name)).length
  return n === 0 ? false : n === selectable.value.length ? true : 'indeterminate'
})

const FILTERS = computed(() => [
  { value: 'all' as const, label: 'All', count: counts.value.all },
  { value: 'cleanup' as const, label: 'Safe to delete', count: counts.value.cleanup },
  { value: 'merged' as const, label: 'Merged', count: counts.value.merged },
  { value: 'gone' as const, label: 'Gone on GitHub', count: counts.value.gone },
  { value: 'local' as const, label: 'Local only', count: counts.value.local },
  { value: 'stale' as const, label: 'Old', count: counts.value.stale },
])

// The one status a row leads with, most important first, with what it means on hover.
function statusOf(b: Branch): { text: string; tone: Tone; hint: string } | null {
  if (b.current) return { text: 'Checked out', tone: 'info', hint: 'This is the branch your project folder is on right now.' }
  if (b.worktree) return { text: 'In a worktree', tone: 'info', hint: `Checked out in ${shortPath(b.worktree, appInfo.home)}` }
  if (b.merged)
    return { text: 'Merged', tone: 'success', hint: 'Its commits are already in the main branch, so deleting it loses nothing.' }
  if (b.gone) return { text: 'Gone on GitHub', tone: 'attention', hint: 'The branch was deleted on GitHub. This copy is only here now.' }
  if (local(b)) return { text: 'Local only', tone: 'neutral', hint: 'Only on this computer. It was never pushed to GitHub.' }
  return null
}

const branchUrl = (name: string) =>
  github ? `https://github.com/${github.owner}/${github.repo}/tree/${name.split('/').map(encodeURIComponent).join('/')}` : undefined
// Only branches that exist on GitHub get a link; a local-only branch would open a 404.
const linkFor = (b: Branch) => (b.upstream?.startsWith('origin/') && !b.gone ? branchUrl(b.upstream.slice(7)) : undefined)

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
function selectCleanup() {
  selected.value = new Set((branches.value ?? []).filter(removable).map((b) => b.name))
}

async function load() {
  error.value = ''
  try {
    branches.value = await bridge.invoke('branches:list', repo)
    emit('count', branches.value.length)
    const names = new Set(branches.value.map((b) => b.name))
    selected.value = new Set([...selected.value].filter((n) => names.has(n)))
  } catch (e) {
    error.value = errorText(e)
    branches.value = []
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
      remote: alsoRemote.value && !!github,
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

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <div class="flex flex-wrap items-center gap-2.5">
      <InputGroup class="w-[220px]">
        <InputGroupAddon><Search /></InputGroupAddon>
        <InputGroupInput v-model="query" placeholder="Filter branches" aria-label="Filter branches" />
      </InputGroup>
      <Segmented v-model="filter" :options="FILTERS" label="Show" />
      <span class="flex-1" />
      <Hint v-if="counts.cleanup" text="Merged, or deleted on GitHub, and not checked out anywhere">
        <Button variant="outline" @click="selectCleanup">Select safe to delete</Button>
      </Hint>
      <Hint text="Read the branches again">
        <Button size="icon-sm" variant="ghost" aria-label="Refresh" @click="load"><RefreshCw /></Button>
      </Hint>
    </div>

    <p v-if="notice" class="text-xs text-success-fg">{{ notice }}</p>
    <Alert v-if="error" variant="destructive"
      ><CircleAlert /><AlertDescription class="whitespace-pre-line">{{ error }}</AlertDescription></Alert
    >
    <div v-if="!branches" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Reading branches…</div>
    <p v-else-if="!shown.length" class="text-muted-foreground">No branches match.</p>
    <div v-else class="overflow-hidden rounded-[10px] border border-border bg-card">
      <div class="flex items-center gap-3.5 px-5 py-2.5">
        <Checkbox
          :model-value="allState"
          :disabled="!selectable.length"
          aria-label="Select every branch shown"
          @update:model-value="(v) => toggleAll(v === true)"
        />
        <SectionLabel class="flex-1">Branch</SectionLabel>
        <SectionLabel class="w-[150px]">Status</SectionLabel>
        <SectionLabel class="w-[90px]">Last commit</SectionLabel>
        <span class="w-16" />
      </div>
      <ul>
        <li
          v-for="b in shown"
          :key="b.name"
          class="group flex cursor-pointer items-center gap-3.5 border-t border-border px-5 py-[11px] transition-colors"
          :class="selected.has(b.name) ? 'bg-secondary' : 'hover:bg-secondary'"
          @click="!locked(b) && toggle(b.name, !selected.has(b.name))"
        >
          <Checkbox
            :model-value="selected.has(b.name)"
            :disabled="locked(b)"
            :aria-label="`Select ${b.name}`"
            :title="locked(b) ? 'Checked out, so it can’t be deleted' : undefined"
            @click.stop
            @update:model-value="(v) => toggle(b.name, v === true)"
          />
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <div class="flex min-w-0 items-center gap-2">
              <span class="truncate font-mono text-[13px] font-medium" :title="b.name">{{ b.name }}</span>
              <button
                v-if="byBranch.get(b.name)"
                type="button"
                class="shrink-0 text-xs text-emphasis hover:underline"
                @click.stop="
                  openReview({ owner: byBranch.get(b.name)!.owner, repo: byBranch.get(b.name)!.repo, number: byBranch.get(b.name)!.number })
                "
              >
                PR #{{ byBranch.get(b.name)!.number }}
              </button>
            </div>
            <span class="truncate text-xs text-faint" :title="b.subject">{{ b.subject }}</span>
          </div>
          <span class="flex w-[150px] shrink-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <Hint v-if="statusOf(b)" :text="statusOf(b)!.hint">
              <StatusPill :tone="statusOf(b)!.tone" :dot="statusOf(b)!.tone === 'attention' || statusOf(b)!.tone === 'success'">{{
                statusOf(b)!.text
              }}</StatusPill>
            </Hint>
            <Hint v-if="b.ahead" :text="`${b.ahead} ${b.ahead === 1 ? 'commit' : 'commits'} here that are not on GitHub yet`">
              <span class="tabular-nums">↑{{ b.ahead }}<template v-if="!statusOf(b)"> not pushed</template></span>
            </Hint>
            <Hint v-if="b.behind" :text="`${b.behind} ${b.behind === 1 ? 'commit' : 'commits'} on GitHub that you have not pulled`">
              <span class="tabular-nums">↓{{ b.behind }}</span>
            </Hint>
          </span>
          <span class="w-[90px] shrink-0 text-xs text-muted-foreground">{{ formatAgo(b.lastCommit) }}</span>
          <span
            class="flex w-16 shrink-0 justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
          >
            <Hint v-if="linkFor(b)" text="Open on GitHub">
              <Button size="icon-sm" variant="ghost" as-child class="text-faint" @click.stop>
                <a :href="linkFor(b)" target="_blank" rel="noreferrer" aria-label="Open on GitHub"><ExternalLink /></a>
              </Button>
            </Hint>
            <Hint :text="locked(b) ? 'Checked out, so it can’t be deleted' : 'Delete branch'">
              <Button
                size="icon-sm"
                variant="ghost"
                class="text-faint"
                :disabled="locked(b)"
                aria-label="Delete branch"
                @click.stop="askDelete([b.name])"
              >
                <Trash2 />
              </Button>
            </Hint>
          </span>
        </li>
      </ul>
    </div>

    <!-- Floats over the list while branches are picked, so the action stays in reach. -->
    <div
      v-if="selected.size"
      class="sticky bottom-5 z-10 mx-auto flex items-center gap-4 rounded-[10px] border border-input bg-popover px-4 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
    >
      <span class="font-medium tabular-nums">{{ selected.size }} selected</span>
      <label v-if="github && onRemote.length" class="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <Checkbox v-model="alsoRemote" /> Also delete on GitHub
      </label>
      <Button size="sm" variant="ghost" @click="selected = new Set()">Clear</Button>
      <Button size="sm" variant="destructive" @click="asking = true"><Trash2 /> Delete {{ selected.size }}</Button>
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
    <label v-if="github && onRemote.length" class="flex items-start gap-2 text-sm">
      <Checkbox v-model="alsoRemote" class="mt-0.5" />
      <span
        >Also delete {{ onRemote.length === 1 ? 'its copy' : `the ${onRemote.length} copies` }} on GitHub.
        <span class="block text-xs text-muted-foreground">A branch with an open pull request is kept on GitHub.</span></span
      >
    </label>
  </ConfirmDialog>
</template>
