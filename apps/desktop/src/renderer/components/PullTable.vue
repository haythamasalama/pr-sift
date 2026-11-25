<script setup lang="ts">
import type { PullItem } from '~/github'
import { openReview } from '~/navigation'
import PullRow from './PullRow.vue'
import SectionLabel from './SectionLabel.vue'

// Groups of pull requests in one calm card; the first group's header carries the column names.
defineProps<{ groups: { title: string; pulls: PullItem[] }[]; showRepo?: boolean; me?: string }>()
const emit = defineEmits<{ changed: [] }>()
</script>

<template>
  <div class="@container overflow-hidden rounded-lg border border-border bg-card">
    <template v-for="(g, i) in groups.filter((x) => x.pulls.length)" :key="g.title">
      <div class="flex items-center gap-3.5 px-5 py-2.5" :class="i ? 'border-t border-border bg-background/40' : ''">
        <SectionLabel class="flex-1">{{ g.title }} · {{ g.pulls.length }}</SectionLabel>
        <template v-if="!i"
          ><SectionLabel class="hidden w-[120px] @2xl:block">Review</SectionLabel
          ><SectionLabel class="hidden w-[70px] @2xl:block">CI</SectionLabel
          ><span class="hidden w-[200px] shrink-0 @2xl:block" aria-hidden="true" /></template
        >
      </div>
      <ul class="border-t border-border">
        <PullRow v-for="p in g.pulls" :key="p.url" :pull="p" :show-repo="showRepo" :me="me" @open="openReview(p)" @changed="emit('changed')" />
      </ul>
    </template>
  </div>
</template>
