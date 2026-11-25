<script setup lang="ts">
import { computed, onMounted, reactive, shallowRef, watch } from 'vue'
import {
  CircleAlert,
  Code,
  ExternalLink,
  FolderGit2,
  FolderOpen,
  LayoutGrid,
  List,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  SquareTerminal,
  Trash2,
  Undo2,
} from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import NoticeBar from '@/components/NoticeBar.vue'
import type { Repo, UndoEntry, Worktree, WorktreeDetails } from '#shared/ipc'
import { bridge } from '~/bridge'
import { isFresh, readCache, writeCache } from '~/cache'
import { appInfo } from '~/appInfo'
import { errorText, formatAgo, formatBytes, shortPath } from '~/format'
import { useProjectFolders } from '~/useProjectFolders'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import NoFolders from '~/components/NoFolders.vue'
import PageHeader from '~/components/PageHeader.vue'
import WorktreeSheet from '~/components/WorktreeSheet.vue'
import Hint from '~/components/Hint.vue'
import StatusPill from '~/components/StatusPill.vue'
import SectionLabel from '~/components/SectionLabel.vue'
import type { PullItem } from '~/github'

// With `projectPath`, shows that one project; without it, every repository in the project folders.
const { projectPath: only, pulls = [] } = defineProps<{ projectPath?: string; pulls?: PullItem[] }>()
const emit = defineEmits<{ count: [n: number] }>()

// Cards or a compact list, remembered between visits.
const LAYOUT_KEY = 'prSift.worktreeLayout'
const readLayout = (): 'cards' | 'list' => {
  try {
    return localStorage.getItem(LAYOUT_KEY) === 'list' ? 'list' : 'cards'
  } catch {
    return 'cards'
  }
}
const layout = shallowRef<'cards' | 'list'>(readLayout())
watch(layout, (v) => {
  try {
    localStorage.setItem(LAYOUT_KEY, v)
  } catch {
    // Not remembered; the default comes back next time.
  }
})
const selecting = shallowRef(false)
const note = shallowRef('')

const { settings, ready } = useProjectFolders()
// What the last scan found, shown at once while the folders are looked at again.
const cacheKey = `worktrees:${only ?? 'all'}`
const saved = readCache<Repo[]>(cacheKey)
const savedDetails = readCache<[string, WorktreeDetails][]>(`${cacheKey}:details`)
const repos = shallowRef<Repo[]>(saved?.value ?? [])
const details = reactive(new Map<string, WorktreeDetails>(savedDetails?.value ?? []))
const scanning = shallowRef(false)
const scanned = shallowRef(!!saved)
const saveDetails = () => writeCache(`${cacheKey}:details`, [...details.entries()])
// Renames, removals and undos change the list here; keep the saved copy in step.
watch(repos, (next) => writeCache(cacheKey, next))
const error = shallowRef('')
const notice = shallowRef<{ text: string; undo?: UndoEntry } | null>(null)
const undoList = shallowRef<UndoEntry[]>([])
const target = shallowRef<{ repo: Repo; worktree: Worktree } | null>(null)
const removing = shallowRef(false)
const query = shallowRef('')
const selected = shallowRef(new Set<string>())
const bulkAsking = shallowRef(false)

