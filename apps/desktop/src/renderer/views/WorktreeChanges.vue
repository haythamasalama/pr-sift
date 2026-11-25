<script setup lang="ts">
import { computed, provide, shallowRef, useTemplateRef, watch } from 'vue'
import { ArrowLeft, CircleAlert, Code, Copy, Ellipsis, ExternalLink, FolderOpen, GitPullRequest, Search, SquareTerminal } from '@lucide/vue'
import { buildTree } from '@pr-sift/core'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import FileList from '@/features/diff/FileList.vue'
import FileTree from '@/features/tree/FileTree.vue'
import { diffModeKey } from '@/features/diff/diffMode'
import { fileContextKey } from '@/features/diff/fileContext'
import { cardsExpandKey, type ExpandCommand } from '@/features/tree/expandContext'
import { notesKey, useNotes } from '@/features/notes/useNotes'
import { useViewed } from '@/features/review/useViewed'
import type { DiffMode, PrFile } from '@/lib/types'
import { bridge } from '~/bridge'
import { readCache } from '~/cache'
import { errorText, formatAgo } from '~/format'
import type { RepoActivity } from '~/github'
import { canGoBack, goBack, project } from '~/navigation'
import type { PatchMode, WorktreePatch } from '#shared/ipc'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import Hint from '~/components/Hint.vue'
import PathText from '~/components/PathText.vue'
import Segmented from '~/components/Segmented.vue'

// A worktree's changes, read like a pull request: the files on the left, their diffs on the right.
const { path } = defineProps<{ path: string }>()

const mode = shallowRef<PatchMode>('uncommitted')
const data = shallowRef<WorktreePatch | null>(null)
const loading = shallowRef(false)
const error = shallowRef('')
const note = shallowRef('')
const query = shallowRef('')
const loadedAt = shallowRef<number | null>(null)
const discarding = shallowRef<string | null>(null)
const busy = shallowRef(false)
let noteTimer: ReturnType<typeof setTimeout> | undefined

function flash(text: string) {
  note.value = text
  clearTimeout(noteTimer)
  noteTimer = setTimeout(() => (note.value = ''), 3500)
}

async function fetchPatch() {
  try {
    return await bridge.invoke('worktrees:patch', path, mode.value)
  } catch (e) {
    // The main process only works on folders from its last listing, which a fresh start does not have yet.
    if (!project.value) throw e
    await bridge.invoke('worktrees:list', project.value)
    return await bridge.invoke('worktrees:patch', path, mode.value)
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await fetchPatch()
    loadedAt.value = Date.now()
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}
watch(mode, load, { immediate: true })

const github = computed(() => data.value?.github)
const branch = computed(() => data.value?.worktree.branch ?? '')
const pull = computed(() => {
  const gh = github.value
  if (!gh || !branch.value) return undefined
  const activity = readCache<RepoActivity>(`repo:${gh.owner}/${gh.repo}`.toLowerCase())?.value
  return activity?.pulls.find((p) => p.branch === branch.value)
})

const files = computed<PrFile[]>(() =>
  (data.value?.files ?? []).map((f) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,
    hash: f.hash,
    blob_url: '',
  })),
)
const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q ? files.value.filter((f) => f.filename.toLowerCase().includes(q)) : files.value
})
const tree = computed(() => buildTree(shown.value))
const totals = computed(() => ({
  additions: files.value.reduce((n, f) => n + f.additions, 0),
  deletions: files.value.reduce((n, f) => n + f.deletions, 0),
}))
const MODES = computed(() => [
  { value: 'uncommitted' as const, label: 'Uncommitted', count: data.value?.counts.uncommitted },
  { value: 'branch' as const, label: 'Whole branch', count: data.value?.counts.branch },
])

const diffMode = shallowRef<DiffMode>('unified')
const DIFF_MODES = [
  { value: 'unified' as const, label: 'Unified' },
  { value: 'split' as const, label: 'Split' },
]
provide(diffModeKey, diffMode)
const cardsExpand = shallowRef<ExpandCommand>({ open: true, n: 0 })
provide(cardsExpandKey, cardsExpand)

