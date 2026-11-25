<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { CircleAlert, Code, FolderOpen, GitBranch, RefreshCw, SquareTerminal, X } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import GithubMark from '@/components/GithubMark.vue'
import { bridge } from '~/bridge'
import { appInfo } from '~/appInfo'
import { errorText, shortPath } from '~/format'
import { loadRepo, type RepoActivity } from '~/github'
import { openReview, project, projectTab, view, type ProjectTab } from '~/navigation'
import { useAuth } from '~/useAuth'
import { useProjects } from '~/useProjects'
import PullRow from '~/components/PullRow.vue'
import IssueRow from '~/components/IssueRow.vue'
import BranchList from '~/components/BranchList.vue'
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

const me = computed(() => status.value?.account?.login)
const waiting = computed(() => activity.value?.pulls.filter((p) => me.value && p.reviewers.includes(me.value)) ?? [])
const others = computed(() => activity.value?.pulls.filter((p) => !waiting.value.includes(p)) ?? [])

const TABS = computed<{ id: ProjectTab; label: string; count?: number }[]>(() => [
  { id: 'pulls', label: 'Pull requests', count: activity.value?.pulls.length },
  { id: 'issues', label: 'Issues', count: activity.value?.issues.length },
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
    note.value = res.ok ? `Opened in ${res.app}.` : (res.error ?? 'Could not open it.')
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
    <header class="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-background/95 px-6 pt-4 backdrop-blur">
      <div class="flex flex-wrap items-start gap-3">
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 class="flex items-center gap-2 text-base font-semibold">
            {{ current.name }}
            <span v-if="current.branch" class="flex items-center gap-1 text-xs font-normal text-muted-foreground"
              ><GitBranch class="size-3.5" />{{ current.branch }}</span
            >
          </h1>
          <p class="truncate text-xs text-muted-foreground">
            {{ shortPath(current.path, appInfo.home) }}
            <template v-if="current.github"> · {{ current.github.owner }}/{{ current.github.repo }}</template>
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="outline" @click="openIn('editor')"><Code /> Editor</Button>
          <Button size="sm" variant="outline" @click="openIn('terminal')"><SquareTerminal /> Terminal</Button>
          <Button
            size="icon-sm"
            variant="ghost"
            title="Show in folder"
            aria-label="Show in folder"
            @click="bridge.invoke('shell:reveal', current.path)"
            ><FolderOpen
          /></Button>
          <Button v-if="current.github" size="icon-sm" variant="ghost" as-child title="Open on GitHub">
            <a
              :href="`https://github.com/${current.github.owner}/${current.github.repo}`"
              target="_blank"
              rel="noreferrer"
              aria-label="Open on GitHub"
              ><GithubMark class="size-4"
            /></a>
          </Button>
          <Button size="icon-sm" variant="ghost" title="Remove from PR Sift" aria-label="Remove from PR Sift" @click="removing = true"
            ><X
          /></Button>
        </div>
      </div>
      <p v-if="note" class="-mt-1 text-xs text-muted-foreground">{{ note }}</p>
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
      <template v-if="projectTab === 'pulls' || projectTab === 'issues'">
        <Alert v-if="!current.github" class="border-attention/50">
          <CircleAlert class="text-attention" />
          <AlertDescription>This repository has no GitHub remote, so there are no pull requests or issues to show.</AlertDescription>
        </Alert>
        <Alert v-if="error" variant="destructive"
          ><CircleAlert /><AlertDescription>{{ error }}</AlertDescription></Alert
        >
        <div v-if="loading" class="flex items-center gap-2 text-muted-foreground"><Spinner /> Asking GitHub…</div>
      </template>

      <template v-if="projectTab === 'pulls' && activity">
        <div class="flex items-center">
          <p class="flex-1 text-muted-foreground">Open pull requests, latest activity first. Click one to review it here.</p>
          <Button size="sm" variant="outline" :disabled="loading" @click="load"><RefreshCw /> Refresh</Button>
        </div>
        <section v-if="waiting.length" class="flex flex-col gap-2">
          <h2 class="font-semibold">Waiting for your review</h2>
          <ul class="divide-y divide-border overflow-hidden rounded-lg border border-border">
            <PullRow v-for="p in waiting" :key="p.url" :pull="p" :me="me" @open="openReview(p)" />
          </ul>
        </section>
        <p v-if="!activity.pulls.length" class="text-muted-foreground">No open pull requests.</p>
        <section v-else-if="others.length" class="flex flex-col gap-2">
          <h2 v-if="waiting.length" class="font-semibold">Everything else</h2>
          <ul class="divide-y divide-border overflow-hidden rounded-lg border border-border">
            <PullRow v-for="p in others" :key="p.url" :pull="p" :me="me" @open="openReview(p)" />
          </ul>
        </section>
      </template>

      <template v-else-if="projectTab === 'issues' && activity">
        <p v-if="!activity.issues.length" class="text-muted-foreground">No open issues.</p>
        <ul v-else class="divide-y divide-border overflow-hidden rounded-lg border border-border">
          <IssueRow v-for="i in activity.issues" :key="i.url" :issue="i" />
        </ul>
      </template>

      <BranchList v-else-if="projectTab === 'branches'" :key="current.path" :repo="current.path" :pulls="activity?.pulls" />
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