const allWithWorktrees = computed(() => (only ? repos.value : repos.value.filter((r) => r.worktrees.length > 1 || r.error)))
const matches = (r: Repo, w: Worktree) => {
  const q = query.value.trim().toLowerCase()
  return !q || [w.branch ?? '', w.path, r.name].some((x) => x.toLowerCase().includes(q))
}
// While filtering, a repository shows only the worktrees that match, and disappears when none do.
const withWorktrees = computed(() =>
  query.value.trim()
    ? allWithWorktrees.value.map((r) => ({ ...r, worktrees: r.worktrees.filter((w) => matches(r, w)) })).filter((r) => r.worktrees.length)
    : allWithWorktrees.value,
)
const canTrash = (w: Worktree) => !w.main && !w.prunable && !w.locked
const selectable = computed(() => withWorktrees.value.flatMap((r) => r.worktrees.filter(canTrash)))
const picked = computed(() => allWithWorktrees.value.flatMap((r) => r.worktrees.filter((w) => selected.value.has(w.path))))
const allState = computed(() => {
  const n = selectable.value.filter((w) => selected.value.has(w.path)).length
  return n === 0 ? false : n === selectable.value.length ? true : 'indeterminate'
})
function toggle(path: string, on: boolean) {
  const next = new Set(selected.value)
  if (on) next.add(path)
  else next.delete(path)
  selected.value = next
}
function toggleAll(on: boolean) {
  const next = new Set(selected.value)
  for (const w of selectable.value) {
    if (on) next.add(w.path)
    else next.delete(w.path)
  }
  selected.value = next
}
const bulkWarnings = computed(() => {
  let changed = 0
  let unpushed = 0
  for (const w of picked.value) {
    const d = details.get(w.path)
    if (d?.changed) changed++
    if (d?.unpushed || (d && !d.upstream && w.branch)) unpushed++
  }
  const list: string[] = []
  if (changed) list.push(`${changed} of them ${changed === 1 ? 'has' : 'have'} changes that are not committed.`)
  if (unpushed) list.push(`${unpushed} of them ${unpushed === 1 ? 'has' : 'have'} commits that may not be pushed.`)
  return list
})
async function confirmBulk() {
  removing.value = true
  const done: string[] = []
  const failed: string[] = []
  for (const w of picked.value) {
    try {
      await bridge.invoke('worktrees:remove', w.path)
      done.push(w.path)
      details.delete(w.path)
    } catch (e) {
      failed.push(`${label(w)}: ${errorText(e)}`)
    }
  }
  const gone = new Set(done)
  repos.value = repos.value.map((r) => ({ ...r, worktrees: r.worktrees.filter((w) => !gone.has(w.path)) }))
  undoList.value = await bridge.invoke('worktrees:undo-list')
  if (only) undoList.value = undoList.value.filter((u) => u.repo === only)
  notice.value = {
    text: `Moved ${done.length} ${done.length === 1 ? 'worktree' : 'worktrees'} to the Trash. The branches are kept; undo any of them below.`,
  }
  error.value = failed.join('\n')
  selected.value = new Set()
  removing.value = false
  bulkAsking.value = false
}
const plainRepos = computed(() => repos.value.filter((r) => r.worktrees.length <= 1 && !r.error))
const linked = computed(() => allWithWorktrees.value.flatMap((r) => r.worktrees.filter((w) => !w.main)))
const totalSize = computed(() => linked.value.reduce((sum, w) => sum + (details.get(w.path)?.size ?? 0), 0))
const summary = computed(() => {
  if (!scanned.value) return 'Every git worktree in your project folders.'
  const count = linked.value.length
  if (only)
    return count
      ? `${count} ${count === 1 ? 'worktree' : 'worktrees'} besides the main folder${totalSize.value ? ` · ${formatBytes(totalSize.value)}` : ''}`
      : 'No worktrees besides the main folder.'
  const size = totalSize.value ? ` · ${formatBytes(totalSize.value)}` : ''
  return `${count} ${count === 1 ? 'worktree' : 'worktrees'} in ${withWorktrees.value.length} of ${repos.value.length} repositories${size}`
})

watch(
  () => linked.value.length,
  (n) => scanned.value && emit('count', n),
)
const showChecks = computed(() => selecting.value || selected.value.size > 0)
const linkedOf = (r: Repo) => r.worktrees.filter((w) => !w.main)
const cleanAndPushed = (w: Worktree) => {
  const d = details.get(w.path)
  return !!d && !d.changed && !d.unpushed && d.upstream && !w.prunable
}

async function openIn(w: Worktree, target: 'editor' | 'terminal') {
  try {
    const res = await bridge.invoke('worktrees:open', w.path, target)
    note.value = res.ok ? `Opened ${label(w)} in ${res.app}` : (res.error ?? 'Could not open it.')
  } catch (e) {
    note.value = errorText(e)
  }
  setTimeout(() => (note.value = ''), 3500)
}

