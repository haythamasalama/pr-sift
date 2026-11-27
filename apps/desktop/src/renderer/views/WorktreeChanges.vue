<script setup lang="ts">
import { useRefresh } from '~/useLive'
import { computed, nextTick, onBeforeUnmount, onMounted, provide, shallowRef, useTemplateRef, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Code,
  Copy,
  Ellipsis,
  ExternalLink,
  FolderOpen,
  FolderTree,
  GitCommitHorizontal,
  GitPullRequest,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SquareTerminal,
  X,
} from '@lucide/vue'
import { buildTree, cleanSavedFilters, folderChip, normalizeExtension, patternsFromView } from '@pr-sift/core'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import FileList from '@/features/diff/FileList.vue'
import FileTree from '@/features/tree/FileTree.vue'
import FilterBar from '@/features/filters/FilterBar.vue'
import SmartFiltersMenu from '@/features/filters/SmartFiltersMenu.vue'
import Toolbar from '@/features/review/Toolbar.vue'
import { useFileFilter } from '@/features/filters/useFileFilter'
import { diffModeKey } from '@/features/diff/diffMode'
import { fileContextKey } from '@/features/diff/fileContext'
import { cardsExpandKey, type ExpandCommand } from '@/features/tree/expandContext'
import { notesKey, useNotes } from '@/features/notes/useNotes'
import { useResizable } from '@/features/review/useResizable'
import { useViewed } from '@/features/review/useViewed'
import { DEFAULTS, getSettings, onSettingsChange, saveSetting } from '@/lib/settings'
import type { DiffMode, PrFile, Settings } from '@/lib/types'
import { bridge } from '~/bridge'
import { readCache } from '~/cache'
import { errorText, formatAgo } from '~/format'
import type { RepoActivity } from '~/github'
import { goBack, openPullLink, project } from '~/navigation'
import type { Commit, PatchMode, WorktreePatch } from '#shared/ipc'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import Hint from '~/components/Hint.vue'
import PathText from '~/components/PathText.vue'
import Segmented from '~/components/Segmented.vue'

// A worktree read the way PR Sift reads a pull request: the same header, type filters, tree and diff cards.
// What is shown is the worktree's own: uncommitted changes, the whole branch, or one of its commits.
const { path } = defineProps<{ path: string }>()

const mode = shallowRef<PatchMode>('uncommitted')
const commitSha = shallowRef('')
const data = shallowRef<WorktreePatch | null>(null)
const loading = shallowRef(false)
const error = shallowRef('')
const note = shallowRef('')
const discarding = shallowRef<string | null>(null)
const busy = shallowRef(false)
let noteTimer: ReturnType<typeof setTimeout> | undefined

function flash(text: string) {
  note.value = text
  clearTimeout(noteTimer)
  noteTimer = setTimeout(() => (note.value = ''), 3500)
}

