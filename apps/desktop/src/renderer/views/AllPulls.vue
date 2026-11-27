<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { CircleAlert, RefreshCw, Search } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { githubProjects, useEverywhere } from '~/everywhere'
import { formatAgo } from '~/format'
import { useAuth } from '~/useAuth'
import { useProjects } from '~/useProjects'
import { useInbox } from '~/useInbox'
import { useSavedFlag } from '~/savedFlag'
import ProjectsOnlySwitch from '~/components/ProjectsOnlySwitch.vue'
import { NO_FILTERS, matchesFilters, type PullFilters } from '~/pulls/filters'
import PageHeader from '~/components/PageHeader.vue'
import PullFilterMenu from '~/components/PullFilterMenu.vue'
import PullTable from '~/components/PullTable.vue'
import PullViewMenu from '~/components/PullViewMenu.vue'
import PullFoldAll from '~/components/PullFoldAll.vue'
import Segmented from '~/components/Segmented.vue'
import PullListSkeleton from '~/components/skeletons/PullListSkeleton.vue'

// Every open pull request in every project, in the same rows as a project page.
const { status } = useAuth()
const { projects } = useProjects()
const { loaded, pulls: projectPulls, pullsLoading, pullErrors, pullsAt, loadPulls } = useEverywhere()
// Off, the page adds what GitHub has for you anywhere (to review, or yours); on, only your projects' pull requests.
const { on: projectsOnly, set: setProjectsOnly } = useSavedFlag('ps:pulls-projects-only')
const { inbox } = useInbox()
const pulls = computed(() => {
  if (projectsOnly.value || !inbox.value) return projectPulls.value
  const seen = new Set(projectPulls.value.map((p) => p.url))
  return [...projectPulls.value, ...[...inbox.value.review, ...inbox.value.mine].filter((p) => !seen.has(p.url) && seen.add(p.url))]
})
const me = computed(() => status.value?.account?.login)

const repos = computed(() => githubProjects(projects.value ?? []))
const query = shallowRef('')
const show = shallowRef<'all' | 'ready' | 'mine' | 'drafts'>('all')
const filters = shallowRef<PullFilters>({ ...NO_FILTERS })

const TESTS = {
  all: () => true,
  ready: (p: (typeof pulls.value)[number]) => !p.draft && p.decision !== 'APPROVED',
  mine: (p: (typeof pulls.value)[number]) => p.author?.login === me.value,
  drafts: (p: (typeof pulls.value)[number]) => p.draft,
}
const SHOW = computed(() =>
  (
    [
      ['all', 'Open'],
      ['ready', 'Needs review'],
      ['mine', 'Mine'],
      ['drafts', 'Drafts'],
    ] as const
  ).map(([value, label]) => ({ value, label, count: pulls.value.filter(TESTS[value]).length })),
)
const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return pulls.value
    .filter((p) => TESTS[show.value](p) && matchesFilters(p, filters.value))
    .filter(
      (p) =>
        !q ||
        [p.title, p.branch, p.author?.login ?? '', `${p.owner}/${p.repo}`, `#${p.number}`, ...p.labels.map((l) => l.name)].some((x) =>
          x.toLowerCase().includes(q),
        ),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)
})
const tags = computed(() => {
  if (!loaded.value) return []
  const count = new Set(pulls.value.map((p) => `${p.owner}/${p.repo}`.toLowerCase())).size
  return [`${pulls.value.length} open`, `${count} ${count === 1 ? 'repository' : 'repositories'}`]
})

watch(
  projects,
  (list) => {
    if (list) void loadPulls(list)
  },
  { immediate: true },
)
const refresh = () => projects.value && loadPulls(projects.value, true)
</script>

<template>
  <PageHeader title="All pull requests" :tags="tags">
    <span v-if="pullsAt && loaded" class="text-xs text-muted-foreground">Updated {{ formatAgo(pullsAt) }}</span>
    <Button variant="ghost" size="icon" class="text-muted-foreground" aria-label="Refresh" :disabled="pullsLoading" @click="refresh">
      <RefreshCw :class="{ 'animate-spin': pullsLoading }" />
    </Button>
  </PageHeader>

  <div class="flex flex-col gap-3 px-8 py-6">
    <Alert v-if="pullErrors.length" variant="destructive"
      ><CircleAlert /><AlertDescription class="whitespace-pre-line">{{ pullErrors.join('\n') }}</AlertDescription></Alert
    >
    <PullListSkeleton v-if="!projects || (repos.length && !loaded) || (!projectsOnly && !inbox)" />
    <template v-else>
      <div class="flex flex-wrap items-center gap-3">
        <InputGroup class="w-80 max-w-full">
          <InputGroupAddon><Search /></InputGroupAddon>
          <InputGroupInput v-model="query" placeholder="Filter by title, branch, author" aria-label="Filter pull requests" />
        </InputGroup>
        <Segmented v-model="show" :options="SHOW" label="Show" />
        <PullFilterMenu v-model="filters" :pulls="pulls" />
        <ProjectsOnlySwitch :model-value="projectsOnly" @update:model-value="setProjectsOnly" />
        <span class="ml-auto flex items-center gap-2"><PullFoldAll scope="all" /><PullViewMenu scope="all" /></span>
      </div>
      <p v-if="!pulls.length" class="text-muted-foreground">
        {{ projectsOnly && !repos.length ? 'None of your projects is on GitHub yet.' : 'No open pull requests.' }}
      </p>
      <p v-else-if="!visible.length" class="text-muted-foreground">No pull requests match.</p>
      <PullTable v-else scope="all" show-repo columns :groups="[{ title: 'Open', pulls: visible }]" :me="me" @changed="refresh" />
    </template>
  </div>
</template>
