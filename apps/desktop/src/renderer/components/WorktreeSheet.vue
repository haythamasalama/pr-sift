<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { ChevronDown, ChevronRight, Code, FolderOpen, GitBranch, GitCommitHorizontal, Pencil, SquareTerminal, Trash2 } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import type { Repo, Worktree, WorktreeChanges, WorktreeDetails } from '#shared/ipc'
import type { PullItem } from '~/github'
import { bridge } from '~/bridge'
import { appInfo } from '~/appInfo'
import { errorText, formatAgo, formatBytes, shortPath } from '~/format'
import { openReview } from '~/navigation'
import DiffView from './DiffView.vue'

const open = defineModel<boolean>('open', { required: true })
const { worktree, details, pull } = defineProps<{ worktree: Worktree | null; details?: WorktreeDetails; pull?: PullItem }>()
const emit = defineEmits<{ updated: [repo: Repo, path: string]; remove: [] }>()

const changes = shallowRef<WorktreeChanges | null>(null)
const loading = shallowRef(false)
const error = shallowRef('')
const note = shallowRef('')
const expanded = shallowRef<string | null>(null)
const diff = shallowRef<string | null>(null)
const renaming = shallowRef(false)
const folderName = shallowRef('')
const branchName = shallowRef('')
const saving = shallowRef(false)

const folder = computed(() => worktree?.path.split(/[\\/]/).pop() ?? '')
const title = computed(() => worktree?.branch ?? folder.value)

const STATUS: Record<string, string> = { M: 'Modified', A: 'Added', D: 'Deleted', R: 'Renamed', C: 'Copied', U: 'Conflict', '?': 'New' }
const statusOf = (s: string) => STATUS[s.trim()[0] ?? ''] ?? s.trim()
const statusClass = (s: string) => {
  const c = s.trim()[0]
  return c === 'D' ? 'text-destructive' : c === '?' || c === 'A' ? 'text-success' : c === 'U' ? 'text-destructive' : 'text-attention'
}

async function load() {
  if (!worktree || worktree.prunable) return
  loading.value = true
  error.value = ''
  expanded.value = null
  diff.value = null
  try {
    changes.value = await bridge.invoke('worktrees:changes', worktree.path)
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, worktree?.path],
  () => {
    if (!open.value) return
    renaming.value = false
    note.value = ''
    changes.value = null
    void load()
  },
  { immediate: true },
)

async function toggle(file: string) {
  if (expanded.value === file) {
    expanded.value = null
    return
  }
  expanded.value = file
  diff.value = null
  try {
    diff.value = await bridge.invoke('worktrees:diff', worktree!.path, file)
  } catch (e) {
    diff.value = ''
    error.value = errorText(e)
  }
}

async function openIn(target: 'editor' | 'terminal') {
  if (!worktree) return
  note.value = ''
  try {
    const res = await bridge.invoke('worktrees:open', worktree.path, target)
    note.value = res.ok ? `Opened in ${res.app}.` : (res.error ?? 'Could not open it.')
  } catch (e) {
    note.value = errorText(e)
  }
}

function startRename() {
  folderName.value = folder.value
  branchName.value = worktree?.branch ?? ''
  renaming.value = true
}