async function fetchPatch() {
  const sha = mode.value === 'commit' ? commitSha.value : undefined
  try {
    return await bridge.invoke('worktrees:patch', path, mode.value, sha)
  } catch (e) {
    // The main process only works on folders from its last listing, which a fresh start does not have yet.
    if (!project.value) throw e
    await bridge.invoke('worktrees:list', project.value)
    return await bridge.invoke('worktrees:patch', path, mode.value, sha)
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await fetchPatch()
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}
watch([mode, commitSha], load, { immediate: true })

const github = computed(() => data.value?.github)
const branch = computed(() => data.value?.worktree.branch ?? '')
const title = computed(() => branch.value || (data.value?.worktree.detached ? 'Detached HEAD' : (path.split(/[\\/]/).pop() ?? '')))
const pull = computed(() => {
  const gh = github.value
  if (!gh || !branch.value) return undefined
  const activity = readCache<RepoActivity>(`repo:${gh.owner}/${gh.repo}`.toLowerCase())?.value
  return activity?.pulls.find((p) => p.branch === branch.value)
})

// ── What to show: uncommitted, the whole branch, or one commit. ──
const commits = computed(() => data.value?.commits ?? [])
const MODES = computed(() => [
  { value: 'uncommitted' as const, label: 'Uncommitted', count: data.value?.counts.uncommitted },
  { value: 'branch' as const, label: 'Whole branch', count: data.value?.counts.branch },
])
const shownMode = computed({
  get: () => (mode.value === 'commit' ? ('' as 'uncommitted') : (mode.value as 'uncommitted' | 'branch')),
  set: (value: 'uncommitted' | 'branch') => {
    mode.value = value
    commitSha.value = ''
  },
})
const current = computed(() => (mode.value === 'commit' ? commits.value.find((c) => c.sha === commitSha.value) : undefined))
const commitsOpen = shallowRef(false)
function showCommit(c: Commit) {
  commitSha.value = c.sha
  mode.value = 'commit'
  commitsOpen.value = false
}
// Commits are listed newest first, so "older" is further down the list.
const step = (by: 1 | -1) => {
  const i = commits.value.findIndex((c) => c.sha === commitSha.value)
  const next = commits.value[i + by]
  if (next) showCommit(next)
}
const initial = (name: string) => (name.trim()[0] ?? '?').toUpperCase()

// ── The review: same filters, tree and cards as a pull request. ──
const settings = shallowRef<Settings>(DEFAULTS)
let stopWatchingSettings = () => {}
onBeforeUnmount(() => stopWatchingSettings())

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
const viewedKey = computed(() => `worktree:${path}:${mode.value === 'commit' ? `commit:${commitSha.value}` : mode.value}`)
const { viewed, isViewed, setViewed, setMany, clearAll } = useViewed(viewedKey)
const notesStore = useNotes(computed(() => `worktree:${path}`))
const filter = useFileFilter(files, settings, isViewed)
const tree = computed(() => buildTree(filter.pool.value))

const list = useTemplateRef<InstanceType<typeof FileList>>('list')
const main = useTemplateRef<HTMLElement>('main')
const compact = useMediaQuery('(max-width: 1100px)')
const narrow = useMediaQuery('(max-width: 960px)')
const sidebarOpen = shallowRef(false)
const sidebarSize = useResizable(DEFAULTS.sidebarWidth, 220, 640, (width) => saveSetting('sidebarWidth', width))
// Like the review: on wide windows the sidebar folds into a thin rail of icons, and remembers it.
const RAIL = 44
const collapsed = shallowRef(false)
const searchInput = useTemplateRef<InstanceType<typeof Input>>('searchInput')
const sidebarWidth = computed(() => (collapsed.value ? RAIL : sidebarSize.width.value))
function hideSidebar() {
  if (compact.value) {
    sidebarOpen.value = false
    return
  }
  collapsed.value = true
  void saveSetting('sidebarCollapsed', true)
}
async function showSidebar(search = false) {
  collapsed.value = false
  void saveSetting('sidebarCollapsed', false)
  if (!search) return
  await nextTick()
  ;(searchInput.value?.$el as HTMLInputElement | undefined)?.focus()
}

const diffMode = shallowRef<DiffMode>('unified')
provide(
  diffModeKey,
  computed<DiffMode>(() => (narrow.value ? 'unified' : diffMode.value)),
)
watch(diffMode, (value) => saveSetting('diffView', value))
const cardsExpand = shallowRef<ExpandCommand>({ open: true, n: 0 })
provide(cardsExpandKey, cardsExpand)

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
    const ref = current.value?.sha ?? branch.value
    if (!gh || !ref) return ''
    return `https://github.com/${gh.owner}/${gh.repo}/blob/${encodeURIComponent(ref)}/${filename.split('/').map(encodeURIComponent).join('/')}`
  },
  // Only the uncommitted view shows changes that can be thrown away; committed ones stay.
  discard: (filename) => {
    if (mode.value === 'uncommitted') discarding.value = filename
    else flash('Only uncommitted changes can be thrown away.')
  },
})

