<script setup lang="ts">
import { computed, reactive, shallowRef, watch } from 'vue'
import { ArrowLeft, CircleAlert, Code, Copy, RefreshCw, Search, SquareTerminal, X } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import GithubMark from '@/components/GithubMark.vue'
import { bridge } from '~/bridge'
import { isFresh, readCache, writeCache } from '~/cache'
import { appInfo } from '~/appInfo'
import { errorText, formatAgo, shortPath } from '~/format'
import type { ProjectOverview } from '#shared/ipc'
import { loadRepo, type RepoActivity } from '~/github'
import { canGoBack, goBack, project, projectTab, view, type ProjectTab } from '~/navigation'
import { useAuth } from '~/useAuth'
import { useProjects } from '~/useProjects'
import PullTable from '~/components/PullTable.vue'
import Segmented from '~/components/Segmented.vue'
import BranchList from '~/components/BranchList.vue'
import ProjectIcon from '~/components/ProjectIcon.vue'
import Hint from '~/components/Hint.vue'
import ProjectSummary from '~/components/ProjectSummary.vue'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import Worktrees from './Worktrees.vue'
import Cleanup from './Cleanup.vue'

const { find, remove } = useProjects()
const { status } = useAuth()
const current = computed(() => find(project.value))
const activity = shallowRef<RepoActivity | null>(null)
const overview = shallowRef<ProjectOverview | null>(null)
const loadedAt = shallowRef<number | null>(null)
// Filled in by the Branches and Worktrees tabs once they have looked.
const counts = reactive<{ branches?: number; worktrees?: number }>({})
const loading = shallowRef(false)
const error = shallowRef('')
const note = shallowRef('')
const removing = shallowRef(false)
let noteTimer: ReturnType<typeof setTimeout> | undefined

const me = computed(() => status.value?.account?.login)
const pullQuery = shallowRef('')
const pullFilter = shallowRef<'all' | 'mine' | 'drafts' | 'ready'>('all')
const visiblePulls = computed(() => {
  const q = pullQuery.value.trim().toLowerCase()
  return (activity.value?.pulls ?? []).filter((p) => {
    if (pullFilter.value === 'mine' && p.author?.login !== me.value) return false
    if (pullFilter.value === 'drafts' && !p.draft) return false
    if (pullFilter.value === 'ready' && (p.draft || p.decision === 'APPROVED')) return false
    if (!q) return true
    return [p.title, p.branch, p.author?.login ?? '', `#${p.number}`, ...p.labels.map((l) => l.name)].some((x) =>
      x.toLowerCase().includes(q),
    )
  })
})
const waiting = computed(() => visiblePulls.value.filter((p) => me.value && p.reviewers.includes(me.value)))
const others = computed(() => visiblePulls.value.filter((p) => !waiting.value.includes(p)))
const filterCounts = computed(() => {
  const all = activity.value?.pulls ?? []
  return {
    all: all.length,
    ready: all.filter((p) => !p.draft && p.decision !== 'APPROVED').length,
    mine: all.filter((p) => p.author?.login === me.value).length,
    drafts: all.filter((p) => p.draft).length,
  }
})
const FILTERS = computed(() => [
  { value: 'all' as const, label: 'All', count: filterCounts.value.all },
  { value: 'ready' as const, label: 'Needs review', count: filterCounts.value.ready },
  { value: 'mine' as const, label: 'Mine', count: filterCounts.value.mine },
  { value: 'drafts' as const, label: 'Drafts', count: filterCounts.value.drafts },
])

const TABS = computed<{ id: ProjectTab; label: string; count?: number }[]>(() => [
  { id: 'pulls', label: 'Pull requests', count: activity.value?.pulls.length },
  { id: 'branches', label: 'Branches', count: counts.branches },
  { id: 'worktrees', label: 'Worktrees', count: counts.worktrees },
  { id: 'files', label: 'Hidden files' },
])
const description = computed(() => activity.value?.info?.description || overview.value?.description)
const repoUrl = computed(() =>
  current.value?.github ? `https://github.com/${current.value.github.owner}/${current.value.github.repo}` : '',
)