const key = computed(() => `worktree:${path}:${mode.value}`)
const { viewed, isViewed, setViewed, setMany } = useViewed(key)
const notesStore = useNotes(computed(() => `worktree:${path}`))
provide(notesKey, {
  notes: notesStore.notes,
  canPost: shallowRef(false),
  showResolved: shallowRef(false),
  post: async () => {},
  add: notesStore.add,
  update: notesStore.update,
  remove: notesStore.remove,
  openOnGithub: async () => {},
})
provide(fileContextKey, {
  canExpand: shallowRef(false),
  loadLines: async () => [],
  githubUrl: async (filename) => {
    const gh = github.value
    if (!gh || !branch.value) return ''
    return `https://github.com/${gh.owner}/${gh.repo}/blob/${encodeURIComponent(branch.value)}/${filename.split('/').map(encodeURIComponent).join('/')}`
  },
  // Only the uncommitted view shows changes that can be thrown away; committed ones stay.
  discard: (filename) => {
    if (mode.value === 'uncommitted') discarding.value = filename
    else flash('Only uncommitted changes can be thrown away.')
  },
})

const list = useTemplateRef<InstanceType<typeof FileList>>('list')
function toggleFolder(folder: string, value: boolean) {
  void setMany(
    shown.value.filter((f) => !folder || f.filename.startsWith(folder + '/')),
    value,
  )
}

async function confirmDiscard() {
  const file = discarding.value
  if (!file) return
  busy.value = true
  try {
    await bridge.invoke('worktrees:discard', path, file)
    discarding.value = null
    flash(`Threw away the changes in ${file.split('/').pop()}`)
    await load()
  } catch (e) {
    discarding.value = null
    flash(errorText(e))
  } finally {
    busy.value = false
  }
}

async function openIn(target: 'editor' | 'terminal') {
  try {
    const res = await bridge.invoke('worktrees:open', path, target)
    flash(res.ok ? `Opened in ${res.app}` : (res.error ?? 'Could not open it.'))
  } catch (e) {
    flash(errorText(e))
  }
}

