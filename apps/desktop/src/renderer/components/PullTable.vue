<script setup lang="ts">
import type { PullItem } from '~/github'
import { openReview } from '~/navigation'
import PullRow from './PullRow.vue'
import SectionLabel from './SectionLabel.vue'

// Groups of pull requests in one calm card; the first group's header carries the column names.
defineProps<{ groups: { title: string; pulls: PullItem[] }[]; showRepo?: boolean; me?: string }>()
</script>

<template>
  <div class="overflow-hidden rounded-[10px] border border-border bg-card">
    <template v-for="(g, i) in groups.filter((x) => x.pulls.length)" :key="g.title">
      <div class="flex items-center gap-3.5 px-5 py-2.5" :class="i ? 'border-t border-border bg-background/40' : ''">
        <SectionLabel class="flex-1">{{ g.title }} · {{ g.pulls.length }}</SectionLabel>
        <template v-if="!i"><SectionLabel class="w-[120px]">Review</SectionLabel><SectionLabel class="w-[70px]">CI</SectionLabel></template>
      </div>
      <ul class="border-t border-border">
        <PullRow v-for="p in g.pulls" :key="p.url" :pull="p" :show-repo="showRepo" :me="me" @open="openReview(p)" />
      </ul>
    </template>
  </div>
</template>
