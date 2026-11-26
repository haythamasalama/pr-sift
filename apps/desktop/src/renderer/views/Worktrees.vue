<script setup lang="ts">
import { computed, onMounted, reactive, shallowRef, watch } from 'vue'
import {
  CircleAlert,
  Code,
  Ellipsis,
  ExternalLink,
  FolderGit2,
  FolderOpen,
  GitMerge,
  GitPullRequest,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SquareTerminal,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import NoticeBar from '@/components/NoticeBar.vue'
import type { Repo, Worktree, WorktreeDetails } from '#shared/ipc'
import { bridge } from '~/bridge'
import { isFresh, readCache, writeCache } from '~/cache'
import { errorText, formatAgo, formatBytes } from '~/format'
import { openPullLink, openWorktree } from '~/navigation'
import { usePathText, useProjectFolders } from '~/useProjectFolders'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import NoFolders from '~/components/NoFolders.vue'
import PageHeader from '~/components/PageHeader.vue'
import PathText from '~/components/PathText.vue'
import WorktreeDialog from '~/components/WorktreeDialog.vue'
import Hint from '~/components/Hint.vue'
import Segmented from '~/components/Segmented.vue'
import StatusPill from '~/components/StatusPill.vue'
import SectionLabel from '~/components/SectionLabel.vue'
import type { PullItem } from '~/github'

// With `projectPath`, shows that one project; without it, every repository in the project folders.
const { projectPath: only, pulls = [] } = defineProps<{ projectPath?: string; pulls?: PullItem[] }>()
const emit = defineEmits<{ count: [n: number] }>()

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
// Renames and removals change the list here; keep the saved copy in step.
watch(repos, (next) => writeCache(cacheKey, next))
const error = shallowRef('')
const notice = shallowRef<{ text: string } | null>(null)
const target = shallowRef<{ repo: Repo; worktree: Worktree } | null>(null)
const removing = shallowRef(false)
const query = shallowRef('')
const selected = shallowRef(new Set<string>())
const bulkAsking = shallowRef(false)
// The new-worktree and rename dialog: which repository, and the worktree when renaming.
const dialog = shallowRef<{ repo: string; worktree: Worktree | null } | null>(null)
const dialogOpen = computed({ get: () => dialog.value !== null, set: (v) => !v && (dialog.value = null) })

type Filter = 'all' | 'uncommitted' | 'merged'
const filter = shallowRef<Filter>('all')
const pullFor = (w: Worktree) => (w.branch ? pulls.find((p) => p.branch === w.branch) : undefined)
const TESTS: Record<Filter, (w: Worktree) => boolean> = {
  all: () => true,
  uncommitted: (w) => !!details.get(w.path)?.changed,
  merged: (w) => !!details.get(w.path)?.merged,
}

const allWithWorktrees = computed(() => (only ? repos.value : repos.value.filter((r) => r.worktrees.length > 1 || r.error)))
const matches = (r: Repo, w: Worktree) => {
  const q = query.value.trim().toLowerCase()
  return TESTS[filter.value](w) && (!q || [w.branch ?? '', w.path, r.name].some((x) => x.toLowerCase().includes(q)))
}
// While filtering, a repository shows only the worktrees that match, and disappears when none do.
const withWorktrees = computed(() =>
  query.value.trim() || filter.value !== 'all'
    ? allWithWorktrees.value.map((r) => ({ ...r, worktrees: r.worktrees.filter((w) => matches(r, w)) })).filter((r) => r.worktrees.length)
    : allWithWorktrees.value,
)
const everyWorktree = computed(() => allWithWorktrees.value.flatMap((r) => r.worktrees))
const FILTERS = computed(() => [
  { value: 'all' as const, label: 'All', count: everyWorktree.value.length },
  { value: 'uncommitted' as const, label: 'Uncommitted', count: everyWorktree.value.filter(TESTS.uncommitted).length },
  { value: 'merged' as const, label: 'Merged', count: everyWorktree.value.filter(TESTS.merged).length },
])
const canTrash = (w: Worktree) => !w.main && !w.prunable && !w.locked
const selectableOf = (r: Repo) => r.worktrees.filter(canTrash)
const picked = computed(() => allWithWorktrees.value.flatMap((r) => r.worktrees.filter((w) => selected.value.has(w.path))))
const stateOf = (r: Repo) => {
  const list = selectableOf(r)
  const n = list.filter((w) => selected.value.has(w.path)).length
  return n === 0 ? false : n === list.length ? true : 'indeterminate'
}
function toggle(path: string, on: boolean) {
  const next = new Set(selected.value)
  if (on) next.add(path)
  else next.delete(path)
  selected.value = next
}
function toggleAll(r: Repo, on: boolean) {
  const next = new Set(selected.value)
  for (const w of selectableOf(r)) {
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
    if (d?.unpushed || (d && !d.upstream && w.branch && !d.merged)) unpushed++
  }
  const list: string[] = []
  if (changed) list.push(`${changed} of them ${changed === 1 ? 'has' : 'have'} changes that are not committed.`)
  if (unpushed) list.push(`${unpushed} of them ${unpushed === 1 ? 'has' : 'have'} commits that may not be pushed.`)
  return list
})
// What deleting the picked worktrees means, in one line.
const bulkSummary = computed(() => {
  const n = picked.value.length
  const changed = picked.value.filter((w) => details.get(w.path)?.changed).length
  const size = picked.value.reduce((sum, w) => sum + (details.get(w.path)?.size ?? 0), 0)
  const parts = [changed ? `${changed} with uncommitted changes.` : n === 1 ? 'Nothing uncommitted.' : 'Nothing uncommitted in any.']
  if (size) parts.push(`Frees ${formatBytes(size)}.`)
  parts.push(n === 1 ? 'The branch is kept.' : 'The branches are kept.')
  return parts.join(' ')
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
  notice.value = { text: `Deleted ${done.length} ${done.length === 1 ? 'worktree' : 'worktrees'}. The branches are kept.` }
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
  const size = totalSize.value ? ` · ${formatBytes(totalSize.value)}` : ''
  return `${count} ${count === 1 ? 'worktree' : 'worktrees'} in ${withWorktrees.value.length} of ${repos.value.length} repositories${size}`
})

