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
import { buildTree, folderChip, githubFileUrl, githubLineUrl, normalizeExtension, cleanSavedFilters, patternsFromView } from '@pr-sift/core'
import { watchToken } from './github'
import { fetchFileLines } from './pull'
import { fetchConversation, type Conversation, type Thread } from './conversation'
import { fileContextKey } from '../diff/fileContext'
import { postReviewComment } from '../notes/review'
import { DEFAULTS, getSettings, onSettingsChange, saveSetting } from '../../lib/settings'
import { prKey, type DiffMode, type MergeMethod, type PrRef, type ReviewEvent, type Settings } from '../../lib/types'
import FileList from '../diff/FileList.vue'
import FileTree from '../tree/FileTree.vue'
import FilterBar from '../filters/FilterBar.vue'
import NotesDialog from '../notes/NotesDialog.vue'
import PrPanel from './PrPanel.vue'
import PrSummary from './PrSummary.vue'
import ReviewActions from './ReviewActions.vue'
import ScopePanel from '../filters/ScopePanel.vue'
import Toolbar from './Toolbar.vue'
import SettingsSheet from '../settings/SettingsSheet.vue'
import { settingsOpenerKey } from '../settings/useSettingsOpener'
import { openOptions } from '../../lib/extension'
import type { SettingsSectionId } from '../settings/sections'
import UpdateNotice from '../updates/UpdateNotice.vue'
import AutoOpenTip from './AutoOpenTip.vue'
import NoticeBar from '../../components/NoticeBar.vue'
import { REVIEWS_URL } from '../../lib/updates'

const { pr, externalUpdate = false } = defineProps<{ pr: PrRef; externalUpdate?: boolean }>()
const emit = defineEmits<{ close: []; refreshed: [] }>()
let stopWatchingSettings = () => {}
let stopWatchingToken = () => {}
onBeforeUnmount(() => {
  stopWatchingSettings()
  stopWatchingToken()
})

const settings = shallowRef<Settings>(DEFAULTS)
const { files, info, status, error, headSha, load, hasUpdate, refresh } = usePullRequest()
const { viewed, isViewed, setViewed, setMany, clearAll, undo } = useViewed(computed(() => prKey(pr)))
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
const panel = shallowRef<'description' | 'conversation' | null>(null)
const conversation = shallowRef<Conversation | null>(null)
const conversationUrl = `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}`
const actionNote = shallowRef('')

async function loadConversation() {
  if (!tokenAvailable.value) return
  try {
    conversation.value = await fetchConversation(pr)
  } catch {
    conversation.value = null
  }
}

function announce(text: string) {
  actionNote.value = text
  setTimeout(() => (actionNote.value = ''), 10_000)
}

const mergeMethod = computed<MergeMethod>({
  get: () => settings.value.mergeMethod,
  set: (value) => {
    settings.value = { ...settings.value, mergeMethod: value }
    void saveSetting('mergeMethod', value)
  },
})

const REVIEWED: Record<ReviewEvent, string> = {
  APPROVE: 'You approved this pull request.',
  REQUEST_CHANGES: 'You requested changes.',
  COMMENT: 'Your review comment is on GitHub.',
}

function onReviewed(event: ReviewEvent) {
  announce(REVIEWED[event])
  void loadConversation()
}

async function goToThread(thread: Thread) {
  await goToFile(thread.path)
  setTimeout(() => main.value?.querySelector(`[data-thread="${thread.id}"]`)?.scrollIntoView({ block: 'center' }), 250)
}

function onMerged(sha: string) {
  if (info.value) info.value = { ...info.value, state: 'merged' }
  announce(`Merged${info.value?.base ? ` into ${info.value.base}` : ''} as ${sha.slice(0, 7)}.`)
}

