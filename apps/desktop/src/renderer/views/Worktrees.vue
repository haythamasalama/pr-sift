<script setup lang="ts">
import { computed, onMounted, reactive, shallowRef, watch } from 'vue'
import { CircleAlert, FolderGit2, FolderOpen, GitBranch, Lock, RefreshCw, RotateCcw, Search, Trash2, Undo2 } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import NoticeBar from '@/components/NoticeBar.vue'
import type { Repo, UndoEntry, Worktree, WorktreeDetails } from '#shared/ipc'
import { bridge } from '~/bridge'
import { appInfo } from '~/appInfo'
import { errorText, formatAgo, formatBytes, shortPath } from '~/format'
import { useProjectFolders } from '~/useProjectFolders'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import NoFolders from '~/components/NoFolders.vue'
import PageHeader from '~/components/PageHeader.vue'
import WorktreeSheet from '~/components/WorktreeSheet.vue'
import Hint from '~/components/Hint.vue'
import GithubMark from '@/components/GithubMark.vue'
import type { PullItem } from '~/github'

// With `projectPath`, shows that one project; without it, every repository in the project folders.
const { projectPath: only, pulls = [] } = defineProps<{ projectPath?: string; pulls?: PullItem[] }>()

const { settings, ready } = useProjectFolders()
const repos = shallowRef<Repo[]>([])
const details = reactive(new Map<string, WorktreeDetails>())
const scanning = shallowRef(false)
const scanned = shallowRef(false)
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
}