watch(
  () => linked.value.length,
  (n) => scanned.value && emit('count', n),
)

async function openIn(w: Worktree, target: 'editor' | 'terminal') {
  try {
    const res = await bridge.invoke('worktrees:open', w.path, target)
    note.value = res.ok ? `Opened ${label(w)} in ${res.app}` : (res.error ?? 'Could not open it.')
  } catch (e) {
    note.value = errorText(e)
  }
  setTimeout(() => (note.value = ''), 3500)
}

const short = usePathText()
const folderName = (w: Worktree) => w.path.split(/[\\/]/).pop() ?? w.path
const label = (w: Worktree) => w.branch ?? folderName(w)
// Where the GitHub icon goes: the pull request, else the branch, else the commit.
function githubUrl(repo: Repo, w: Worktree) {
  if (!repo.github) return undefined
  const pull = pullFor(w)
  if (pull) return pull.url
  const base = `https://github.com/${repo.github.owner}/${repo.github.repo}`
  return w.branch ? `${base}/tree/${w.branch.split('/').map(encodeURIComponent).join('/')}` : `${base}/commit/${w.head}`
}

function onDialogDone(next: Repo, path: string) {
  const known = repos.value.some((r) => r.path === next.path)
  repos.value = known ? repos.value.map((r) => (r.path === next.path ? next : r)) : [...repos.value, next]
  const w = next.worktrees.find((x) => x.path === path)
  if (w) void loadDetails([w])
  notice.value = {
    text: dialog.value?.worktree
      ? `Renamed to ${w ? label(w) : 'the new name'}.`
      : `Made ${w ? label(w) : 'the worktree'} at ${short(path)}.`,
  }
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
    void loadDetails(repos.value.flatMap((r) => (r.worktrees.length > 1 || only ? r.worktrees.filter((w) => !w.prunable) : [])))
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
    await bridge.invoke('worktrees:remove', current.worktree.path)
    notice.value = { text: `Deleted ${label(current.worktree)}. The branch is kept.` }
    repos.value = repos.value.map((r) =>
      r.path === current.repo.path ? { ...r, worktrees: r.worktrees.filter((w) => w.path !== current.worktree.path) } : r,
    )
    details.delete(current.worktree.path)
    target.value = null
  } catch (e) {
    error.value = errorText(e)
    target.value = null
  } finally {
    removing.value = false
  }
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
      <Button size="xs" variant="ghost" @click="notice = null">Dismiss</Button>
    </template>
  </NoticeBar>

  <NoFolders v-if="!only && settings && !settings.roots.length" @added="scan" />

  <div v-else class="flex flex-col gap-3" :class="only ? '' : 'px-8 py-5'">
    <div class="flex flex-wrap items-center gap-3">
      <InputGroup v-if="!only" class="w-[280px] max-w-full">
        <InputGroupAddon><Search /></InputGroupAddon>
        <InputGroupInput v-model="query" placeholder="Filter worktrees" aria-label="Filter worktrees" />
      </InputGroup>
      <Segmented v-model="filter" :options="FILTERS" label="Show" />
      <span class="flex-1" />
      <Transition
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
        enter-active-class="transition-opacity"
        leave-active-class="transition-opacity duration-500"
      >
        <span v-if="note" class="text-xs text-muted-foreground">{{ note }}</span>
      </Transition>

      <Button size="icon-sm" variant="ghost" class="text-muted-foreground" aria-label="Rescan" :disabled="scanning" @click="scan"
        ><Spinner v-if="scanning" /><RefreshCw v-else
      /></Button>

      <Button v-if="only" size="sm" variant="outline" @click="dialog = { repo: only, worktree: null }"><Plus /> New worktree</Button>
    </div>

    <Alert v-if="error" variant="destructive">
      <CircleAlert />
      <AlertDescription class="whitespace-pre-line">{{ error }}</AlertDescription>
    </Alert>

    <div v-if="scanning && !scanned" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Looking for repositories…</div>

    <p v-if="scanned && !withWorktrees.length && !only && filter === 'all' && !query" class="text-muted-foreground">
      None of your {{ repos.length }} repositories has extra worktrees.
    </p>
    <p v-else-if="scanned && !withWorktrees.length" class="text-muted-foreground">No worktrees match.</p>

    <section v-for="repo in withWorktrees" :key="repo.path" class="flex flex-col gap-2">
      <header v-if="!only || repo.worktrees.some((w) => w.prunable)" class="flex items-center gap-2 pt-1">
        <template v-if="!only">
          <FolderGit2 class="size-4 shrink-0 text-muted-foreground" />
          <span class="font-semibold">{{ repo.name }}</span>
          <PathText class="text-xs text-muted-foreground" :path="repo.path" />
        </template>
        <span class="flex-1" />
        <Button v-if="!only" size="sm" variant="ghost" class="text-muted-foreground" @click="dialog = { repo: repo.path, worktree: null }"
          ><Plus /> New worktree</Button
        >
        <Hint v-if="repo.worktrees.some((w) => w.prunable)" text="Runs git worktree prune, so git forgets folders that are gone">
          <Button size="sm" variant="outline" @click="prune(repo)"><RotateCcw /> Clean up missing</Button>
        </Hint>
      </header>
      <p v-if="repo.error" class="text-destructive">{{ repo.error }}</p>

      <div v-if="repo.worktrees.length" class="@container overflow-hidden rounded-lg border border-border">
        <div class="flex h-9 items-center gap-4 border-b border-border px-4">
          <Checkbox
            :model-value="stateOf(repo)"
            :disabled="!selectableOf(repo).length"
            aria-label="Select all worktrees"
            @update:model-value="(v) => toggleAll(repo, v === true)"
          />
          <SectionLabel class="flex-1">Worktree · {{ repo.worktrees.length }}</SectionLabel>
          <SectionLabel class="w-[130px] @max-2xl:hidden">Pull request</SectionLabel>
          <SectionLabel class="w-16 text-right @max-xl:hidden">Size</SectionLabel>
          <span class="w-[118px]" />
        </div>
        <ul>
          <li
            v-for="w in repo.worktrees"
            :key="w.path"
            class="group flex items-center gap-4 border-t border-accent px-4 py-3.5 transition-colors first:border-t-0"
            :class="[selected.has(w.path) ? 'bg-emphasis/8' : 'hover:bg-muted/60', w.prunable ? 'opacity-75' : '']"
          >
            <Hint
              :text="w.main ? 'The project’s own folder. PR Sift never removes it.' : 'Locked in git'"
              :disabled="canTrash(w) || w.prunable"
            >
              <Checkbox
                :model-value="selected.has(w.path)"
                :disabled="!canTrash(w)"
                :aria-label="`Select ${label(w)}`"
                @update:model-value="(v) => toggle(w.path, v === true)"
              />
            </Hint>
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <div class="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  class="min-w-0 truncate text-left font-mono text-[13px] font-semibold hover:underline disabled:no-underline"
                  :title="w.prunable ? label(w) : 'See the changes'"
                  :disabled="w.prunable"
                  @click="openWorktree(w.path)"
                >
                  {{ label(w) }}
                </button>
                <StatusPill v-if="w.main" class="text-[11px]">Main folder</StatusPill>
                <StatusPill v-if="!w.branch && !w.bare" class="text-[11px]">No branch · {{ w.head.slice(0, 7) }}</StatusPill>
                <Hint v-if="w.locked" :text="w.lockReason || 'git won’t remove a locked worktree'">
                  <StatusPill class="text-[11px]">Locked</StatusPill>
                </Hint>
              </div>
              <div class="flex min-w-0 items-center gap-3 overflow-hidden text-xs whitespace-nowrap text-muted-foreground">
                <PathText :path="w.path" />
                <span v-if="w.prunable" class="shrink-0 text-destructive">Folder missing</span>
                <template v-else-if="details.get(w.path)">
                  <Hint v-if="details.get(w.path)!.changed" text="Files edited here and not committed. See them.">
                    <button type="button" class="shrink-0 text-attention hover:underline" @click="openWorktree(w.path)">
                      {{ details.get(w.path)!.changed }} uncommitted
                    </button>
                  </Hint>
                  <span v-else class="shrink-0">Clean</span>
                  <Hint v-if="details.get(w.path)!.unpushed" text="Commits here that are not on GitHub yet">
                    <span class="shrink-0 tabular-nums">↑{{ details.get(w.path)!.unpushed }} not pushed</span>
                  </Hint>
                  <Hint v-if="details.get(w.path)!.lastUsed" text="Last time a file changed here">
                    <span class="shrink-0">{{ formatAgo(details.get(w.path)!.lastUsed) }}</span>
                  </Hint>
                </template>
              </div>
            </div>
            <span class="flex w-[130px] shrink-0 items-center text-xs whitespace-nowrap @max-2xl:hidden">
              <Hint v-if="pullFor(w)" :text="pullFor(w)!.title">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 text-success-fg hover:underline"
                  @click.stop="openPullLink(pullFor(w)!.url)"
                >
                  <GitPullRequest class="size-3.5" />#{{ pullFor(w)!.number }} {{ pullFor(w)!.draft ? 'Draft' : 'Open' }}
                </button>
              </Hint>
              <Hint v-else-if="details.get(w.path)?.merged" text="Its branch is already in the main branch">
                <span class="inline-flex items-center gap-1.5 text-merged"><GitMerge class="size-3.5" />Merged</span>
              </Hint>
              <span v-else class="text-muted-foreground">No pull request</span>
            </span>
            <span class="w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums @max-xl:hidden">
              <template v-if="details.get(w.path)?.size !== undefined">{{ formatBytes(details.get(w.path)!.size) }}</template>
              <Spinner v-else-if="!w.prunable" class="ml-auto size-3" />
              <template v-else>—</template>
            </span>
            <span class="flex w-[118px] shrink-0 justify-end gap-0.5">
              <template v-if="!w.prunable">
                <Hint text="Open in your editor">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    class="text-muted-foreground"
                    aria-label="Open in editor"
                    @click="openIn(w, 'editor')"
                    ><Code
                  /></Button>
                </Hint>
                <Hint text="Open a terminal here">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    class="text-muted-foreground"
                    aria-label="Open a terminal here"
                    @click="openIn(w, 'terminal')"
                    ><SquareTerminal
                  /></Button>
                </Hint>

                <Button
                  v-if="!w.main"
                  size="icon-sm"
                  variant="ghost"
                  class="text-muted-foreground"
                  :aria-label="`Delete ${label(w)}`"
                  :disabled="w.locked"
                  @click="target = { repo, worktree: w }"
                  ><Trash2
                /></Button>

                <span v-else class="w-7 shrink-0" />
              </template>
              <Button v-else size="sm" variant="outline" @click="prune(repo)">Clean up</Button>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button size="icon-sm" variant="ghost" class="text-muted-foreground" :aria-label="`More for ${label(w)}`"
                    ><Ellipsis
                  /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-52">
                  <DropdownMenuItem :disabled="w.prunable" @select="reveal(w.path)"><FolderOpen /> Show the folder</DropdownMenuItem>
                  <DropdownMenuItem v-if="githubUrl(repo, w)" as-child
                    ><a :href="githubUrl(repo, w)" target="_blank" rel="noreferrer"><ExternalLink /> Open on GitHub</a></DropdownMenuItem
                  >
                  <DropdownMenuItem v-if="!w.main" :disabled="w.prunable" @select="dialog = { repo: repo.path, worktree: w }"
                    ><Pencil /> Rename</DropdownMenuItem
                  >
                  <template v-if="canTrash(w)">
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" @select="target = { repo, worktree: w }"><Trash2 /> Delete</DropdownMenuItem>
                  </template>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          </li>
        </ul>
      </div>
    </section>

    <p v-if="only && scanned && withWorktrees.length" class="text-xs text-muted-foreground">
      The size shows what deleting a worktree frees, hidden files such as node_modules and .env included.
    </p>
    <p v-if="!only && plainRepos.length && withWorktrees.length" class="text-xs text-muted-foreground">
      {{ plainRepos.length }} more {{ plainRepos.length === 1 ? 'repository has' : 'repositories have' }} no extra worktrees.
    </p>

    <!-- Floats over the list while worktrees are picked, so the action stays in reach. -->
    <div
      v-if="selected.size"
      role="region"
      aria-label="Selected worktrees"
      class="sticky bottom-6 z-10 mx-auto flex h-12 max-w-full items-center gap-3 rounded-lg border border-border bg-popover pr-2 pl-4 shadow-lg"
    >
      <span class="font-semibold whitespace-nowrap tabular-nums">{{ selected.size }} selected</span>
      <span class="truncate text-xs text-muted-foreground @max-3xl:hidden">{{ bulkSummary }}</span>
      <span class="h-5 w-px shrink-0 bg-border" aria-hidden="true" />
      <Button size="sm" variant="destructive" @click="bulkAsking = true"
        ><Trash2 /> Delete {{ selected.size === 1 ? 'it' : selected.size }}</Button
      >

      <Button size="icon-sm" variant="ghost" class="text-muted-foreground" aria-label="Clear the selection" @click="selected = new Set()"
        ><X
      /></Button>
    </div>
  </div>

  <WorktreeDialog v-model:open="dialogOpen" :repo="dialog?.repo ?? ''" :worktree="dialog?.worktree ?? null" @done="onDialogDone" />

  <ConfirmDialog
    :open="bulkAsking"
    :title="`Delete ${selected.size} worktrees for good?`"
    description="The folders are deleted, uncommitted changes included, and can’t be brought back. The branches stay."
    :confirm="`Delete ${selected.size} permanently`"
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
    :title="`Delete ${target ? label(target.worktree) : ''} for good?`"
    description="The folder is deleted, uncommitted changes included, and can’t be brought back. The branch stays."
    confirm="Delete permanently"
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