const settingsOpen = shallowRef(false)
const settingsSection = shallowRef<SettingsSectionId | undefined>()
provide(settingsOpenerKey, (section) => {
  // The token is typed on PR Sift's own page, never inside GitHub's.
  if (section === 'token') return openOptions('token')
  settingsSection.value = section
  settingsOpen.value = true
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
  announce(`Saved “${name}” as a filter in the top bar.`)
}

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

const fileLines = new Map<string, Promise<string[]>>()
provide(fileContextKey, {
  canExpand: computed(() => headSha.value !== ''),
  loadLines: (filename) => {
    const key = `${headSha.value}:${filename}`
    let pending = fileLines.get(key)
    if (!pending) {
      pending = fetchFileLines(pr, headSha.value, filename)
      pending.catch(() => fileLines.delete(key))
      fileLines.set(key, pending)
    }
    return pending
  },
  githubUrl: (filename) => githubFileUrl(pr, filename),
  comments: computed(() => conversation.value?.byFile ?? new Map<string, number>()),
  threads: computed(() => conversation.value?.threads ?? new Map<string, Thread[]>()),
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
  void loadConversation()
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

function hideFolder(path: string) {
  const selected = filter.selectedFolder.value
  if (selected === path || selected.startsWith(path + '/')) filter.setScopes([])
  return filter.toggleChip(folderChip(path), true)
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

function isEditable(target: EventTarget | undefined) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

async function onUndoKey(e: KeyboardEvent) {
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'z') return
  if (isEditable(e.composedPath()[0]) || notesOpen.value) return
  const restored = undo()
  if (!restored) return
  e.preventDefault()
  if (restored.length !== 1) return
  await nextTick()
  if (filter.inScope.value.some((f) => f.filename === restored[0])) await list.value?.scrollTo(restored[0]!)
}

onMounted(() => window.addEventListener('keydown', onUndoKey, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onUndoKey, true))

const removeExtension = (ext: string) => setCustomExtensions(settings.value.customExtensions.filter((e) => e !== ext))

onMounted(async () => {
  stopWatchingSettings = onSettingsChange((next) => (settings.value = next))
  settings.value = await getSettings()
  stopWatchingToken = watchToken((present) => {
    tokenAvailable.value = present
    if (present) void loadConversation()
    else conversation.value = null
  })
  filter.loadHiddenTypes(settings.value.hiddenTypes)
  filter.reviewMode.value = settings.value.reviewMode
  diffMode.value = settings.value.diffView
  showResolved.value = settings.value.showResolved
  sidebarSize.set(settings.value.sidebarWidth)
  await load(pr)
  emit('refreshed')
})

watch(diffMode, (value) => saveSetting('diffView', value))
watch(showResolved, (value) => saveSetting('showResolved', value))
watch(
  () => settings.value.diffView,
  (value) => (diffMode.value = value),
)
watch(
  () => settings.value.showResolved,
  (value) => (showResolved.value = value),
)
watch(
  () => settings.value.reviewMode,
  (value) => (filter.reviewMode.value = value),
)
</script>

<template>
  <div class="fixed inset-0 z-40 flex flex-col bg-background text-foreground">
    <Toolbar
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
    >
      <template #meta>
        <PrSummary v-if="status === 'ready'" v-model:panel="panel" :info="info" :conversation="conversation" />
      </template>
      <template #actions>
        <ReviewActions
          v-if="status === 'ready'"
          v-model:method="mergeMethod"
          :pr="pr"
          :info="info"
          :head-sha="headSha"
          :can-act="tokenAvailable"
          :conversation="conversation"
          @reviewed="onReviewed"
          @merged="onMerged"
        />
      </template>
    </Toolbar>

    <PrPanel
      v-if="panel && status === 'ready'"
      :tab="panel"
      :html="info?.descriptionHtml"
      :url="conversationUrl"
      :conversation="conversation"
      @update:tab="panel = $event"
      @close="panel = null"
      @jump="goToThread"
    />

    <FilterBar
      v-if="status === 'ready'"
      v-model:show-hidden="filter.showHidden.value"
      :review-mode="filter.reviewMode.value"
      :hidden-count="filter.hiddenCount.value"
      :filters-active="filter.filtersActive.value"
      :chips="filter.chips.value"
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
      @expand-cards="setAllCards(true)"
      @collapse-cards="setAllCards(false)"
      @save-view="saveView"
    />

    <NoticeBar v-if="updates.available.value || externalUpdate || refreshNote">
      <template #icon><RefreshCw :class="refreshing ? 'animate-spin' : ''" /></template>
      {{ refreshNote || 'New changes were pushed to this pull request.' }}
      <template #actions>
        <Button v-if="updates.available.value || externalUpdate" size="sm" :disabled="refreshing" @click="doRefresh">Refresh</Button>
      </template>
    </NoticeBar>

    <NoticeBar v-if="actionNote">
      <template #icon><CheckCircle2 class="text-success" /></template>
      {{ actionNote }}
    </NoticeBar>

    <UpdateNotice />
    <AutoOpenTip v-if="status === 'ready'" :enabled="settings.autoOpen" />

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
          <div class="border-b p-2">
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
          </div>
          <div class="p-2 pb-1">
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
              :indent="settings.treeIndent"
              :guides="settings.treeGuides"
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
              @hide-folder="hideFolder"
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
      <main ref="main" class="min-h-0 overflow-auto px-4 pb-4">
        <Empty v-if="allReviewed" class="mx-auto mt-16 max-w-sm border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon"><CheckCircle2 class="text-success" /></EmptyMedia>
            <EmptyTitle class="text-sm">Everything in this view is reviewed</EmptyTitle>
            <EmptyDescription>Nothing left to review here.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" @click="filter.reviewMode.value = false"
            >Show the {{ filter.viewedInView.value.length }} viewed files</Button
          >
          <Button as-child variant="link" size="sm" class="h-auto whitespace-normal text-muted-foreground">
            <a :href="REVIEWS_URL" target="_blank" rel="noopener noreferrer">Enjoying PR Sift? Rate it on the Chrome Web Store</a>
          </Button>
        </Empty>
        <Empty v-else-if="filter.inScope.value.length === 0 && filter.filtersActive.value" class="mx-auto mt-16 max-w-sm border-0">
          <EmptyHeader>
            <EmptyTitle class="text-sm">No files match these filters</EmptyTitle>
            <EmptyDescription>Nothing in this pull request fits the current type, folder or search filters.</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" @click="filter.resetFilters">Reset filters</Button>
        </Empty>
        <div v-else class="pt-4">
          <FileList ref="list" :files="filter.inScope.value" :viewed="viewed" @set-viewed="setViewed" />
        </div>
      </main>
    </div>

    <SettingsSheet v-model:open="settingsOpen" :section="settingsSection" :files="files" />

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
