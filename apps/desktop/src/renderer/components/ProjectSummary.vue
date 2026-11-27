<script setup lang="ts">
import type { ProjectOverview } from '#shared/ipc'
import type { RepoInfo } from '~/github'
import { shallowRef } from 'vue'
import { Clock, GitCommitHorizontal, Info, Link2, Lock, Star, Users } from '@lucide/vue'
import { formatAgo } from '~/format'
import Hint from './Hint.vue'

// One quiet line of facts under the project's name: an icon and a value each, the words in the hints.
const { description } = defineProps<{ overview?: ProjectOverview | null; info?: RepoInfo; description?: string }>()
// The repository's description leads the line, cut short; a click shows all of it.
const SHORT = 32
const whole = shallowRef(false)

const item = 'inline-flex items-center gap-1.5 [&_svg]:size-3.5 [&_svg]:shrink-0'
const plural = (n: number, one: string) => `${n.toLocaleString()} ${n === 1 ? one : `${one}s`}`
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="About this project">
    <button
      v-if="description"
      type="button"
      :class="[item, 'min-w-0 text-left hover:text-foreground', whole ? 'basis-full' : '']"
      :aria-expanded="description.length > SHORT ? whole : undefined"
      :title="whole ? undefined : description"
      :disabled="description.length <= SHORT"
      @click="whole = !whole"
    >
      <Info class="self-start mt-px" />
      <span v-if="whole" class="whitespace-normal">{{ description }}</span>
      <span v-else class="max-w-[30ch] truncate">{{ description }}</span>
    </button>
    <Hint v-if="info?.private" text="Private repository">
      <span :class="item"><Lock /> Private</span>
    </Hint>
    <Hint v-if="info && info.stars" :text="plural(info.stars, 'star')">
      <span :class="item" :aria-label="plural(info.stars, 'star')"><Star />{{ info.stars.toLocaleString() }}</span>
    </Hint>
    <Hint
      v-if="overview?.commits"
      :text="`${plural(overview.commits, 'commit')}${overview.firstCommit ? `, the first ${formatAgo(overview.firstCommit)}` : ''}`"
    >
      <span :class="item" :aria-label="plural(overview.commits, 'commit')"
        ><GitCommitHorizontal />{{ overview.commits.toLocaleString() }}</span
      >
    </Hint>
    <Hint v-if="overview?.contributors" :text="plural(overview.contributors, 'author')">
      <span :class="item" :aria-label="plural(overview.contributors, 'author')"><Users />{{ overview.contributors.toLocaleString() }}</span>
    </Hint>
    <Hint v-if="overview?.lastCommit" :text="`Last commit: ${overview.lastCommit.subject} · ${overview.lastCommit.author}`">
      <span :class="item" aria-label="Last commit"><Clock />{{ formatAgo(overview.lastCommit.at) }}</span>
    </Hint>
    <a v-if="info?.homepage" :href="info.homepage" target="_blank" rel="noreferrer" :class="[item, 'hover:text-foreground']"
      ><Link2 />{{ info.homepage.replace(/^https?:\/\//, '').replace(/\/$/, '') }}</a
    >
  </div>
</template>