const short = (path: string) => shortPath(path, appInfo.home)
const folderName = (w: Worktree) => w.path.split(/[\\/]/).pop() ?? w.path
const label = (w: Worktree) => w.branch ?? folderName(w)
const pullFor = (w: Worktree) => (w.branch ? pulls.find((p) => p.branch === w.branch) : undefined)
// Where the GitHub icon goes: the pull request, else the branch, else the commit.
function githubUrl(repo: Repo, w: Worktree) {
  if (!repo.github) return undefined
  const pull = pullFor(w)
  if (pull) return pull.url
  const base = `https://github.com/${repo.github.owner}/${repo.github.repo}`
  return w.branch ? `${base}/tree/${w.branch.split('/').map(encodeURIComponent).join('/')}` : `${base}/commit/${w.head}`
}

const sheet = shallowRef<{ repo: Repo; worktree: Worktree } | null>(null)
const sheetOpen = computed({ get: () => sheet.value !== null, set: (v) => !v && (sheet.value = null) })
function onUpdated(next: Repo, path: string) {
  repos.value = repos.value.map((r) => (r.path === next.path ? next : r))
  const w = next.worktrees.find((x) => x.path === path) ?? null
  sheet.value = w ? { repo: next, worktree: w } : null
  if (w) void loadDetails([w])
}

async function loadDetails(list: Worktree[]) {
  await Promise.all(
    list.map(async (w) => {
      try {
        details.set(w.path, await bridge.invoke('worktrees:details', w.path))
      } catch {
        return
      }
    }),
  )
  saveDetails()
}

async function scan() {
  if (scanning.value) return
  scanning.value = true
  error.value = ''
  try {
    repos.value = only ? [await bridge.invoke('worktrees:list', only)] : await bridge.invoke('worktrees:scan')
    const present = new Set(repos.value.flatMap((r) => r.worktrees.map((w) => w.path)))
    for (const path of [...details.keys()]) if (!present.has(path)) details.delete(path)
    selected.value = new Set()
    scanned.value = true
    emit('count', linked.value.length)
    const undos = await bridge.invoke('worktrees:undo-list')
    undoList.value = only ? undos.filter((u) => u.repo === only) : undos
    void loadDetails(repos.value.flatMap((r) => (r.worktrees.length > 1 || only ? r.worktrees.filter((w) => !w.main) : [])))
  } catch (e) {
    error.value = errorText(e)
  } finally {
    scanning.value = false
  }
}

const warnings = computed(() => {
  const w = target.value?.worktree
  if (!w) return []
  const d = details.get(w.path)
  const list: string[] = []
  if (d?.changed) list.push(`${d.changed} ${d.changed === 1 ? 'file has' : 'files have'} changes that are not committed.`)
  if (d?.unpushed) list.push(`${d.unpushed} ${d.unpushed === 1 ? 'commit is' : 'commits are'} not pushed.`)
  if (d && !d.upstream && w.branch) list.push('The branch has no upstream, so its commits may exist only here.')
  return list
})

async function confirmRemove() {
  const current = target.value
  if (!current) return
  removing.value = true
  try {
    const undo = await bridge.invoke('worktrees:remove', current.worktree.path)
    notice.value = { text: `Moved ${label(current.worktree)} to the Trash. The branch is kept.`, undo }
    repos.value = repos.value.map((r) =>
      r.path === current.repo.path ? { ...r, worktrees: r.worktrees.filter((w) => w.path !== current.worktree.path) } : r,
    )
    details.delete(current.worktree.path)
    undoList.value = await bridge.invoke('worktrees:undo-list')
    target.value = null
  } catch (e) {
    error.value = errorText(e)
    target.value = null
  } finally {
    removing.value = false
  }
}

async function undo(entry: UndoEntry) {
  const result = await bridge.invoke('worktrees:undo', entry.id)
  if (!result.ok) {
    notice.value = { text: result.error ?? 'Could not undo.', undo: entry }
    return
  }
  notice.value = { text: `${entry.branch ?? 'The worktree'} is back at ${short(entry.path)}.` }
  await scan()
}

async function prune(repo: Repo) {
  const next = await bridge.invoke('worktrees:prune', repo.path)
  repos.value = repos.value.map((r) => (r.path === repo.path ? next : r))
}

const reveal = (path: string) => bridge.invoke('shell:reveal', path)

