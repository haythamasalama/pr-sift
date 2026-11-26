<script setup lang="ts">
import type { PullItem } from '~/github'
import { openReview } from '~/navigation'
import PullRow from './PullRow.vue'
import { usePullView } from '~/pulls/view'

// Groups of pull requests in one quiet card. With `columns`, the first group's header names the columns;
// later groups get a muted band. With `titles`, a page that names the card itself still gets the column titles.
defineProps<{
  groups: { title: string; pulls: PullItem[] }[]
  showRepo?: boolean
  me?: string
  mine?: boolean
  columns?: boolean
  titles?: boolean
}>()
const emit = defineEmits<{ changed: [] }>()
const { shown } = usePullView()
</script>

<template>
  <div class="@container overflow-hidden rounded-lg border border-border">
    <template v-for="(g, i) in groups.filter((x) => x.pulls.length)" :key="g.title">
      <!-- Column titles: with `columns` the first group's title leads them; with `titles` alone the page names the group above. -->
      <div
        v-if="columns || (titles && !i)"
        class="flex items-center gap-4 px-4 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase"
        :class="i ? 'h-8 border-t border-accent bg-muted' : 'h-9 border-b border-border'"
      >
        <span class="flex-1">{{ columns ? `${g.title} · ${g.pulls.length}` : 'Pull request' }}</span>
        <template v-if="!i"
          ><span v-if="shown.review" class="flex w-[calc(18ch+1.5rem)] text-xs @max-3xl:hidden" :class="mine ? 'justify-end' : ''"
            ><span class="text-[11px]">{{ mine ? 'Status' : 'Review' }}</span></span
          ><span v-if="shown.ci" class="w-14 text-center @max-3xl:hidden">Checks</span
          ><span class="w-[256px] text-right @max-3xl:hidden @5xl:w-[332px]">Actions</span></template
        >
      </div>
      <ul :class="i && !columns ? 'border-t border-accent' : ''">
        <PullRow
          v-for="p in g.pulls"
          :key="p.url"
          :pull="p"
          :show-repo="showRepo"
          :me="me"
          :mine="mine"
          @open="openReview(p)"
          @changed="emit('changed')"
        />
      </ul>
    </template>
  </div>
</template>