// Shows the last copy at once; asks GitHub again when it is older than a minute, or when asked to.
async function load(force = false) {
  const p = current.value
  error.value = ''
  if (!p?.github) {
    activity.value = null
    return
  }
  const key = `repo:${p.github.owner}/${p.github.repo}`.toLowerCase()
  const saved = readCache<RepoActivity>(key)
  activity.value = saved?.value ?? null
  loadedAt.value = saved?.at ?? null
  if (!force && isFresh(saved, 60_000)) return
  loading.value = true
  try {
    const entry = writeCache(key, await loadRepo(p.github.owner, p.github.repo))
    if (current.value?.path !== p.path) return
    activity.value = entry.value
    loadedAt.value = entry.at
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}

async function loadOverview() {
  const p = current.value
  if (!p) return
  const key = `overview:${p.path}`
  const saved = readCache<ProjectOverview>(key)
  overview.value = saved?.value ?? null
  if (isFresh(saved, 5 * 60_000)) return
  try {
    const next = writeCache(key, await bridge.invoke('projects:overview', p.path)).value
    if (current.value?.path === p.path) overview.value = next
  } catch {
    overview.value ??= { stack: [] }
  }
}

watch(
  () => current.value?.path,
  () => {
    // Counts from the last look, until the tabs look again.
    const path = current.value?.path ?? ''
    counts.branches = readCache<unknown[]>(`branches:${path}`)?.value.length
    counts.worktrees = readCache<{ worktrees: { main?: boolean }[] }[]>(`worktrees:${path}`)?.value.flatMap((r) =>
      r.worktrees.filter((w) => !w.main),
    ).length
    void load()
    void loadOverview()
  },
  { immediate: true },
)

function flash(text: string) {
  note.value = text
  clearTimeout(noteTimer)
  noteTimer = setTimeout(() => (note.value = ''), 3500)
}

async function copyPath() {
  if (!current.value) return
  try {
    await navigator.clipboard.writeText(current.value.path)
    flash('Path copied')
  } catch (e) {
    flash(errorText(e))
  }
}

async function openIn(target: 'editor' | 'terminal') {
  const p = current.value
  if (!p) return
  note.value = ''
  try {
    // The project's main folder becomes known to the main process once its worktrees are listed.
    await bridge.invoke('worktrees:list', p.path)
    const res = await bridge.invoke('worktrees:open', p.path, target)
    flash(res.ok ? `Opened in ${res.app}` : (res.error ?? 'Could not open it.'))
  } catch (e) {
    note.value = errorText(e)
  }
}

async function confirmRemove() {
  if (!current.value) return
  await remove(current.value.path)
  removing.value = false
  project.value = null
  view.value = 'inbox'
}
</script>

<template>
  <div v-if="!current" class="p-6 text-muted-foreground">This project is no longer in your list.</div>
  <template v-else>
    <header class="sticky top-0 z-10 flex flex-col gap-4 border-b border-border bg-background/95 px-8 pt-6 backdrop-blur">
      <div class="flex flex-wrap items-center gap-x-3.5 gap-y-3">
        <Hint text="Back">
          <Button size="icon-sm" variant="ghost" class="-ml-2 text-muted-foreground" aria-label="Back" :disabled="!canGoBack" @click="goBack"
            ><ArrowLeft
          /></Button>
        </Hint>
        <ProjectIcon :project="current" :size="40" />
        <div class="flex min-w-[240px] flex-1 flex-col gap-[3px]">
          <div class="flex min-w-0 items-baseline gap-2.5">
            <h1 class="shrink-0 text-xl font-semibold tracking-[-0.01em]">{{ current.name }}</h1>
            <span v-if="description" class="truncate text-[13px] text-muted-foreground" :title="description">{{ description }}</span>
          </div>
          <div class="flex min-w-0 items-center gap-2.5 text-[12.5px] text-muted-foreground">
            <Hint v-if="current.github" text="Open the repository on GitHub">
              <a :href="repoUrl" target="_blank" rel="noreferrer" class="flex shrink-0 items-center gap-1.5 hover:text-emphasis"
                ><GithubMark class="size-3.5" />{{ current.github.owner }}/{{ current.github.repo }}</a
              >
            </Hint>
            <template v-if="current.branch">
              <span aria-hidden="true" class="text-input">·</span>
              <Hint :text="current.github ? 'Open this branch on GitHub' : 'The branch checked out in this folder'">
                <component
                  :is="current.github ? 'a' : 'span'"
                  :href="current.github ? `${repoUrl}/tree/${encodeURIComponent(current.branch)}` : undefined"
                  target="_blank"
                  rel="noreferrer"
                  class="max-w-[280px] shrink-0 truncate font-mono text-foreground/80 hover:text-emphasis"
                  >{{ current.branch }}</component
                >
              </Hint>
            </template>
            <span aria-hidden="true" class="text-input">·</span>
            <Hint text="Show the folder">
              <button type="button" class="min-w-0 truncate hover:text-emphasis" @click="bridge.invoke('shell:reveal', current.path)">
                {{ shortPath(current.path, appInfo.home) }}
              </button>
            </Hint>
            <Hint text="Copy the path">
              <Button size="icon-xs" variant="ghost" class="-ml-1 text-muted-foreground" aria-label="Copy the path" @click="copyPath"
                ><Copy
              /></Button>
            </Hint>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <Transition
            enter-from-class="opacity-0"
            leave-to-class="opacity-0"
            enter-active-class="transition-opacity"
            leave-active-class="transition-opacity duration-500"
          >
            <span v-if="note" class="mr-1 text-xs text-muted-foreground">{{ note }}</span>
          </Transition>
          <Hint text="Open in your editor">
            <Button size="sm" variant="outline" aria-label="Open in editor" @click="openIn('editor')"
              ><Code /><span class="max-lg:hidden">Open in editor</span></Button
            >
          </Hint>
          <Hint text="Open a terminal here">
            <Button size="sm" variant="outline" aria-label="Terminal" @click="openIn('terminal')"
              ><SquareTerminal /><span class="max-lg:hidden">Terminal</span></Button
            >
          </Hint>
          <Hint text="Remove from PR Sift. The folder stays on disk.">
            <Button size="icon-sm" variant="ghost" class="text-faint" aria-label="Remove from PR Sift" @click="removing = true"><X /></Button>
          </Hint>
        </div>
      </div>
      <ProjectSummary class="pl-[54px]" :overview="overview" :info="activity?.info" />
      <Tabs
        :model-value="projectTab"
        class="-mb-px overflow-x-auto [scrollbar-width:none]"
        @update:model-value="(v) => (projectTab = v as ProjectTab)"
      >
        <TabsList variant="line" aria-label="Project" class="h-10 gap-4 p-0">
          <TabsTrigger
            v-for="t in TABS"
            :key="t.id"
            :value="t.id"
            class="group/tab flex-none px-0.5 after:bg-emphasis data-active:font-semibold group-data-horizontal/tabs:after:bottom-0"
          >
            {{ t.label
            }}<span
              v-if="t.count !== undefined"
              class="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground tabular-nums group-data-active/tab:bg-emphasis/15 group-data-active/tab:text-emphasis"
              >{{ t.count }}</span
            >
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </header>

    <div class="flex flex-col gap-3.5 px-8 py-5">
      <template v-if="projectTab === 'pulls'">
        <Alert v-if="!current.github" class="border-attention/50">
          <CircleAlert class="text-attention" />
          <AlertDescription>This repository has no GitHub remote, so there are no pull requests to show.</AlertDescription>
        </Alert>
        <Alert v-if="error" variant="destructive"
          ><CircleAlert /><AlertDescription>{{ error }}</AlertDescription></Alert
        >
        <div v-if="loading && !activity" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Asking GitHub…</div>
      </template>

      <template v-if="projectTab === 'pulls' && activity">
        <div class="flex flex-wrap items-center gap-2.5">
          <InputGroup class="w-[300px]">
            <InputGroupAddon><Search /></InputGroupAddon>
            <InputGroupInput v-model="pullQuery" placeholder="Filter by title, branch, author" aria-label="Filter pull requests" />
          </InputGroup>
          <Segmented v-model="pullFilter" :options="FILTERS" label="Show" />
          <span class="flex-1" />
          <span v-if="loadedAt" class="text-xs text-faint">Updated {{ formatAgo(loadedAt) }}</span>
          <Hint text="Ask GitHub again">
            <Button size="icon-sm" variant="ghost" aria-label="Refresh" :disabled="loading" @click="load(true)">
              <Spinner v-if="loading" /><RefreshCw v-else />
            </Button>
          </Hint>
        </div>
        <p v-if="!activity.pulls.length" class="text-muted-foreground">No open pull requests.</p>
        <p v-else-if="!visiblePulls.length" class="text-muted-foreground">No pull requests match.</p>
        <PullTable
          v-else
          :groups="[
            { title: 'Waiting for you', pulls: waiting },
            { title: waiting.length ? 'Other open' : 'Open', pulls: others },
          ]"
          :me="me"
          @changed="load(true)"
        />
      </template>

      <BranchList
        v-else-if="projectTab === 'branches'"
        :key="current.path"
        :repo="current.path"
        :github="current.github"
        :pulls="activity?.pulls"
        @count="(n: number) => (counts.branches = n)"
      />
      <Worktrees
        v-else-if="projectTab === 'worktrees'"
        :key="current.path"
        :project-path="current.path"
        :pulls="activity?.pulls"
        @count="(n: number) => (counts.worktrees = n)"
      />
      <Cleanup v-else-if="projectTab === 'files'" :key="current.path" :root="current.path" />
    </div>
  </template>

  <ConfirmDialog
    :open="removing"
    :title="`Remove ${current?.name ?? ''} from PR Sift?`"
    description="Only the entry in this list goes away. The folder and its files are not touched."
    confirm="Remove"
    @update:open="(v) => (removing = v)"
    @confirm="confirmRemove"
  />
</template>