onMounted(async () => {
  if (saved) emit('count', linked.value.length)
  // A scan from the last half minute is still good; anything older is refreshed behind what is shown.
  if (isFresh(saved, 30_000)) return
  if (only) return scan()
  await ready
  if (settings.value?.roots.length) await scan()
})
watch(
  () => only,
  () => only && scan(),
)
</script>

<template>
  <PageHeader v-if="!only" title="All worktrees" :description="summary" />

  <NoticeBar v-if="notice">
    <template #icon><Trash2 /></template>
    {{ notice.text }}
    <template #actions>
      <Button v-if="notice.undo" size="xs" variant="outline" @click="undo(notice.undo)"><Undo2 /> Undo</Button>
      <Button size="xs" variant="ghost" @click="notice = null">Dismiss</Button>
    </template>
  </NoticeBar>

  <NoFolders v-if="!only && settings && !settings.roots.length" @added="scan" />

  <div v-else class="flex flex-col gap-3.5" :class="only ? '' : 'px-8 py-5'">
    <div class="flex flex-wrap items-center gap-2.5">
      <InputGroup class="w-[260px]">
        <InputGroupAddon><Search /></InputGroupAddon>
        <InputGroupInput v-model="query" placeholder="Filter worktrees" aria-label="Filter worktrees" />
      </InputGroup>
      <span v-if="scanned" class="text-xs text-muted-foreground"
        >{{ linked.length }} {{ linked.length === 1 ? 'worktree' : 'worktrees'
        }}<template v-if="totalSize"> · {{ formatBytes(totalSize) }} on disk</template></span
      >
      <Transition
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
        enter-active-class="transition-opacity"
        leave-active-class="transition-opacity duration-500"
      >
        <span v-if="note" class="text-xs text-muted-foreground">{{ note }}</span>
      </Transition>
      <span class="flex-1" />
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        :model-value="layout"
        aria-label="View"
        @update:model-value="(v) => v && (layout = v as 'cards' | 'list')"
      >
        <Hint text="Cards"
          ><ToggleGroupItem value="cards" aria-label="Cards"><LayoutGrid /></ToggleGroupItem
        ></Hint>
        <Hint text="List"
          ><ToggleGroupItem value="list" aria-label="List"><List /></ToggleGroupItem
        ></Hint>
      </ToggleGroup>
      <Button
        v-if="linked.length"
        variant="outline"
        :class="{ 'border-emphasis/50 text-emphasis': selecting }"
        @click="selecting = !selecting"
      >
        {{ selecting ? 'Done' : 'Select' }}
      </Button>
      <Button v-if="only || settings?.roots.length" variant="outline" :disabled="scanning" @click="scan">
        <Spinner v-if="scanning" />
        <RefreshCw v-else />
        Rescan
      </Button>
    </div>

    <Alert v-if="error" variant="destructive">
      <CircleAlert />
      <AlertDescription class="whitespace-pre-line">{{ error }}</AlertDescription>
    </Alert>

    <div v-if="scanning && !scanned" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Looking for repositories…</div>

    <p v-if="scanned && !withWorktrees.length && !only" class="text-muted-foreground">
      None of your {{ repos.length }} repositories has extra worktrees.
    </p>
    <p v-if="scanned && only && !linked.length && !query" class="text-muted-foreground">No worktrees besides the main folder.</p>

    <section v-for="repo in withWorktrees" :key="repo.path" class="flex flex-col gap-2.5">
      <header v-if="!only || repo.worktrees.some((w) => w.prunable)" class="flex items-center gap-2 pt-1">
        <template v-if="!only">
          <FolderGit2 class="size-4 shrink-0 text-faint" />
          <span class="font-semibold">{{ repo.name }}</span>
          <span class="truncate text-xs text-faint">{{ short(repo.path) }}</span>
          <span class="shrink-0 text-xs text-faint"
            >· {{ linkedOf(repo).length }} {{ linkedOf(repo).length === 1 ? 'worktree' : 'worktrees' }}</span
          >
        </template>
        <Hint v-if="repo.worktrees.some((w) => w.prunable)" text="Runs git worktree prune, so git forgets folders that are gone">
          <Button class="ml-auto" size="xs" variant="outline" @click="prune(repo)"><RotateCcw /> Clean up missing</Button>
        </Hint>
      </header>
      <p v-if="repo.error" class="text-destructive">{{ repo.error }}</p>

      <!-- Cards -->
      <div v-if="layout === 'cards'" class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,540px),1fr))] gap-3">
        <article
          v-for="w in linkedOf(repo)"
          :key="w.path"
          class="flex cursor-pointer flex-col gap-3 rounded-lg border bg-card px-[18px] py-4 transition-colors"
          :class="[selected.has(w.path) ? 'border-emphasis/60' : 'border-border hover:border-input', w.prunable ? 'opacity-75' : '']"
          @click="showChecks && canTrash(w) ? toggle(w.path, !selected.has(w.path)) : (sheet = { repo, worktree: w })"
        >
          <div class="flex min-w-0 items-center gap-2">
            <Checkbox
              v-if="showChecks"
              :model-value="selected.has(w.path)"
              :disabled="!canTrash(w)"
              :aria-label="`Select ${label(w)}`"
              @click.stop
              @update:model-value="(v) => toggle(w.path, v === true)"
            />
            <span class="min-w-0 flex-1 truncate font-mono text-[13.5px] font-medium" :title="label(w)">{{ label(w) }}</span>
            <Hint v-if="pullFor(w)" :text="pullFor(w)!.title">
              <a :href="pullFor(w)!.url" target="_blank" rel="noreferrer" class="shrink-0 text-xs text-emphasis hover:underline" @click.stop
                >PR #{{ pullFor(w)!.number }}</a
              >
            </Hint>
          </div>
          <div class="flex flex-wrap gap-2">
            <StatusPill v-if="w.prunable" tone="danger">Folder missing</StatusPill>
            <StatusPill v-if="!w.branch && !w.bare">No branch · {{ w.head.slice(0, 7) }}</StatusPill>
            <Hint v-if="w.locked" :text="w.lockReason || 'git won’t remove a locked worktree'">
              <StatusPill><Lock class="size-3" /> Locked</StatusPill>
            </Hint>
            <template v-if="details.get(w.path)">
              <Hint v-if="details.get(w.path)!.changed" text="Files edited here and not committed. Trashing the worktree loses them.">
                <StatusPill tone="attention">{{ details.get(w.path)!.changed }} uncommitted</StatusPill>
              </Hint>
              <Hint v-if="details.get(w.path)!.unpushed" text="Commits here that are not on GitHub yet.">
                <StatusPill class="tabular-nums">↑{{ details.get(w.path)!.unpushed }} not pushed</StatusPill>
              </Hint>
              <Hint v-if="!details.get(w.path)!.upstream && w.branch && !w.prunable" text="This branch was never pushed to GitHub.">
                <StatusPill>Local only</StatusPill>
              </Hint>
              <Hint v-if="cleanAndPushed(w)" text="Nothing uncommitted and every commit is on GitHub, so it is safe to trash.">
                <StatusPill tone="success">Clean, all pushed</StatusPill>
              </Hint>
            </template>
          </div>
          <div class="flex items-center gap-3 text-xs text-muted-foreground">
            <span class="min-w-0 flex-1 truncate font-mono text-faint" :title="w.path">{{ short(w.path) }}</span>
            <span v-if="details.get(w.path)?.size !== undefined" class="tabular-nums">{{ formatBytes(details.get(w.path)!.size) }}</span>
            <Spinner v-else-if="!w.prunable" class="size-3" />
            <span v-else>—</span>
            <Hint v-if="details.get(w.path)?.lastUsed" text="Last time a file changed here">
              <span>Used {{ formatAgo(details.get(w.path)!.lastUsed) }}</span>
            </Hint>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 border-t border-border pt-3" @click.stop>
            <template v-if="!w.prunable">
              <Button size="sm" variant="outline" @click="openIn(w, 'editor')"><Code /> Open in editor</Button>
              <Button size="sm" variant="outline" @click="openIn(w, 'terminal')"><SquareTerminal /> Terminal</Button>
              <Button size="sm" variant="outline" @click="reveal(w.path)"><FolderOpen /> Show folder</Button>
              <span class="flex-1" />
              <Hint
                v-if="githubUrl(repo, w)"
                :text="
                  pullFor(w) ? 'Open the pull request on GitHub' : w.branch ? 'Open the branch on GitHub' : 'Open the commit on GitHub'
                "
              >
                <Button size="icon-sm" variant="ghost" as-child class="text-faint">
                  <a :href="githubUrl(repo, w)" target="_blank" rel="noreferrer" aria-label="Open on GitHub"><ExternalLink /></a>
                </Button>
              </Hint>
              <Button size="sm" variant="outline" class="text-destructive" :disabled="w.locked" @click="target = { repo, worktree: w }"
                ><Trash2 /> Move to Trash</Button
              >
            </template>
            <template v-else>
              <span class="flex-1 text-xs text-muted-foreground">git still lists it, but the folder is gone.</span>
              <Button size="sm" variant="outline" @click="prune(repo)">Clean up</Button>
            </template>
          </div>
        </article>
      </div>

      <!-- List -->
      <div v-else class="overflow-hidden rounded-lg border border-border bg-card">
        <div class="flex items-center gap-3.5 px-5 py-2.5">
          <Checkbox
            v-if="showChecks"
            :model-value="allState"
            :disabled="!selectable.length"
            aria-label="Select every worktree shown"
            @update:model-value="(v) => toggleAll(v === true)"
          />
          <SectionLabel class="flex-1">Worktree</SectionLabel>
          <SectionLabel class="w-20 text-right">Size</SectionLabel>
          <SectionLabel class="w-24">Used</SectionLabel>
          <span class="w-24" />
        </div>
        <ul>
          <li
            v-for="w in linkedOf(repo)"
            :key="w.path"
            class="group flex cursor-pointer items-center gap-3.5 border-t border-border px-5 py-[11px] transition-colors"
            :class="selected.has(w.path) ? 'bg-secondary' : 'hover:bg-secondary'"
            @click="showChecks && canTrash(w) ? toggle(w.path, !selected.has(w.path)) : (sheet = { repo, worktree: w })"
          >
            <Checkbox
              v-if="showChecks"
              :model-value="selected.has(w.path)"
              :disabled="!canTrash(w)"
              :aria-label="`Select ${label(w)}`"
              @click.stop
              @update:model-value="(v) => toggle(w.path, v === true)"
            />
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <div class="flex min-w-0 items-center gap-2">
                <span class="truncate font-mono text-[13px] font-medium">{{ label(w) }}</span>
                <a
                  v-if="pullFor(w)"
                  :href="pullFor(w)!.url"
                  target="_blank"
                  rel="noreferrer"
                  class="shrink-0 text-xs text-emphasis hover:underline"
                  @click.stop
                  >PR #{{ pullFor(w)!.number }}</a
                >
                <StatusPill v-if="w.prunable" tone="danger" class="h-5">Folder missing</StatusPill>
                <StatusPill v-if="details.get(w.path)?.changed" tone="attention" class="h-5"
                  >{{ details.get(w.path)!.changed }} uncommitted</StatusPill
                >
                <StatusPill v-if="details.get(w.path)?.unpushed" class="h-5 tabular-nums">↑{{ details.get(w.path)!.unpushed }}</StatusPill>
              </div>
              <span class="truncate font-mono text-xs text-faint">{{ short(w.path) }}</span>
            </div>
            <span class="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{{
              details.get(w.path)?.size !== undefined ? formatBytes(details.get(w.path)!.size) : '—'
            }}</span>
            <span class="w-24 shrink-0 text-xs text-muted-foreground">{{ formatAgo(details.get(w.path)?.lastUsed) }}</span>
            <span
              class="flex w-24 shrink-0 justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
              @click.stop
            >
              <Hint text="Open in editor"
                ><Button
                  size="icon-sm"
                  variant="ghost"
                  class="text-faint"
                  aria-label="Open in editor"
                  :disabled="w.prunable"
                  @click="openIn(w, 'editor')"
                  ><Code /></Button
              ></Hint>
              <Hint text="Show folder"
                ><Button
                  size="icon-sm"
                  variant="ghost"
                  class="text-faint"
                  aria-label="Show folder"
                  :disabled="w.prunable"
                  @click="reveal(w.path)"
                  ><FolderOpen /></Button
              ></Hint>
              <Hint text="Move to Trash"
                ><Button
                  size="icon-sm"
                  variant="ghost"
                  class="text-faint"
                  aria-label="Move to Trash"
                  :disabled="w.prunable || w.locked"
                  @click="target = { repo, worktree: w }"
                  ><Trash2 /></Button
              ></Hint>
            </span>
          </li>
        </ul>
      </div>
    </section>

    <p v-if="!only && plainRepos.length && withWorktrees.length" class="text-xs text-faint">
      {{ plainRepos.length }} more {{ plainRepos.length === 1 ? 'repository has' : 'repositories have' }} no extra worktrees.
    </p>

    <div
      v-if="selected.size"
      class="sticky bottom-5 z-10 mx-auto flex items-center gap-4 rounded-lg border border-border bg-popover px-4 py-2.5 shadow-lg"
    >
      <span class="font-medium tabular-nums">{{ selected.size }} selected</span>
      <Button size="sm" variant="ghost" @click="selected = new Set()">Clear</Button>
      <Button size="sm" variant="destructive" @click="bulkAsking = true"><Trash2 /> Move {{ selected.size }} to Trash</Button>
    </div>

    <section v-if="undoList.length" class="flex flex-col gap-2 pt-2">
      <SectionLabel>Recently moved to the Trash</SectionLabel>
      <p class="text-xs text-faint">To bring one back, put its folder back from the Trash, then press Undo.</p>
      <ul class="overflow-hidden rounded-lg border border-border bg-card">
        <li v-for="entry in undoList" :key="entry.id" class="flex items-center gap-3 border-t border-border px-5 py-2.5 first:border-t-0">
          <div class="flex min-w-0 flex-1 flex-col">
            <span class="truncate font-mono text-[13px]">{{ entry.branch ?? short(entry.path) }}</span>
            <span class="truncate text-xs text-faint">{{ short(entry.path) }} · {{ formatAgo(entry.removedAt) }}</span>
          </div>
          <Button size="xs" variant="outline" @click="undo(entry)"><Undo2 /> Undo</Button>
        </li>
      </ul>
    </section>
  </div>

  <WorktreeSheet
    v-model:open="sheetOpen"
    :worktree="sheet?.worktree ?? null"
    :details="sheet ? details.get(sheet.worktree.path) : undefined"
    :pull="sheet ? pullFor(sheet.worktree) : undefined"
    @updated="onUpdated"
    @remove="sheet && ((target = sheet), (sheet = null))"
  />

  <ConfirmDialog
    :open="bulkAsking"
    :title="`Move ${selected.size} worktrees to the Trash?`"
    description="The folders go to the Trash and git forgets the worktrees. The branches stay, and you can undo each one from this page."
    :confirm="`Move ${selected.size} to Trash`"
    :busy="removing"
    @update:open="(v) => (bulkAsking = v)"
    @confirm="confirmBulk"
  >
    <ul class="max-h-40 overflow-auto text-xs text-muted-foreground">
      <li v-for="w in picked" :key="w.path" class="truncate">{{ label(w) }} · {{ short(w.path) }}</li>
    </ul>
    <Alert v-if="bulkWarnings.length" class="border-attention/50">
      <CircleAlert class="text-attention" />
      <AlertDescription>
        <p v-for="w in bulkWarnings" :key="w">{{ w }}</p>
      </AlertDescription>
    </Alert>
  </ConfirmDialog>

  <ConfirmDialog
    :open="target !== null"
    :title="`Move ${target ? label(target.worktree) : ''} to the Trash?`"
    description="The folder goes to the Trash and git forgets the worktree. The branch stays, and you can undo this from this page."
    confirm="Move to Trash"
    :busy="removing"
    @update:open="(v) => !v && (target = null)"
    @confirm="confirmRemove"
  >
    <p class="text-xs break-all text-muted-foreground">{{ target ? short(target.worktree.path) : '' }}</p>
    <Alert v-if="warnings.length" class="border-attention/50">
      <CircleAlert class="text-attention" />
      <AlertDescription>
        <p v-for="w in warnings" :key="w">{{ w }}</p>
      </AlertDescription>
    </Alert>
  </ConfirmDialog>
</template>
