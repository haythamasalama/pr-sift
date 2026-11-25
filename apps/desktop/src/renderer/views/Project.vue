<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { CircleAlert, Code, FolderOpen, RefreshCw, Search, SquareTerminal, X } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import GithubMark from '@/components/GithubMark.vue'
import { bridge } from '~/bridge'
import { appInfo } from '~/appInfo'
import { errorText, shortPath } from '~/format'
import { loadRepo, type RepoActivity } from '~/github'
import { openReview, project, projectTab, view, type ProjectTab } from '~/navigation'
import { useAuth } from '~/useAuth'
import { useProjects } from '~/useProjects'
import PullRow from '~/components/PullRow.vue'
import BranchList from '~/components/BranchList.vue'
import ProjectIcon from '~/components/ProjectIcon.vue'
import BranchName from '~/components/BranchName.vue'
import Hint from '~/components/Hint.vue'
import ProjectSummary from '~/components/ProjectSummary.vue'
import ConfirmDialog from '~/components/ConfirmDialog.vue'
import Worktrees from './Worktrees.vue'
import Cleanup from './Cleanup.vue'

const { find, remove } = useProjects()
const { status } = useAuth()
const current = computed(() => find(project.value))
const activity = shallowRef<RepoActivity | null>(null)
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

const TABS = computed<{ id: ProjectTab; label: string; count?: number }[]>(() => [
  { id: 'pulls', label: 'Pull requests', count: activity.value?.pulls.length },
  { id: 'branches', label: 'Branches' },
  { id: 'worktrees', label: 'Worktrees' },
  { id: 'files', label: 'Hidden files' },
])

