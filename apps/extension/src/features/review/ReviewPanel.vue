<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, shallowRef, useTemplateRef, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { AlertCircle, CheckCircle2, FolderTree, RefreshCw, Search, Sparkles, X } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFileFilter } from '../filters/useFileFilter'
import { diffModeKey } from '../diff/diffMode'
import { cardsExpandKey, type ExpandCommand } from '../tree/expandContext'
import { notesKey, useNotes } from '../notes/useNotes'
import { usePullRequest } from './usePullRequest'
import { useResizable } from './useResizable'
import { useUpdateWatcher } from './useUpdateWatcher'
import { useViewed } from './useViewed'
import { buildTree, githubLineUrl, normalizeExtension } from '@pr-sift/core'
import { hasToken } from './github'
import { postReviewComment } from '../notes/review'
import { DEFAULTS, getSettings, onSettingsChange, saveSetting } from '../../lib/settings'
import { prKey, type DiffMode, type PrRef, type Settings } from '../../lib/types'
import FileList from '../diff/FileList.vue'
import FileTree from '../tree/FileTree.vue'
import FilterBar from '../filters/FilterBar.vue'
import NotesDialog from '../notes/NotesDialog.vue'
import ScopePanel from '../filters/ScopePanel.vue'
import Toolbar from './Toolbar.vue'

const { pr, externalUpdate = false } = defineProps<{ pr: PrRef; externalUpdate?: boolean }>()
const emit = defineEmits<{ close: []; refreshed: [] }>()
let stopWatchingSettings = () => {}
onBeforeUnmount(() => stopWatchingSettings())

const settings = shallowRef<Settings>(DEFAULTS)
const { files, info, status, error, load, hasUpdate, refresh } = usePullRequest()
const { viewed, isViewed, setViewed, setMany, clearAll } = useViewed(computed(() => prKey(pr)))
const notesStore = useNotes(computed(() => prKey(pr)))
const filter = useFileFilter(
  files,
  settings,
  isViewed,
  computed(() => {
    const counts = new Map<string, number>()
    for (const n of notesStore.notes.value) if (!n.resolved) counts.set(n.file, (counts.get(n.file) ?? 0) + 1)
    return counts
  }),
)
const tree = computed(() => buildTree(filter.pool.value))
const notesOpen = shallowRef(false)
const sidebar = shallowRef<'smart' | 'tree'>('tree')
const list = useTemplateRef<InstanceType<typeof FileList>>('list')
const main = useTemplateRef<HTMLElement>('main')

const diffMode = shallowRef<DiffMode>('unified')
const compact = useMediaQuery('(max-width: 900px)')
const narrow = useMediaQuery('(max-width: 760px)')
const sidebarOpen = shallowRef(false)
provide(
  diffModeKey,
  computed<DiffMode>(() => (narrow.value ? 'unified' : diffMode.value)),
)

const sidebarSize = useResizable(DEFAULTS.sidebarWidth, 220, 760, (width) => saveSetting('sidebarWidth', width))

const cardsExpand = shallowRef<ExpandCommand>({ open: true, n: 0 })
provide(cardsExpandKey, cardsExpand)
const setAllCards = (open: boolean) => (cardsExpand.value = { open, n: cardsExpand.value.n + 1 })

const tokenAvailable = shallowRef(false)
const showResolved = shallowRef(false)

provide(notesKey, {
  notes: notesStore.notes,
  canPost: tokenAvailable,
  showResolved,
  post: async (note) => {
    await notesStore.markPosted(note.id, await postReviewComment(pr, note))
  },
  add: notesStore.add,
  update: notesStore.update,
  remove: notesStore.remove,
  openOnGithub: async (note) => {
    window.open(await githubLineUrl(pr, note), '_blank', 'noopener')
  },
})

const updates = useUpdateWatcher(() => hasUpdate(pr))
const refreshing = shallowRef(false)
const refreshNote = shallowRef('')

async function doRefresh() {
  refreshing.value = true
  const summary = await refresh(pr)
  refreshing.value = false
  updates.dismiss()
  emit('refreshed')
  refreshNote.value = summary
    ? `Updated: ${summary.changed} changed, ${summary.added} new, ${summary.removed} removed. Changed files are back to unviewed.`
    : 'Could not refresh the pull request.'
  setTimeout(() => (refreshNote.value = ''), 10_000)
}