async function scan() {
  if (scanning.value) return
  scanning.value = true
  error.value = ''
  try {
    repos.value = only ? [await bridge.invoke('worktrees:list', only)] : await bridge.invoke('worktrees:scan')
    details.clear()
    selected.value = new Set()
    scanned.value = true
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
  <PageHeader v-if="!only" title="All worktrees" :description="summary">
    <Button v-if="settings?.roots.length" variant="outline" :disabled="scanning" @click="scan">
      <Spinner v-if="scanning" />
      <RefreshCw v-else />
      Rescan
    </Button>
  </PageHeader>

  <NoticeBar v-if="notice">
    <template #icon><Trash2 /></template>
    {{ notice.text }}
    <template #actions>
      <Button v-if="notice.undo" size="xs" variant="outline" @click="undo(notice.undo)"><Undo2 /> Undo</Button>
      <Button size="xs" variant="ghost" @click="notice = null">Dismiss</Button>
    </template>
  </NoticeBar>

  <NoFolders v-if="!only && settings && !settings.roots.length" @added="scan" />

  <div v-else class="flex flex-col gap-6" :class="only ? '' : 'p-6'">
    <div v-if="only" class="flex items-center gap-3">
      <p class="flex-1 text-muted-foreground">{{ summary }}</p>
      <Button size="sm" variant="outline" :disabled="scanning" @click="scan">
        <Spinner v-if="scanning" />
        <RefreshCw v-else />
        Rescan
      </Button>
    </div>
    <Alert v-if="error" variant="destructive">
      <CircleAlert />
      <AlertDescription class="whitespace-pre-line">{{ error }}</AlertDescription>
    </Alert>

    <div
      v-if="scanned && allWithWorktrees.length"
      class="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/60 px-4 py-1.5"
    >
      <Checkbox
        :model-value="allState"
        :disabled="!selectable.length"
        aria-label="Select every worktree shown"
        title="Select every worktree shown"
        @update:model-value="(v) => toggleAll(v === true)"
      />
      <InputGroup class="h-7 w-56 bg-background">
        <InputGroupAddon><Search /></InputGroupAddon>
        <InputGroupInput v-model="query" placeholder="Filter worktrees" aria-label="Filter worktrees" />
      </InputGroup>
      <span class="flex-1 text-xs text-muted-foreground">
        <template v-if="selected.size">{{ selected.size }} selected</template>
        <template v-else>Select worktrees to move several to the Trash at once.</template>
      </span>
      <Button v-if="selected.size" size="xs" variant="ghost" @click="selected = new Set()">Clear</Button>
      <Button v-if="selected.size" size="xs" variant="destructive" @click="bulkAsking = true"
        ><Trash2 /> Move {{ selected.size }} to Trash</Button
      >
    </div>

    <div v-if="scanning && !scanned" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Looking for repositories…</div>

    <p v-if="scanned && !withWorktrees.length && !only" class="text-muted-foreground">
      None of your {{ repos.length }} repositories has extra worktrees.
    </p>

    <section v-for="repo in withWorktrees" :key="repo.path" class="overflow-hidden rounded-lg border border-border">
      <header class="flex items-center gap-2 border-b border-border bg-secondary/50 px-4 py-2.5">
        <FolderGit2 class="size-4 shrink-0 text-muted-foreground" />
        <span class="font-semibold">{{ repo.name }}</span>
        <span class="truncate text-xs text-muted-foreground">{{ short(repo.path) }}</span>
        <span class="shrink-0 text-xs text-muted-foreground"
          >· {{ repo.worktrees.filter((w) => !w.main).length }}
          {{ repo.worktrees.filter((w) => !w.main).length === 1 ? 'worktree' : 'worktrees' }}</span
        >
        <Button
          v-if="repo.worktrees.some((w) => w.prunable)"
          class="ml-auto"
          size="xs"
          variant="outline"
          title="Runs git worktree prune for this repository"
          @click="prune(repo)"
        >
          <RotateCcw /> Clean up missing
        </Button>
      </header>
      <p v-if="repo.error" class="px-4 py-3 text-destructive">{{ repo.error }}</p>
      <ul class="divide-y divide-border">
        <li
          v-for="w in repo.worktrees"
          :key="w.path"
          class="group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors"
          :class="[w.main ? 'text-muted-foreground' : '', selected.has(w.path) ? 'bg-accent/60' : 'hover:bg-accent/30']"
          title="Show details"
          @click="sheet = { repo, worktree: w }"
        >
          <Checkbox
            v-if="!w.main"
            :model-value="selected.has(w.path)"
            :disabled="!canTrash(w)"
            :aria-label="`Select ${label(w)}`"
            @click.stop
            @update:model-value="(v) => toggle(w.path, v === true)"
          />
          <span v-else class="w-4 shrink-0" />
          <GitBranch class="size-4 shrink-0 text-muted-foreground" />
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="truncate font-mono text-[13px] font-medium" :class="{ 'font-normal': w.main }">{{ label(w) }}</span>
              <Badge v-if="!w.branch && !w.bare" variant="outline" title="No branch is checked out here, only a commit"
                >No branch · {{ w.head.slice(0, 7) }}</Badge
              >
              <Badge v-if="w.main" variant="outline">Main folder</Badge>
              <Hint v-if="pullFor(w)" :text="pullFor(w)!.title"
                ><Badge variant="outline" class="border-emphasis/40 text-emphasis">PR #{{ pullFor(w)!.number }}</Badge></Hint
              >
              <Badge v-if="w.prunable" variant="destructive">Folder missing</Badge>
              <Badge v-if="w.locked" variant="outline"><Lock /> Locked</Badge>
              <template v-if="!w.main && details.get(w.path)">
                <Hint v-if="details.get(w.path)!.changed" text="Files edited here and not committed. Trashing the worktree loses them.">
                  <Badge variant="outline" class="border-attention/50 text-attention">{{ details.get(w.path)!.changed }} uncommitted</Badge>
                </Hint>
                <Hint v-if="details.get(w.path)!.unpushed" text="Commits here that are not on GitHub yet.">
                  <Badge variant="outline" class="border-attention/50 text-attention tabular-nums"
                    >↑{{ details.get(w.path)!.unpushed }}</Badge
                  >
                </Hint>
                <Hint v-if="!details.get(w.path)!.upstream && w.branch && !w.prunable" text="This branch was never pushed to GitHub.">
                  <Badge variant="outline">Local only</Badge>
                </Hint>
              </template>
            </div>
            <span class="truncate text-xs text-muted-foreground">{{ short(w.path) }}</span>
          </div>
          <Button
            v-if="githubUrl(repo, w)"
            size="icon-sm"
            variant="ghost"
            as-child
            :title="pullFor(w) ? 'Open the pull request on GitHub' : w.branch ? 'Open the branch on GitHub' : 'Open the commit on GitHub'"
            class="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            @click.stop
          >
            <a :href="githubUrl(repo, w)" target="_blank" rel="noreferrer" aria-label="Open on GitHub"><GithubMark class="size-4" /></a>
          </Button>
          <template v-if="!w.main">
            <div class="flex w-32 shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground">
              <span v-if="details.get(w.path)?.size !== undefined" class="text-foreground tabular-nums">{{
                formatBytes(details.get(w.path)!.size)
              }}</span>
              <Spinner v-else-if="!w.prunable" class="size-3" />
              <span title="Last time a file changed here">{{ formatAgo(details.get(w.path)?.lastUsed) }}</span>
            </div>
            <div class="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <Button
                size="icon-sm"
                variant="ghost"
                :disabled="w.prunable"
                aria-label="Show in folder"
                title="Show in folder"
                @click.stop="reveal(w.path)"
              >
                <FolderOpen />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                :disabled="w.prunable || w.locked"
                aria-label="Move to Trash"
                title="Move to Trash"
                @click.stop="target = { repo, worktree: w }"
              >
                <Trash2 />
              </Button>
            </div>
          </template>
        </li>
      </ul>
    </section>

    <p v-if="!only && plainRepos.length && withWorktrees.length" class="text-xs text-muted-foreground">
      {{ plainRepos.length }} more {{ plainRepos.length === 1 ? 'repository has' : 'repositories have' }} no extra worktrees.
    </p>

    <section v-if="undoList.length" class="flex flex-col gap-2">
      <h2 class="font-semibold">Recently moved to the Trash</h2>
      <p class="text-xs text-muted-foreground">To bring one back, put its folder back from the Trash, then press Undo.</p>
      <ul class="divide-y divide-border rounded-lg border border-border">
        <li v-for="entry in undoList" :key="entry.id" class="flex items-center gap-3 px-4 py-2">
          <div class="flex min-w-0 flex-1 flex-col">
            <span class="truncate">{{ entry.branch ?? short(entry.path) }}</span>
            <span class="truncate text-xs text-muted-foreground">{{ short(entry.path) }} · {{ formatAgo(entry.removedAt) }}</span>
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