const viewPatterns = computed(() =>
  patternsFromView(
    filter.chips.value.filter((c) => c.state === 'include' && c.ext.startsWith('.')).map((c) => c.ext),
    filter.scopes.value.filter((k) => k.startsWith('path:')).map((k) => k.slice(5)),
  ),
)
async function saveView(name: string) {
  const others = settings.value.presets.filter((p) => p.name.trim().toLowerCase() !== name.toLowerCase())
  const presets = cleanSavedFilters([...others, { name, include: viewPatterns.value }])
  settings.value = { ...settings.value, presets }
  await saveSetting('presets', presets)
  flash(`Saved “${name}” as a filter`)
}
function setReviewMode(value: boolean) {
  filter.reviewMode.value = value
  return saveSetting('reviewMode', value)
}
async function goToFile(name: string) {
  if (!filter.inScope.value.some((f) => f.filename === name)) {
    await filter.resetFilters({ persist: false })
    if (!filter.inScope.value.some((f) => f.filename === name)) {
      filter.reviewMode.value = false
      filter.showHidden.value = true
    }
  }
  await nextTick()
  await list.value?.scrollTo(name)
}
function jumpToFolder(folder: string) {
  if (folder) list.value?.scrollToFolder(folder)
  else main.value?.scrollTo({ top: 0 })
}
const selectFolder = (folder: string) => filter.setScopes(folder ? ['path:' + folder] : [])
function hideFolder(folder: string) {
  const selected = filter.selectedFolder.value
  if (selected === folder || selected.startsWith(folder + '/')) filter.setScopes([])
  return filter.toggleChip(folderChip(folder), true)
}
const toggleFolder = (folder: string, value: boolean) =>
  setMany(
    filter.pool.value.filter((f) => !folder || f.filename.startsWith(folder + '/')),
    value,
  )
async function setCustomExtensions(next: string[]) {
  settings.value = { ...settings.value, customExtensions: next }
  await saveSetting('customExtensions', next)
}
function addExtension(raw: string) {
  const ext = normalizeExtension(raw)
  if (ext && !settings.value.customExtensions.includes(ext)) return setCustomExtensions([...settings.value.customExtensions, ext])
}
const removeExtension = (ext: string) => setCustomExtensions(settings.value.customExtensions.filter((e) => e !== ext))
const allReviewed = computed(() => filter.inScope.value.length === 0 && filter.viewedInView.value.length > 0)

onMounted(async () => {
  stopWatchingSettings = onSettingsChange((next) => (settings.value = next))
  settings.value = await getSettings()
  collapsed.value = settings.value.sidebarCollapsed
  filter.loadHiddenTypes(settings.value.hiddenTypes)
  filter.reviewMode.value = settings.value.reviewMode
  diffMode.value = settings.value.diffView
  sidebarSize.set(settings.value.sidebarWidth)
})

// ── Actions on the folder. ──
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