const allReviewed = computed(() => filter.inScope.value.length === 0 && filter.viewedInView.value.length > 0)

function setReviewMode(value: boolean) {
  filter.reviewMode.value = value
  return saveSetting('reviewMode', value)
}

async function goToFile(name: string) {
  const shown = () => filter.inScope.value.some((f) => f.filename === name)
  if (!shown()) {
    await filter.resetFilters({ persist: false })
    if (!shown()) {
      filter.reviewMode.value = false
      filter.showHidden.value = true
    }
    await nextTick()
  }
  await nextTick()
  await list.value?.scrollTo(name)
}

function jumpToFolder(path: string) {
  if (path) list.value?.scrollToFolder(path)
  else main.value?.scrollTo({ top: 0 })
}

function selectFolder(path: string) {
  filter.setScopes(path ? ['path:' + path] : [])
}

function toggleFolder(path: string, value: boolean) {
  const inside = filter.pool.value.filter((f) => !path || f.filename.startsWith(path + '/'))
  return setMany(inside, value)
}

async function setCustomExtensions(next: string[]) {
  settings.value = { ...settings.value, customExtensions: next }
  await saveSetting('customExtensions', next)
}

function addExtension(raw: string) {
  const ext = normalizeExtension(raw)
  if (ext && !settings.value.customExtensions.includes(ext)) return setCustomExtensions([...settings.value.customExtensions, ext])
}

const removeExtension = (ext: string) => setCustomExtensions(settings.value.customExtensions.filter((e) => e !== ext))

onMounted(async () => {
  stopWatchingSettings = onSettingsChange((next) => (settings.value = next))
  settings.value = await getSettings()
  tokenAvailable.value = await hasToken()
  filter.loadHiddenTypes(settings.value.hiddenTypes)
  filter.reviewMode.value = settings.value.reviewMode
  diffMode.value = settings.value.diffView
  sidebarSize.set(settings.value.sidebarWidth)
  await load(pr)
  emit('refreshed')
})

watch(diffMode, (value) => saveSetting('diffView', value))
</script>

