<script setup lang="ts">
import { GitCommitHorizontal, GitFork, Globe, Lock, Package, Scale, Star, Users, Clock } from '@lucide/vue'
import type { ProjectOverview } from '#shared/ipc'
import type { RepoInfo } from '~/github'
import { formatAgo } from '~/format'
import Hint from './Hint.vue'

// One quiet line of facts under the project's name, each with its own icon.
defineProps<{ overview?: ProjectOverview | null; info?: RepoInfo }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-[18px] gap-y-1 text-xs text-faint" aria-label="About this project">
    <span v-if="overview?.packageManager" class="flex items-center gap-1.5"><Package class="size-3.5" />{{ overview.packageManager }}</span>
    <span v-if="info?.private" class="flex items-center gap-1.5"><Lock class="size-3.5" />Private</span>
    <span v-if="info && info.stars" class="flex items-center gap-1.5"><Star class="size-3.5" />{{ info.stars }}</span>
    <span v-if="info && info.forks" class="flex items-center gap-1.5"><GitFork class="size-3.5" />{{ info.forks }}</span>
    <span v-if="info?.license" class="flex items-center gap-1.5"><Scale class="size-3.5" />{{ info.license }}</span>
    <Hint
      v-if="overview?.commits"
      :text="overview.firstCommit ? `First commit ${formatAgo(overview.firstCommit)}` : 'Commits on this branch'"
    >
      <span class="flex items-center gap-1.5"><GitCommitHorizontal class="size-3.5" />{{ overview.commits.toLocaleString() }} commits</span>
    </Hint>
    <span v-if="overview?.contributors" class="flex items-center gap-1.5"
      ><Users class="size-3.5" />{{ overview.contributors }} {{ overview.contributors === 1 ? 'author' : 'authors' }}</span
    >
    <Hint v-if="overview?.lastCommit" :text="`${overview.lastCommit.subject} · ${overview.lastCommit.author}`">
      <span class="flex items-center gap-1.5"><Clock class="size-3.5" />Last commit {{ formatAgo(overview.lastCommit.at) }}</span>
    </Hint>
    <a v-if="info?.homepage" :href="info.homepage" target="_blank" rel="noreferrer" class="flex items-center gap-1.5 hover:text-foreground"
      ><Globe class="size-3.5" />{{ info.homepage.replace(/^https?:\/\//, '').replace(/\/$/, '') }}</a
    >
  </div>
</template>