async function save() {
  if (!worktree) return
  saving.value = true
  error.value = ''
  try {
    let path = worktree.path
    let repo: Repo | null = null
    const nextBranch = branchName.value.trim()
    if (nextBranch && nextBranch !== (worktree.branch ?? '')) {
      repo = await bridge.invoke('worktrees:rename-branch', path, nextBranch)
    }
    const nextFolder = folderName.value.trim()
    if (nextFolder && nextFolder !== folder.value) {
      repo = await bridge.invoke('worktrees:rename', path, nextFolder)
      path = path.slice(0, path.length - folder.value.length) + nextFolder
    }
    if (repo) emit('updated', repo, path)
    renaming.value = false
  } catch (e) {
    error.value = errorText(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent class="w-[min(760px,94vw)] gap-0 p-0 sm:max-w-none">
      <template v-if="worktree">
        <SheetHeader class="border-b border-border p-5 pr-12">
          <SheetTitle class="flex flex-wrap items-center gap-2 text-base">
            <GitBranch class="size-4 text-muted-foreground" />
            {{ title }}
            <Badge v-if="!worktree.branch" variant="outline" title="No branch is checked out here, only a commit"
              >No branch · {{ worktree.head.slice(0, 7) }}</Badge
            >
            <Badge v-if="worktree.main" variant="outline">Main folder</Badge>
          </SheetTitle>
          <SheetDescription class="break-all">{{ shortPath(worktree.path, appInfo.home) }}</SheetDescription>
          <div class="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
            <span v-if="details?.size !== undefined">{{ formatBytes(details.size) }}</span>
            <span v-if="details?.lastUsed">Last used {{ formatAgo(details.lastUsed) }}</span>
            <span v-if="details?.changed">{{ details.changed }} changed {{ details.changed === 1 ? 'file' : 'files' }}</span>
            <span v-if="details?.unpushed">{{ details.unpushed }} unpushed</span>
            <span v-if="details && !details.upstream && worktree.branch">No upstream</span>
          </div>
          <div class="flex flex-wrap gap-2 pt-3">
            <Button size="sm" @click="openIn('editor')"><Code /> Open in editor</Button>
            <Button size="sm" variant="outline" @click="openIn('terminal')"><SquareTerminal /> Terminal</Button>
            <Button size="sm" variant="outline" @click="bridge.invoke('shell:reveal', worktree.path)"><FolderOpen /> Show in folder</Button>
            <Button v-if="!worktree.main" size="sm" variant="outline" :disabled="worktree.locked" @click="startRename"
              ><Pencil /> Rename</Button
            >
            <Button
              v-if="!worktree.main"
              size="sm"
              variant="ghost"
              class="text-destructive"
              :disabled="worktree.locked"
              @click="emit('remove')"
              ><Trash2 /> Move to Trash</Button
            >
          </div>
          <p v-if="note" class="pt-2 text-xs text-muted-foreground">{{ note }}</p>
        </SheetHeader>

        <div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
          <form v-if="renaming" class="flex flex-col gap-3 rounded-lg border border-border p-4" @submit.prevent="save">
            <label class="flex flex-col gap-1">
              <span class="font-medium">Folder name</span>
              <Input v-model="folderName" spellcheck="false" />
              <span class="text-xs text-muted-foreground">Moves the folder with git worktree move, in the same parent folder.</span>
            </label>
            <label class="flex flex-col gap-1">
              <span class="font-medium">{{ worktree.branch ? 'Branch name' : 'Create a branch here' }}</span>
              <Input v-model="branchName" spellcheck="false" :placeholder="worktree.branch ? '' : 'e.g. fix/login-redirect'" />
              <span class="text-xs text-muted-foreground">{{
                worktree.branch
                  ? 'Renames the local branch only. Its pull request keeps the old name on GitHub.'
                  : 'This worktree has no branch yet. Naming one keeps its commits safe.'
              }}</span>
            </label>
            <div class="flex gap-2">
              <Button type="submit" size="sm" :disabled="saving"><Spinner v-if="saving" /> Save</Button>
              <Button type="button" size="sm" variant="ghost" @click="renaming = false">Cancel</Button>
            </div>
          </form>

          <p v-if="error" class="text-destructive">{{ error }}</p>

          <section v-if="pull" class="flex flex-col gap-2">
            <h3 class="font-semibold">Pull request</h3>
            <button
              type="button"
              class="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left hover:bg-accent/60"
              @click="openReview({ owner: pull.owner, repo: pull.repo, number: pull.number })"
            >
              <span class="min-w-0 flex-1 truncate font-medium">{{ pull.title }}</span>
              <span class="text-xs text-muted-foreground">#{{ pull.number }}</span>
              <Badge variant="outline">Review</Badge>
            </button>
          </section>

          <section class="flex flex-col gap-2">
            <h3 class="font-semibold">
              Changes not committed
              <span v-if="changes" class="font-normal text-muted-foreground">{{ changes.files.length }}</span>
            </h3>
            <div v-if="loading" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Reading the folder…</div>
            <p v-else-if="worktree.prunable" class="text-muted-foreground">The folder is missing.</p>
            <p v-else-if="changes && !changes.files.length" class="text-muted-foreground">Nothing. Every change here is committed.</p>
            <ul v-else-if="changes" class="divide-y divide-border overflow-hidden rounded-lg border border-border">
              <li v-for="f in changes.files" :key="f.path">
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent/60"
                  @click="toggle(f.path)"
                >
                  <component :is="expanded === f.path ? ChevronDown : ChevronRight" class="size-3.5 shrink-0 text-muted-foreground" />
                  <span class="min-w-0 flex-1 truncate font-mono text-xs">{{ f.path }}</span>
                  <span class="text-xs" :class="statusClass(f.status)">{{ statusOf(f.status) }}</span>
                </button>
                <div v-if="expanded === f.path" class="border-t border-border bg-background">
                  <div v-if="diff === null" class="flex items-center gap-2 p-3 text-xs text-muted-foreground">
                    <Spinner /> Loading the diff…
                  </div>
                  <DiffView v-else :text="diff" />
                </div>
              </li>
            </ul>
          </section>

          <section v-if="changes?.commits.length" class="flex flex-col gap-2">
            <h3 class="font-semibold">Latest commits</h3>
            <ul class="divide-y divide-border rounded-lg border border-border">
              <li v-for="c in changes.commits" :key="c.sha" class="flex items-center gap-2 px-3 py-1.5">
                <GitCommitHorizontal class="size-3.5 shrink-0 text-muted-foreground" />
                <span class="min-w-0 flex-1 truncate">{{ c.subject }}</span>
                <span class="shrink-0 text-xs text-muted-foreground">{{ c.author }} · {{ formatAgo(c.date) }}</span>
                <span class="shrink-0 font-mono text-xs text-muted-foreground">{{ c.sha.slice(0, 7) }}</span>
              </li>
            </ul>
          </section>
        </div>
      </template>
    </SheetContent>
  </Sheet>
</template>