<template>
  <div class="fixed inset-0 z-40 flex flex-col bg-background text-foreground">
    <Toolbar
      v-model:query="filter.query.value"
      v-model:diff-mode="diffMode"
      :title="info ? `#${pr.number} ${info.title}` : `#${pr.number}`"
      :presets="settings.presets"
      :active-preset="filter.activePreset.value?.name ?? ''"
      :done="filter.progress.value.done"
      :total="filter.progress.value.total"
      :in-view="filter.inScope.value.length"
      :note-count="notesStore.notes.value.filter((n) => !n.resolved).length"
      :compact="compact"
      :split-disabled="narrow"
      @toggle-sidebar="sidebarOpen = !sidebarOpen"
      @select-preset="filter.togglePreset"
      @open-notes="notesOpen = true"
      @close="emit('close')"
    />

    <FilterBar
      v-if="status === 'ready'"
      v-model:show-hidden="filter.showHidden.value"
      :review-mode="filter.reviewMode.value"
      :hidden-count="filter.hiddenCount.value"
      :filters-active="filter.filtersActive.value"
      :chips="filter.chips.value"
      :listed-count="filter.inScope.value.length"
      :viewed-in-view-count="filter.viewedInView.value.length"
      @update:review-mode="setReviewMode"
      @toggle-extension="filter.toggleChip"
      @reset-filters="filter.resetFilters"
      @add-extension="addExtension"
      @remove-extension="removeExtension"
      @mark-listed="setMany(filter.inScope.value, true)"
      @unmark-viewed="setMany(filter.viewedInView.value, false)"
      @clear-all="clearAll"
      @expand-cards="setAllCards(true)"
      @collapse-cards="setAllCards(false)"
    />

    <Alert
      v-if="updates.available.value || externalUpdate || refreshNote"
      class="flex items-center gap-3 rounded-none border-x-0 border-t-0 py-2"
    >
      <RefreshCw :class="refreshing ? 'animate-spin' : ''" />
      <AlertDescription class="flex-1 text-xs">{{ refreshNote || 'New changes were pushed to this pull request.' }}</AlertDescription>
      <Button v-if="updates.available.value || externalUpdate" size="sm" :disabled="refreshing" @click="doRefresh">Refresh</Button>
    </Alert>

    <div v-if="status === 'loading'" class="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
      <Spinner /> Loading pull request…
    </div>

    <Alert v-else-if="status === 'error'" variant="destructive" class="mx-auto mt-16 max-w-xl">
      <AlertCircle />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <div
      v-else
      class="relative grid min-h-0 flex-1"
      :class="sidebarSize.dragging.value ? 'select-none' : ''"
      :style="{ gridTemplateColumns: compact ? '1fr' : `${sidebarSize.width.value}px 1fr` }"
    >
      <div v-if="compact && sidebarOpen" class="absolute inset-0 z-20 bg-black/40" @click="sidebarOpen = false" />
      <aside
        v-show="!compact || sidebarOpen"
        class="min-h-0 border-r bg-sidebar"
        :class="compact ? 'absolute inset-y-0 left-0 z-30 w-[min(22rem,88vw)] shadow-xl' : 'relative'"
      >
        <div
          v-if="!compact"
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
        <Tabs v-model="sidebar" class="h-full gap-0">
          <div class="flex flex-col gap-2 border-b p-2">
            <div class="relative flex items-center">
              <Search class="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
              <Input
                v-model="filter.query.value"
                placeholder="Search files…"
                aria-label="Search files"
                class="h-8 pr-7 pl-8 text-xs md:text-xs"
              />
              <Button
                v-if="filter.query.value"
                variant="ghost"
                size="icon-xs"
                class="absolute right-1"
                aria-label="Clear search"
                @click="filter.query.value = ''"
              >
                <X />
              </Button>
            </div>
            <TabsList class="w-full">
              <TabsTrigger value="tree"><FolderTree /> Tree</TabsTrigger>
              <TabsTrigger value="smart"><Sparkles /> Smart filters</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="tree" class="min-h-0 flex-1">
            <FileTree
              :tree="tree"
              :search="filter.query.value"
              :selected="filter.selectedFolder.value"
              :is-viewed="isViewed"
              @select-folder="selectFolder"
              @jump-folder="
                (path) => {
                  jumpToFolder(path)
                  sidebarOpen = false
                }
              "
              @select-file="
                (name) => {
                  goToFile(name)
                  sidebarOpen = false
                }
              "
              @toggle-viewed="toggleFolder"
              @toggle-file="setViewed"
            />
          </TabsContent>
          <TabsContent value="smart" class="min-h-0 flex-1">
            <ScopePanel
              :smart="filter.smart.value"
              :selected="filter.scopes.value"
              @toggle="filter.toggleScope"
              @clear="filter.setScopes([])"
            />
          </TabsContent>
        </Tabs>
      </aside>
      <main ref="main" class="min-h-0 overflow-auto p-4">
        <Empty v-if="allReviewed" class="mx-auto mt-16 max-w-sm border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon"><CheckCircle2 class="text-success" /></EmptyMedia>
            <EmptyTitle class="text-sm">Everything in this view is reviewed</EmptyTitle>
            <EmptyDescription>Nothing left to review here.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" @click="filter.reviewMode.value = false"
            >Show the {{ filter.viewedInView.value.length }} viewed files</Button
          >
        </Empty>
        <Empty v-else-if="filter.inScope.value.length === 0 && filter.filtersActive.value" class="mx-auto mt-16 max-w-sm border-0">
          <EmptyHeader>
            <EmptyTitle class="text-sm">No files match these filters</EmptyTitle>
            <EmptyDescription>Nothing in this pull request fits the current type, folder or search filters.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" @click="filter.resetFilters">Reset filters</Button>
        </Empty>
        <FileList v-else ref="list" :files="filter.inScope.value" :viewed="viewed" @set-viewed="setViewed" />
      </main>
    </div>

    <NotesDialog
      v-if="notesOpen"
      v-model:show-resolved="showResolved"
      :pr="pr"
      :title="info?.title ?? ''"
      :notes="notesStore.notes.value"
      :files="files"
      @close="notesOpen = false"
      @remove="notesStore.remove"
      @update="notesStore.update"
      @clear="notesStore.clear"
      @jump="
        (file) => {
          notesOpen = false
          goToFile(file)
        }
      "
    />
  </div>
</template>