async function copy(text: string, what: string) {
  await navigator.clipboard.writeText(text)
  flash(`${what} copied`)
}
// Refresh (⌘R) looks again.
useRefresh(load)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <Toolbar
      :title="title"
      :done="filter.progress.value.done"
      :total="filter.progress.value.total"
      :in-view="filter.inScope.value.length"
      :note-count="0"
      :compact="compact"
      :loading="loading && !data"
      back
      bare
      @toggle-sidebar="sidebarOpen = !sidebarOpen"
      @close="goBack"
    >
      <template #meta>
        <div class="flex min-w-0 items-center gap-2 overflow-hidden text-xs leading-4 whitespace-nowrap text-muted-foreground">
          <button
            v-if="pull"
            type="button"
            class="inline-flex shrink-0 items-center gap-1 text-success-fg hover:underline"
            @click="openPullLink(pull.url)"
          >
            <GitPullRequest class="size-3.5" />#{{ pull.number }} {{ pull.draft ? 'Draft' : 'Open' }}
          </button>
          <span v-if="data?.base" class="shrink-0">into {{ data.base }}</span>
          <span v-if="pull || data?.base" aria-hidden="true">·</span>
          <PathText :path="path" />
        </div>
      </template>
      <template #actions>
        <Transition
          enter-from-class="opacity-0"
          leave-to-class="opacity-0"
          enter-active-class="transition-opacity"
          leave-active-class="transition-opacity duration-500"
        >
          <span v-if="note" class="text-xs whitespace-nowrap text-muted-foreground">{{ note }}</span>
        </Transition>
        <div class="flex items-center gap-0.5">
          <Hint text="Open in your editor">
            <Button size="icon-sm" variant="ghost" class="text-muted-foreground" aria-label="Open in editor" @click="openIn('editor')"
              ><Code
            /></Button>
          </Hint>
          <Hint text="Open a terminal here">
            <Button
              size="icon-sm"
              variant="ghost"
              class="text-muted-foreground"
              aria-label="Open a terminal here"
              @click="openIn('terminal')"
              ><SquareTerminal
            /></Button>
          </Hint>
          <Button
            size="icon-sm"
            variant="ghost"
            class="text-muted-foreground"
            aria-label="Show the folder"
            @click="bridge.invoke('shell:reveal', path)"
            ><FolderOpen
          /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button size="icon-sm" variant="ghost" class="text-muted-foreground" aria-label="More"><Ellipsis /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-56">
              <DropdownMenuItem v-if="github && branch" as-child
                ><a
                  :href="`https://github.com/${github.owner}/${github.repo}/tree/${encodeURIComponent(branch)}`"
                  target="_blank"
                  rel="noreferrer"
                  ><ExternalLink /> Open the branch on GitHub</a
                ></DropdownMenuItem
              >
              <DropdownMenuItem v-if="github && current" as-child
                ><a :href="`https://github.com/${github.owner}/${github.repo}/commit/${current.sha}`" target="_blank" rel="noreferrer"
                  ><ExternalLink /> Open this commit on GitHub</a
                ></DropdownMenuItem
              >
              <DropdownMenuItem v-if="branch" @select="copy(branch, 'Branch name')"><Copy /> Copy the branch name</DropdownMenuItem>
              <DropdownMenuItem v-if="current" @select="copy(current.sha, 'Commit hash')"><Copy /> Copy the commit hash</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </template>
    </Toolbar>

    <div class="flex h-11 shrink-0 items-center gap-1.5 border-b px-3 sm:px-4" role="toolbar" aria-label="What to show">
      <Segmented v-model="shownMode" :options="MODES" label="Show" />
      <Popover v-model:open="commitsOpen">
        <PopoverTrigger as-child>
          <Button
            size="sm"
            :variant="current ? 'secondary' : 'ghost'"
            class="max-w-72 gap-1.5 text-xs"
            :class="current ? '' : 'text-muted-foreground'"
            :disabled="!commits.length"
            :aria-label="current ? `Commit ${current.subject}` : 'Commits'"
          >
            <GitCommitHorizontal />
            <template v-if="current"
              ><span class="font-mono">{{ current.sha.slice(0, 7) }}</span
              ><span class="truncate">{{ current.subject }}</span></template
            >
            <template v-else
              >Commits <Badge variant="secondary" class="min-w-5 px-1.5 tabular-nums">{{ commits.length }}</Badge></template
            >
            <ChevronDown class="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" class="w-[420px] gap-0 p-0">
          <div class="border-b border-border px-3 py-2.5">
            <p class="text-sm font-medium">Commits on {{ branch || 'this branch' }}</p>
            <p class="text-xs text-muted-foreground">
              {{ data?.base ? `Since it left ${data.base}, newest first.` : 'The latest commits, newest first.' }} Pick one to see only its
              changes.
            </p>
          </div>
          <ul class="max-h-[360px] overflow-y-auto p-1">
            <li v-for="c in commits" :key="c.sha">
              <button
                type="button"
                class="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-accent"
                :class="c.sha === commitSha ? 'bg-accent' : ''"
                @click="showCommit(c)"
              >
                <span
                  class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground"
                  aria-hidden="true"
                  >{{ initial(c.author) }}</span
                >
                <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span class="truncate text-[13px] font-medium">{{ c.subject }}</span>
                  <span class="truncate text-xs text-muted-foreground">{{ c.author }} · {{ formatAgo(c.date) }}</span>
                </span>
                <span class="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground">{{ c.sha.slice(0, 7) }}</span>
              </button>
            </li>
          </ul>
        </PopoverContent>
      </Popover>
      <template v-if="current">
        <Button
          size="icon-sm"
          variant="ghost"
          class="text-muted-foreground"
          aria-label="Older commit"
          :disabled="commits.at(-1)?.sha === current.sha"
          @click="step(1)"
          ><ChevronLeft
        /></Button>
        <Button
          size="icon-sm"
          variant="ghost"
          class="text-muted-foreground"
          aria-label="Newer commit"
          :disabled="commits[0]?.sha === current.sha"
          @click="step(-1)"
          ><ChevronRight
        /></Button>
        <Button
          size="icon-sm"
          variant="ghost"
          class="text-muted-foreground"
          aria-label="Back to the whole branch"
          @click="shownMode = 'branch'"
          ><X
        /></Button>
      </template>
    </div>

    <FilterBar
      v-if="data"
      v-model:show-hidden="filter.showHidden.value"
      v-model:diff-mode="diffMode"
      :split-disabled="narrow"
      :review-mode="filter.reviewMode.value"
      :hidden-count="filter.hiddenCount.value"
      :filters-active="filter.filtersActive.value"
      :chips="filter.chips.value"
      :presets="settings.presets"
      :active-preset="filter.activePreset.value?.name ?? ''"
      :hidden-presets="filter.hiddenPresets.value"
      :view-patterns="viewPatterns"
      :listed-count="filter.inScope.value.length"
      :viewed-in-view="filter.viewedInView.value"
      @update:review-mode="setReviewMode"
      @toggle-extension="filter.toggleChip"
      @reset-filters="filter.resetFilters"
      @add-extension="addExtension"
      @remove-extension="removeExtension"
      @mark-listed="setMany(filter.inScope.value, true)"
      @unmark-viewed="setMany(filter.viewedInView.value, false)"
      @unmark-file="(file) => setViewed(file, false)"
      @clear-all="clearAll"
      @save-view="saveView"
      @select-preset="filter.togglePreset"
      @hide-preset="filter.hidePreset"
    />

    <Alert v-if="error" variant="destructive" class="mx-auto mt-6 max-w-xl"
      ><CircleAlert /><AlertDescription>{{ error }}</AlertDescription></Alert
    >

    <div v-if="loading && !data" class="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
      <Spinner /> Reading the changes…
    </div>

    <div
      v-else-if="data"
      class="relative grid min-h-0 flex-1"
      :class="sidebarSize.dragging.value ? 'select-none' : ''"
      :style="{ gridTemplateColumns: compact ? '1fr' : `${sidebarWidth}px 1fr` }"
    >
      <div v-if="compact && sidebarOpen" class="absolute inset-0 z-20 bg-black/40" @click="sidebarOpen = false" />
      <aside
        v-show="!compact || sidebarOpen"
        class="flex min-h-0 flex-col border-r bg-sidebar"
        :class="compact ? 'absolute inset-y-0 left-0 z-30 w-[min(22rem,88vw)] shadow-xl' : 'relative'"
      >
        <div
          v-if="!compact && !collapsed"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          title="Drag to resize · double-click to reset"
          class="group/resize absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize transition-colors hover:bg-emphasis/25"
          :class="sidebarSize.dragging.value ? 'bg-emphasis/35' : ''"
          @pointerdown.prevent="sidebarSize.start"
          @dblclick="sidebarSize.set(DEFAULTS.sidebarWidth)"
        >
          <span
            class="absolute top-1/2 left-1/2 h-8 w-1 -translate-1/2 rounded-full bg-muted-foreground/50 transition-colors group-hover/resize:bg-emphasis"
          />
        </div>
        <!-- The same sidebar as the review: search, smart filters and the tree, folding into a rail of icons. -->
        <nav v-if="!compact && collapsed" class="flex flex-col items-center gap-1 py-2" aria-label="Sidebar">
          <Button
            variant="ghost"
            size="icon"
            class="size-8 text-muted-foreground hover:text-foreground"
            title="Show sidebar"
            aria-label="Show sidebar"
            @click="showSidebar()"
          >
            <PanelLeftOpen />
          </Button>
          <span class="my-1 h-px w-5 bg-border" />
          <Button
            variant="ghost"
            size="icon"
            class="size-8 text-muted-foreground hover:text-foreground"
            title="Search files"
            aria-label="Search files"
            @click="showSidebar(true)"
          >
            <Search />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="relative size-8 text-muted-foreground hover:text-foreground"
            :title="filter.selectedFolder.value ? `Tree · ${filter.selectedFolder.value}` : 'Tree'"
            aria-label="Show the file tree"
            @click="showSidebar()"
          >
            <FolderTree />
            <span v-if="filter.selectedFolder.value" class="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-foreground" />
          </Button>
        </nav>
        <template v-else>
          <div class="flex items-center gap-1.5 border-b px-3.5 py-2.5">
            <div class="relative flex flex-1 items-center">
              <Search class="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
              <Input
                ref="searchInput"
                v-model="filter.query.value"
                placeholder="Search files"
                aria-label="Search files"
                class="h-7 rounded-md bg-background pr-7 pl-7 text-xs shadow-none md:text-xs dark:bg-background"
              />
              <Button
                v-if="filter.query.value"
                variant="ghost"
                size="icon-xs"
                class="absolute right-0.5"
                aria-label="Clear search"
                @click="filter.query.value = ''"
              >
                <X />
              </Button>
            </div>
            <SmartFiltersMenu
              :smart="filter.smart.value"
              :selected="filter.scopes.value"
              @toggle="filter.toggleScope"
              @clear="filter.setScopes([])"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              class="-mr-1 size-7 shrink-0 text-muted-foreground hover:text-foreground"
              title="Hide sidebar"
              aria-label="Hide sidebar"
              @click="hideSidebar"
            >
              <PanelLeftClose />
            </Button>
          </div>
          <div class="min-h-0 flex-1 overflow-auto">
            <FileTree
              :tree="tree"
              :search="filter.query.value"
              :selected="filter.selectedFolder.value"
              :is-viewed="isViewed"
              :indent="settings.treeIndent"
              :guides="settings.treeGuides"
              @select-folder="selectFolder"
              @jump-folder="
                (folder: string) => {
                  jumpToFolder(folder)
                  sidebarOpen = false
                }
              "
              @select-file="
                (name: string) => {
                  goToFile(name)
                  sidebarOpen = false
                }
              "
              @toggle-viewed="toggleFolder"
              @toggle-file="setViewed"
              @hide-folder="hideFolder"
            />
          </div>
        </template>
        <div
          v-if="!(collapsed && !compact)"
          class="flex items-center gap-1.5 border-t px-3.5 py-2 text-[11px] text-muted-foreground tabular-nums"
          :title="`${filter.progress.value.done} of ${filter.progress.value.total} files viewed`"
        >
          <span class="relative h-1 flex-1 overflow-hidden rounded-full bg-border">
            <span
              class="absolute inset-y-0 left-0 bg-emphasis transition-[width]"
              :style="{ width: `${filter.progress.value.total ? (100 * filter.progress.value.done) / filter.progress.value.total : 0}%` }"
            />
          </span>
          {{ filter.progress.value.done }} of {{ filter.progress.value.total }} viewed
        </div>
      </aside>
      <main ref="main" class="min-h-0 overflow-auto px-4 pb-4">
        <Empty v-if="!files.length" class="mx-auto mt-16 max-w-sm border-0">
          <EmptyHeader>
            <EmptyTitle class="text-sm">{{
              mode === 'uncommitted'
                ? 'Nothing uncommitted'
                : mode === 'commit'
                  ? 'This commit changes no files'
                  : 'No changes on this branch'
            }}</EmptyTitle>
            <EmptyDescription v-if="mode !== 'commit'">{{
              mode === 'uncommitted'
                ? 'Every change in this folder is committed.'
                : `This branch has nothing that ${data.base ?? 'its base'} does not have.`
            }}</EmptyDescription>
          </EmptyHeader>
          <Button v-if="mode === 'uncommitted' && data.counts.branch" variant="outline" @click="shownMode = 'branch'"
            >Show the whole branch</Button
          >
        </Empty>
        <Empty v-else-if="allReviewed" class="mx-auto mt-16 max-w-sm border-0">
          <EmptyHeader>
            <EmptyTitle class="text-sm">Everything in this view is viewed</EmptyTitle>
            <EmptyDescription>Nothing left to look at here.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" @click="filter.reviewMode.value = false"
            >Show the {{ filter.viewedInView.value.length }} viewed files</Button
          >
        </Empty>
        <Empty v-else-if="filter.inScope.value.length === 0 && filter.filtersActive.value" class="mx-auto mt-16 max-w-sm border-0">
          <EmptyHeader>
            <EmptyTitle class="text-sm">No files match these filters</EmptyTitle>
            <EmptyDescription>Nothing here fits the current type, folder or search filters.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" @click="filter.resetFilters">Reset filters</Button>
        </Empty>
        <div v-else class="pt-4">
          <p v-if="data.truncated" class="mb-3 text-xs text-muted-foreground">Some files are left out: there are too many to show.</p>
          <FileList ref="list" :files="filter.inScope.value" :viewed="viewed" @set-viewed="setViewed" />
        </div>
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