async function load() {
  const p = current.value
  activity.value = null
  error.value = ''
  if (!p?.github) return
  loading.value = true
  try {
    activity.value = await loadRepo(p.github.owner, p.github.repo)
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}

watch(() => current.value?.path, load, { immediate: true })

async function openIn(target: 'editor' | 'terminal') {
  const p = current.value
  if (!p) return
  note.value = ''
  try {
    // The project's main folder becomes known to the main process once its worktrees are listed.
    await bridge.invoke('worktrees:list', p.path)
    const res = await bridge.invoke('worktrees:open', p.path, target)
    note.value = res.ok ? `Opened in ${res.app}` : (res.error ?? 'Could not open it.')
    clearTimeout(noteTimer)
    noteTimer = setTimeout(() => (note.value = ''), 3500)
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
    <header class="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-background/95 px-6 pt-5 backdrop-blur">
      <div class="flex items-start gap-3.5">
        <div class="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/70">
          <ProjectIcon :project="current" :size="28" />
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 class="truncate text-lg leading-tight font-semibold">{{ current.name }}</h1>
          <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <BranchName
              v-if="current.branch"
              :name="current.branch"
              size="xs"
              :href="
                current.github
                  ? `https://github.com/${current.github.owner}/${current.github.repo}/tree/${encodeURIComponent(current.branch)}`
                  : undefined
              "
            />
            <Hint v-if="current.github" text="Open the repository on GitHub">
              <a
                :href="`https://github.com/${current.github.owner}/${current.github.repo}`"
                target="_blank"
                rel="noreferrer"
                class="flex items-center gap-1 hover:text-foreground"
                ><GithubMark class="size-3.5" />{{ current.github.owner }}/{{ current.github.repo }}</a
              >
            </Hint>
            <Hint text="Show the folder">
              <button
                type="button"
                class="flex min-w-0 items-center gap-1 hover:text-foreground"
                @click="bridge.invoke('shell:reveal', current.path)"
              >
                <FolderOpen class="size-3.5 shrink-0" /><span class="truncate">{{ shortPath(current.path, appInfo.home) }}</span>
              </button>
            </Hint>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-1.5">
          <Transition
            enter-from-class="opacity-0"
            leave-to-class="opacity-0"
            enter-active-class="transition-opacity"
            leave-active-class="transition-opacity duration-500"
          >
            <span v-if="note" class="mr-1 text-xs text-muted-foreground">{{ note }}</span>
          </Transition>
          <Button size="sm" variant="outline" @click="openIn('editor')"><Code /> Editor</Button>
          <Button size="sm" variant="outline" @click="openIn('terminal')"><SquareTerminal /> Terminal</Button>
          <Hint text="Remove from PR Sift. The folder stays on disk.">
            <Button size="icon-sm" variant="ghost" aria-label="Remove from PR Sift" @click="removing = true"><X /></Button>
          </Hint>
        </div>
      </div>
      <ProjectSummary :key="current.path" :project="current" :info="activity?.info" />
      <nav class="-mb-px flex gap-4 overflow-x-auto" aria-label="Project">
        <button
          v-for="t in TABS"
          :key="t.id"
          type="button"
          class="flex items-center gap-1.5 border-b-2 pb-2 whitespace-nowrap"
          :class="projectTab === t.id ? 'border-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'"
          @click="projectTab = t.id"
        >
          {{ t.label }}
          <span v-if="t.count !== undefined" class="rounded-full bg-secondary px-1.5 text-xs tabular-nums">{{ t.count }}</span>
        </button>
      </nav>
    </header>

    <div class="flex flex-col gap-4 p-6">
      <template v-if="projectTab === 'pulls'">
        <Alert v-if="!current.github" class="border-attention/50">
          <CircleAlert class="text-attention" />
          <AlertDescription>This repository has no GitHub remote, so there are no pull requests to show.</AlertDescription>
        </Alert>
        <Alert v-if="error" variant="destructive"
          ><CircleAlert /><AlertDescription>{{ error }}</AlertDescription></Alert
        >
        <div v-if="loading" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Asking GitHub…</div>
      </template>

      <template v-if="projectTab === 'pulls' && activity">
        <div class="flex flex-wrap items-center gap-2">
          <InputGroup class="w-64">
            <InputGroupAddon><Search /></InputGroupAddon>
            <InputGroupInput v-model="pullQuery" placeholder="Filter by title, branch, author, label" aria-label="Filter pull requests" />
          </InputGroup>
          <ToggleGroup v-model="pullFilter" type="single" variant="outline" size="sm" aria-label="Show">
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="ready">Needs review</ToggleGroupItem>
            <ToggleGroupItem value="mine">Mine</ToggleGroupItem>
            <ToggleGroupItem value="drafts">Drafts</ToggleGroupItem>
          </ToggleGroup>
          <Button size="sm" variant="outline" class="ml-auto" :disabled="loading" @click="load"><RefreshCw /> Refresh</Button>
        </div>
        <section v-if="waiting.length" class="flex flex-col gap-2">
          <h2 class="font-semibold">Waiting for your review</h2>
          <ul class="divide-y divide-border overflow-hidden rounded-lg border border-border">
            <PullRow v-for="p in waiting" :key="p.url" :pull="p" :me="me" @open="openReview(p)" />
          </ul>
        </section>
        <p v-if="!activity.pulls.length" class="text-muted-foreground">No open pull requests.</p>
        <p v-else-if="!visiblePulls.length" class="text-muted-foreground">No pull requests match.</p>
        <section v-else-if="others.length" class="flex flex-col gap-2">
          <h2 v-if="waiting.length" class="font-semibold">Everything else</h2>
          <ul class="divide-y divide-border overflow-hidden rounded-lg border border-border">
            <PullRow v-for="p in others" :key="p.url" :pull="p" :me="me" @open="openReview(p)" />
          </ul>
        </section>
      </template>

      <BranchList
        v-else-if="projectTab === 'branches'"
        :key="current.path"
        :repo="current.path"
        :github="current.github"
        :pulls="activity?.pulls"
      />
      <Worktrees v-else-if="projectTab === 'worktrees'" :key="current.path" :project-path="current.path" :pulls="activity?.pulls" />
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