async function copyBranch() {
  await navigator.clipboard.writeText(branch.value)
  flash('Branch name copied')
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <header class="flex items-center gap-3 border-b border-border px-6 py-4">
      <Hint text="Back">
        <Button size="icon-sm" variant="ghost" class="text-muted-foreground" aria-label="Back" :disabled="!canGoBack" @click="goBack"
          ><ArrowLeft class="size-4"
        /></Button>
      </Hint>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <div class="flex min-w-0 items-center gap-2.5">
          <h1 class="truncate font-mono text-[15px] leading-[22px] font-semibold">
            {{ branch || (data?.worktree.detached ? 'Detached HEAD' : path.split(/[\\/]/).pop()) }}
          </h1>
          <Badge v-if="data && data.counts.uncommitted" variant="secondary" class="bg-attention/15 text-attention"
            >{{ data.counts.uncommitted }} uncommitted</Badge
          >
        </div>
        <div class="flex min-w-0 items-center gap-2 text-xs whitespace-nowrap text-muted-foreground">
          <PathText :path="path" />
          <template v-if="pull">
            <span aria-hidden="true">·</span>
            <a :href="pull.url" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1 text-success-fg hover:underline"
              ><GitPullRequest class="size-3.5" />#{{ pull.number }} {{ pull.draft ? 'Draft' : 'Open' }}</a
            >
          </template>
          <template v-if="data?.base">
            <span aria-hidden="true">·</span>
            <span>into {{ data.base }}</span>
          </template>
          <template v-if="loadedAt">
            <span aria-hidden="true">·</span>
            <span>Checked {{ formatAgo(loadedAt) }}</span>
          </template>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <Transition
          enter-from-class="opacity-0"
          leave-to-class="opacity-0"
          enter-active-class="transition-opacity"
          leave-active-class="transition-opacity duration-500"
        >
          <span v-if="note" class="mr-1 text-xs text-muted-foreground">{{ note }}</span>
        </Transition>
        <Hint text="Open in your editor">
          <Button size="icon" variant="ghost" class="text-muted-foreground" aria-label="Open in editor" @click="openIn('editor')"
            ><Code
          /></Button>
        </Hint>
        <Hint text="Open a terminal here">
          <Button size="icon" variant="ghost" class="text-muted-foreground" aria-label="Open a terminal here" @click="openIn('terminal')"
            ><SquareTerminal
          /></Button>
        </Hint>
        <Hint text="Show the folder">
          <Button
            size="icon"
            variant="ghost"
            class="text-muted-foreground"
            aria-label="Show the folder"
            @click="bridge.invoke('shell:reveal', path)"
            ><FolderOpen
          /></Button>
        </Hint>
        <span class="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <DropdownMenu>
          <Hint text="More">
            <DropdownMenuTrigger as-child>
              <Button size="icon" variant="ghost" class="text-muted-foreground" aria-label="More"><Ellipsis /></Button>
            </DropdownMenuTrigger>
          </Hint>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuItem v-if="github && branch" as-child
              ><a
                :href="`https://github.com/${github.owner}/${github.repo}/tree/${encodeURIComponent(branch)}`"
                target="_blank"
                rel="noreferrer"
                ><ExternalLink /> Open the branch on GitHub</a
              ></DropdownMenuItem
            >
            <DropdownMenuItem v-if="branch" @select="copyBranch"><Copy /> Copy the branch name</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

    <div class="flex h-12 shrink-0 items-center gap-3 border-b border-accent px-6">
      <Segmented v-model="mode" :options="MODES" label="Show" />
      <span v-if="data" class="text-xs whitespace-nowrap text-muted-foreground"
        >{{ files.length }} file{{ files.length === 1 ? '' : 's' }} · <span class="text-add-fg">+{{ totals.additions }}</span>
        <span class="text-del-fg">−{{ totals.deletions }}</span></span
      >
      <Spinner v-if="loading" class="text-muted-foreground" />
      <span class="flex-1" />
      <Segmented v-model="diffMode" :options="DIFF_MODES" label="Diff view" />
    </div>

    <Alert v-if="error" variant="destructive" class="mx-6 mt-4 w-auto"
      ><CircleAlert /><AlertDescription>{{ error }}</AlertDescription></Alert
    >

    <div class="flex min-h-0 flex-1">
      <aside class="flex w-[280px] shrink-0 flex-col gap-2 border-r border-accent p-3 @max-3xl:hidden">
        <InputGroup>
          <InputGroupAddon><Search /></InputGroupAddon>
          <InputGroupInput v-model="query" placeholder="Filter files" aria-label="Filter files" />
        </InputGroup>
        <div class="min-h-0 flex-1 [&>nav]:p-0">
          <FileTree
            v-if="shown.length"
            :tree="tree"
            :search="query"
            selected=""
            :is-viewed="isViewed"
            @select-folder="() => {}"
            @jump-folder="(folder: string) => list?.scrollToFolder(folder)"
            @select-file="(name: string) => list?.scrollTo(name)"
            @toggle-viewed="toggleFolder"
            @toggle-file="setViewed"
          />
          <p v-else-if="data" class="px-1.5 text-xs text-muted-foreground">No files match.</p>
        </div>
      </aside>
      <main class="min-h-0 flex-1 overflow-auto px-4 pt-4 pb-4">
        <div v-if="loading && !data" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Reading the changes…</div>
        <Empty v-else-if="data && !files.length" class="mx-auto mt-16 max-w-sm border-0">
          <EmptyHeader>
            <EmptyTitle class="text-sm">{{ mode === 'uncommitted' ? 'Nothing uncommitted' : 'No changes on this branch' }}</EmptyTitle>
            <EmptyDescription>{{
              mode === 'uncommitted'
                ? 'Every change in this folder is committed.'
                : `This branch has nothing that ${data.base ?? 'its base'} does not have.`
            }}</EmptyDescription>
          </EmptyHeader>
          <Button v-if="mode === 'uncommitted' && data.counts.branch" variant="outline" @click="mode = 'branch'"
            >Show the whole branch</Button
          >
        </Empty>
        <template v-else>
          <p v-if="data?.truncated" class="mb-3 text-xs text-muted-foreground">Some new files are left out: there are too many to show.</p>
          <FileList ref="list" :files="shown" :viewed="viewed" @set-viewed="setViewed" />
        </template>
      </main>
    </div>
  </div>

  <ConfirmDialog
    :open="discarding !== null"
    :title="`Throw away the changes in ${discarding?.split('/').pop() ?? ''}?`"
    description="The file goes back to its last commit. A new file goes to the Trash."
    confirm="Discard changes"
    :busy="busy"
    @update:open="(v) => !v && (discarding = null)"
    @confirm="confirmDiscard"
  />
</template>
