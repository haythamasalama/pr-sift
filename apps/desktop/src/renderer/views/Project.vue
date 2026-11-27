<script setup lang="ts">
import { computed, reactive, shallowRef, watch } from 'vue'
import {
  ArrowLeft,
  CircleAlert,
  Code,
  Copy,
  Ellipsis,
  ExternalLink,
  EyeOff,
  FolderGit2,
  FolderOpen,
  GitBranch,
  GitPullRequest,
  RefreshCw,
  Search,
  SquareTerminal,
  X,
} from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { bridge } from '~/bridge'
import { isFresh, readCache, writeCache } from '~/cache'
import { isStale, useLive } from '~/useLive'
import { errorText, formatAgo } from '~/format'
import type { ProjectOverview } from '#shared/ipc'
import { loadRepo, type RepoActivity } from '~/github'
import { canGoBack, goBack, project, projectTab, view, type ProjectTab } from '~/navigation'
import { useAuth } from '~/useAuth'
import { useProjects } from '~/useProjects'
import PullTable from '~/components/PullTable.vue'
import PullFilterMenu from '~/components/PullFilterMenu.vue'
import PullViewMenu from '~/components/PullViewMenu.vue'
import { NO_FILTERS, matchesFilters, type PullFilters } from '~/pulls/filters'
import Segmented from '~/components/Segmented.vue'
import BranchList from '~/components/BranchList.vue'
import ProjectIcon from '~/components/ProjectIcon.vue'
import Hint from '~/components/Hint.vue'
import ProjectSummary from '~/components/ProjectSummary.vue'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import CountBadge from '~/components/CountBadge.vue'
import PathText from '~/components/PathText.vue'
import Worktrees from './Worktrees.vue'
import HiddenFiles from './HiddenFiles.vue'

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
const pullFilters = shallowRef<PullFilters>({ ...NO_FILTERS })
const visiblePulls = computed(() => {
  const q = pullQuery.value.trim().toLowerCase()
  return (activity.value?.pulls ?? []).filter((p) => {
    if (pullFilter.value === 'mine' && p.author?.login !== me.value) return false
    if (pullFilter.value === 'drafts' && !p.draft) return false
    if (pullFilter.value === 'ready' && (p.draft || p.decision === 'APPROVED')) return false
    if (!matchesFilters(p, pullFilters.value)) return false
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

const TABS = computed<{ id: ProjectTab; label: string; icon: typeof GitBranch; count?: number }[]>(() => [
  { id: 'pulls', label: 'Pull requests', icon: GitPullRequest, count: activity.value?.pulls.length },
  { id: 'branches', label: 'Branches', icon: GitBranch, count: counts.branches },
  { id: 'worktrees', label: 'Worktrees', icon: FolderGit2, count: counts.worktrees },
  { id: 'files', label: 'Hidden files', icon: EyeOff },
])
const description = computed(() => activity.value?.info?.description || overview.value?.description)
const repoUrl = computed(() =>
  current.value?.github ? `https://github.com/${current.value.github.owner}/${current.value.github.repo}` : '',
)

// Shows the last copy at once; asks GitHub again when it is out of date, or when asked to.
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
  if (!force && !isStale(saved?.at)) return
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

// Stays current on its own: after a change made from the app, on coming back to the window, and every so often.
useLive(
  () => load(true),
  () => loadedAt.value,
)

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
    // Filters belong to the project they were picked in.
    pullQuery.value = ''
    pullFilters.value = { ...NO_FILTERS }
    // Counts from the last look, until the tabs look again.
    const path = current.value?.path ?? ''
    counts.branches = readCache<unknown[]>(`branches:${path}`)?.value.length
    counts.worktrees = readCache<{ worktrees: { main?: boolean }[] }[]>(`worktrees:${path}`)?.value.flatMap((r) =>
      r.worktrees.filter((w) => !w.main),
    ).length
    void load()
    void loadOverview()
    void loadCounts(path)
  },
  { immediate: true },
)

// The Branches and Worktrees tabs show their counts as soon as the project opens, not only after you visit them.
async function loadCounts(path: string) {
  if (!path) return
  const [branches, repo] = await Promise.allSettled([bridge.invoke('branches:list', path), bridge.invoke('worktrees:list', path)])
  if (current.value?.path !== path) return
  if (branches.status === 'fulfilled') counts.branches = writeCache(`branches:${path}`, branches.value).value.length
  if (repo.status === 'fulfilled') {
    writeCache(`worktrees:${path}`, [repo.value])
    counts.worktrees = repo.value.worktrees.filter((w) => !w.main).length
  }
}

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
    <header class="sticky top-0 z-10 flex flex-col border-b border-border bg-background">
      <div class="flex items-center gap-3 px-6 pt-4">
        <Button size="icon-sm" variant="ghost" class="text-muted-foreground" aria-label="Back" :disabled="!canGoBack" @click="goBack"
          ><ArrowLeft class="size-4"
        /></Button>

        <ProjectIcon :project="current" :size="32" />
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <div class="flex min-w-0 items-baseline gap-2.5">
            <h1 class="shrink-0 text-base leading-[22px] font-semibold">{{ current.name }}</h1>
            <span v-if="description" class="truncate text-xs text-muted-foreground" :title="description">{{ description }}</span>
          </div>
          <div class="flex min-w-0 items-center gap-2 text-xs whitespace-nowrap text-muted-foreground">
            <a v-if="current.github" :href="repoUrl" target="_blank" rel="noreferrer" class="shrink-0 hover:text-foreground"
              >{{ current.github.owner }}/{{ current.github.repo }}</a
            >

            <template v-if="current.branch">
              <span v-if="current.github" aria-hidden="true">·</span>

              <component
                :is="current.github ? 'a' : 'span'"
                :href="current.github ? `${repoUrl}/tree/${encodeURIComponent(current.branch)}` : undefined"
                target="_blank"
                rel="noreferrer"
                class="max-w-[280px] shrink-0 truncate rounded-md bg-emphasis/15 px-1 font-mono text-[11px] text-emphasis"
                >{{ current.branch }}</component
              >
            </template>
            <span aria-hidden="true">·</span>
            <PathText :path="current.path" />
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

          <Button
            size="icon"
            variant="ghost"
            class="text-muted-foreground"
            aria-label="Show the folder"
            @click="bridge.invoke('shell:reveal', current.path)"
            ><FolderOpen
          /></Button>

          <span class="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button size="icon" variant="ghost" class="text-muted-foreground" aria-label="More"><Ellipsis /></Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" class="w-56">
              <DropdownMenuItem v-if="current.github" as-child
                ><a :href="repoUrl" target="_blank" rel="noreferrer"><ExternalLink /> Open on GitHub</a></DropdownMenuItem
              >
              <DropdownMenuItem @select="copyPath"><Copy /> Copy the full path</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" @select="removing = true"><X /> Remove from PR Sift</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ProjectSummary class="pt-2 pr-6 pl-[108px]" :overview="overview" :info="activity?.info" />
      <nav aria-label="Project" role="tablist" class="mt-3 flex gap-5 overflow-x-auto px-6 [scrollbar-width:none]">
        <button
          v-for="t in TABS"
          :key="t.id"
          type="button"
          role="tab"
          :aria-selected="projectTab === t.id"
          :aria-label="t.label"
          :title="t.label"
          class="relative flex h-10 shrink-0 items-center gap-1.5 px-0.5 whitespace-nowrap transition-colors"
          :class="projectTab === t.id ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground'"
          @click="projectTab = t.id"
        >
          <!-- In a narrow window the tabs keep their icons and counts; the open tab keeps its name too. -->
          <component :is="t.icon" class="size-4" /><span :class="projectTab === t.id ? '' : '@max-2xl:hidden'">{{ t.label }}</span
          ><CountBadge v-if="t.count !== undefined">{{ t.count }}</CountBadge>
          <span class="absolute inset-x-0 -bottom-px h-0.5 rounded-full" :class="projectTab === t.id ? 'bg-emphasis' : ''" />
        </button>
      </nav>
    </header>

    <div class="flex flex-col gap-3 px-6 py-4">
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
        <div class="flex flex-wrap items-center gap-3">
          <InputGroup class="w-80 max-w-full">
            <InputGroupAddon><Search /></InputGroupAddon>
            <InputGroupInput v-model="pullQuery" placeholder="Filter by title, branch, author" aria-label="Filter pull requests" />
          </InputGroup>
          <Segmented v-model="pullFilter" :options="FILTERS" label="Show" />
          <PullFilterMenu v-model="pullFilters" :pulls="activity.pulls" />
          <span class="ml-auto flex shrink-0 items-center gap-2">
            <span v-if="loadedAt" class="text-xs text-muted-foreground">Updated {{ formatAgo(loadedAt) }}</span>

            <Button
              size="icon-sm"
              variant="ghost"
              class="text-muted-foreground"
              aria-label="Refresh"
              :disabled="loading"
              @click="load(true)"
            >
              <Spinner v-if="loading" /><RefreshCw v-else />
            </Button>
            <PullViewMenu />
          </span>
        </div>
        <p v-if="!activity.pulls.length" class="text-muted-foreground">No open pull requests.</p>
        <p v-else-if="!visiblePulls.length" class="text-muted-foreground">No pull requests match.</p>
        <PullTable
          v-else
          columns
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
        :can-push="activity?.info.canPush === true"
        @count="(n: number) => (counts.branches = n)"
      />
      <Worktrees
        v-else-if="projectTab === 'worktrees'"
        :key="current.path"
        :project-path="current.path"
        :pulls="activity?.pulls"
        @count="(n: number) => (counts.worktrees = n)"
      />
      <HiddenFiles v-else-if="projectTab === 'files'" :key="current.path" :root="current.path" />
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
