<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { GitCommitHorizontal, GitFork, Globe, Lock, Scale, Star, Users } from '@lucide/vue'
import type { Project, ProjectOverview } from '#shared/ipc'
import type { RepoInfo } from '~/github'
import { bridge } from '~/bridge'
import { formatAgo } from '~/format'

const { project, info } = defineProps<{ project: Project; info?: RepoInfo }>()
const local = shallowRef<ProjectOverview | null>(null)

const description = computed(() => info?.description || local.value?.description || local.value?.readme)
// The README paragraph is shown too when it says more than the one-line description.
const readme = computed(() => (local.value?.readme && local.value.readme !== description.value ? local.value.readme : undefined))
const stack = computed(() => {
  const list = [...(local.value?.stack ?? [])]
  if (info?.language && !list.some((s) => s.toLowerCase() === info.language!.name.toLowerCase())) list.push(info.language.name)
  return list
})
const age = computed(() => (local.value?.firstCommit ? formatAgo(local.value.firstCommit).replace(' ago', ' old') : undefined))

onMounted(async () => {
  try {
    local.value = await bridge.invoke('projects:overview', project.path)
  } catch {
    local.value = { stack: [] }
  }
})
</script>

<template>
  <section class="flex flex-col gap-2 pb-1" aria-label="Overview">
    <p v-if="description" class="max-w-3xl text-sm">{{ description }}</p>
    <p v-if="readme" class="line-clamp-2 max-w-3xl text-xs text-muted-foreground">{{ readme }}</p>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      <span v-if="stack.length" class="flex flex-wrap gap-1">
        <span v-for="s in stack" :key="s" class="rounded-md border border-border px-1.5 py-0.5 text-foreground">{{ s }}</span>
      </span>
      <span v-if="local?.packageManager">{{ local.packageManager }}</span>
      <span v-if="info?.private" class="flex items-center gap-1"><Lock class="size-3.5" /> Private</span>
      <span v-if="info && info.stars" class="flex items-center gap-1"><Star class="size-3.5" /> {{ info.stars }}</span>
      <span v-if="info && info.forks" class="flex items-center gap-1"><GitFork class="size-3.5" /> {{ info.forks }}</span>
      <span v-if="info?.license" class="flex items-center gap-1"><Scale class="size-3.5" /> {{ info.license }}</span>
      <span v-if="local?.commits" class="flex items-center gap-1" :title="age ? `First commit ${formatAgo(local.firstCommit)}` : undefined"
        ><GitCommitHorizontal class="size-3.5" /> {{ local.commits.toLocaleString() }} commits<template v-if="age">
          · {{ age }}</template
        ></span
      >
      <span v-if="local?.contributors" class="flex items-center gap-1"
        ><Users class="size-3.5" /> {{ local.contributors }} {{ local.contributors === 1 ? 'author' : 'authors' }}</span
      >
      <span v-if="local?.lastCommit" class="truncate" :title="local.lastCommit.subject"
        >Last commit {{ formatAgo(local.lastCommit.at) }} by {{ local.lastCommit.author }}</span
      >
      <a v-if="info?.homepage" :href="info.homepage" target="_blank" rel="noreferrer" class="flex items-center gap-1 hover:text-foreground"
        ><Globe class="size-3.5" /> {{ info.homepage.replace(/^https?:\/\//, '').replace(/\/$/, '') }}</a
      >
    </div>
    <div v-if="info?.topics.length" class="flex flex-wrap gap-1">
      <span v-for="t in info.topics" :key="t" class="rounded-full bg-emphasis/10 px-2 py-0.5 text-xs text-emphasis">{{ t }}</span>
    </div>
  </section>
</template>
