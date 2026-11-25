<script setup lang="ts">
import { computed, onMounted, reactive, shallowRef } from 'vue'
import { CircleAlert, FolderOpen, GitBranch, Lock, RefreshCw, RotateCcw, Trash2, Undo2 } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

const withWorktrees = computed(() => repos.value.filter((r) => r.worktrees.length > 1 || r.error))
const plainRepos = computed(() => repos.value.filter((r) => r.worktrees.length <= 1 && !r.error))
const linked = computed(() => withWorktrees.value.flatMap((r) => r.worktrees.filter((w) => !w.main)))
const totalSize = computed(() => linked.value.reduce((sum, w) => sum + (details.get(w.path)?.size ?? 0), 0))
const summary = computed(() => {
  if (!scanned.value) return 'Every git worktree in your project folders.'
  const count = linked.value.length
  const size = totalSize.value ? ` · ${formatBytes(totalSize.value)}` : ''
  return `${count} ${count === 1 ? 'worktree' : 'worktrees'} in ${withWorktrees.value.length} of ${repos.value.length} repositories${size}`
})

const short = (path: string) => shortPath(path, appInfo.home)
const label = (w: Worktree) => w.branch ?? (w.detached ? `detached at ${w.head.slice(0, 7)}` : w.head.slice(0, 7))

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
    repos.value = await bridge.invoke('worktrees:scan')
    details.clear()
    scanned.value = true
    undoList.value = await bridge.invoke('worktrees:undo-list')
    void loadDetails(repos.value.flatMap((r) => (r.worktrees.length > 1 ? r.worktrees.filter((w) => !w.main) : [])))
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
  await ready
  if (settings.value?.roots.length) await scan()
})
</script>

<template>
  <PageHeader title="Worktrees" :description="summary">
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

  <NoFolders v-if="settings && !settings.roots.length" @added="scan" />

  <div v-else class="flex flex-col gap-6 p-6">
    <Alert v-if="error" variant="destructive">
      <CircleAlert />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <div v-if="scanning && !scanned" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Looking for repositories…</div>

    <p v-if="scanned && !withWorktrees.length" class="text-muted-foreground">
      None of your {{ repos.length }} repositories has extra worktrees.
    </p>

    <section v-for="repo in withWorktrees" :key="repo.path" class="overflow-hidden rounded-lg border border-border">
      <header class="flex items-center gap-2 border-b border-border bg-secondary px-4 py-2.5">
        <span class="font-semibold">{{ repo.name }}</span>
        <span class="truncate text-xs text-muted-foreground">{{ short(repo.path) }}</span>
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
          class="flex items-center gap-3 px-4 py-2.5"
          :class="{ 'text-muted-foreground': w.main }"
        >
          <GitBranch class="size-4 shrink-0 text-muted-foreground" />
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="truncate font-medium" :class="{ 'font-normal': w.main }">{{ label(w) }}</span>
              <Badge v-if="w.main" variant="outline">Main folder</Badge>
              <Badge v-if="w.prunable" variant="destructive">Folder missing</Badge>
              <Badge v-if="w.locked" variant="outline"><Lock /> Locked</Badge>
              <template v-if="!w.main && details.get(w.path)">
                <Badge v-if="details.get(w.path)!.changed" variant="outline" class="border-attention/50 text-attention">
                  {{ details.get(w.path)!.changed }} changed
                </Badge>
                <Badge v-if="details.get(w.path)!.unpushed" variant="outline" class="border-attention/50 text-attention">
                  {{ details.get(w.path)!.unpushed }} unpushed
                </Badge>
                <Badge v-if="!details.get(w.path)!.upstream && w.branch && !w.prunable" variant="outline">No upstream</Badge>
              </template>
            </div>
            <span class="truncate text-xs text-muted-foreground">{{ short(w.path) }}</span>
          </div>
          <template v-if="!w.main">
            <div class="flex w-36 shrink-0 flex-col items-end gap-0.5 text-xs">
              <span v-if="details.get(w.path)?.size !== undefined" class="font-medium tabular-nums">{{
                formatBytes(details.get(w.path)!.size)
              }}</span>
              <Spinner v-else-if="!w.prunable" class="size-3" />
              <span class="text-muted-foreground">{{ formatAgo(details.get(w.path)?.lastUsed) }}</span>
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              :disabled="w.prunable"
              aria-label="Show in folder"
              title="Show in folder"
              @click="reveal(w.path)"
            >
              <FolderOpen />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              :disabled="w.prunable || w.locked"
              aria-label="Move to Trash"
              title="Move to Trash"
              @click="target = { repo, worktree: w }"
            >
              <Trash2 />
            </Button>
          </template>
        </li>
      </ul>
    </section>

    <p v-if="plainRepos.length && withWorktrees.length" class="text-xs text-muted-foreground">
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
