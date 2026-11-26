<script setup lang="ts">
import type { PullItem } from '~/github'
import { openReview } from '~/navigation'
import PullRow from './PullRow.vue'
import Hint from './Hint.vue'
import { usePullView } from '~/pulls/view'

// Groups of pull requests in one quiet card. With `columns`, the first group's header names the columns;
// later groups get a muted band. Without it the card has no header, for pages that title each card themselves.
defineProps<{ groups: { title: string; pulls: PullItem[] }[]; showRepo?: boolean; me?: string; mine?: boolean; columns?: boolean }>()
const emit = defineEmits<{ changed: [] }>()
const { shown } = usePullView()
</script>

<template>
  <div class="@container overflow-hidden rounded-lg border border-border">
    <template v-for="(g, i) in groups.filter((x) => x.pulls.length)" :key="g.title">
      <div
        v-if="columns"
        class="flex items-center gap-4 px-4 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase"
        :class="i ? 'h-8 border-t border-accent bg-muted' : 'h-9 border-b border-border'"
      >
        <span class="flex-1">{{ g.title }} · {{ g.pulls.length }}</span>
        <template v-if="!i"
          ><span v-if="shown.review" class="w-[calc(18ch+1.5rem)] text-xs @max-3xl:hidden"><span class="text-[11px]">Review</span></span
          ><Hint v-if="shown.ci" text="Checks (CI)"><span class="w-6 text-center @max-3xl:hidden">CI</span></Hint
          ><span class="w-[256px] @max-3xl:hidden @5xl:w-[332px]" aria-hidden="true"
        /></template>
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
