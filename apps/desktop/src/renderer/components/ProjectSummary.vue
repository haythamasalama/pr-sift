<script setup lang="ts">
import type { ProjectOverview } from '#shared/ipc'
import type { RepoInfo } from '~/github'
import { formatAgo } from '~/format'
import Hint from './Hint.vue'

// One quiet line of facts under the project's name.
defineProps<{ overview?: ProjectOverview | null; info?: RepoInfo }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="About this project">
    <span v-if="info?.private">Private</span>
    <span v-if="info && info.stars">{{ info.stars }} stars</span>
    <span v-if="info?.license">{{ info.license }}</span>
    <Hint
      v-if="overview?.commits"
      :text="overview.firstCommit ? `First commit ${formatAgo(overview.firstCommit)}` : 'Commits on this branch'"
    >
      <span>{{ overview.commits.toLocaleString() }} {{ overview.commits === 1 ? 'commit' : 'commits' }}</span>
    </Hint>
    <span v-if="overview?.contributors">{{ overview.contributors }} {{ overview.contributors === 1 ? 'author' : 'authors' }}</span>
    <Hint v-if="overview?.lastCommit" :text="`${overview.lastCommit.subject} · ${overview.lastCommit.author}`">
      <span>Last commit {{ formatAgo(overview.lastCommit.at) }}</span>
    </Hint>
    <a v-if="info?.homepage" :href="info.homepage" target="_blank" rel="noreferrer" class="hover:text-foreground">{{
      info.homepage.replace(/^https?:\/\//, '').replace(/\/$/, '')
    }}</a>
  </div>
</template>
