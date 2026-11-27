<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'

// Stands in for a pull request list on its first load: the real column titles, rows the size of real rows.
withDefaults(defineProps<{ rows?: number; label?: string }>(), { rows: 5, label: 'Loading pull requests' })
const TITLES = ['w-[62%]', 'w-[48%]', 'w-[70%]', 'w-[54%]', 'w-[40%]', 'w-[58%]', 'w-[45%]', 'w-[66%]']
</script>

<template>
  <div role="status" :aria-label="label" class="@container overflow-hidden rounded-lg border border-border">
    <div
      class="flex h-9 items-center gap-4 border-b border-border px-4 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase"
    >
      <span class="flex-1">Pull request</span>
      <span class="w-[calc(18ch+2.5rem)] @max-3xl:hidden">Status</span>
      <span class="w-[256px] text-right @max-3xl:hidden @5xl:w-[332px]">Actions</span>
    </div>
    <div v-for="i in rows" :key="i" class="flex items-center gap-4 border-t border-accent px-4 py-2.5 first-of-type:border-t-0">
      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <div class="flex items-center gap-2">
          <Skeleton class="h-3.5" :class="TITLES[(i - 1) % TITLES.length]" />
          <Skeleton class="h-[22px] w-14 rounded-full" />
        </div>
        <div class="flex items-center gap-2">
          <Skeleton class="h-2.5 w-14" />
          <Skeleton class="size-4 rounded-full" />
          <Skeleton class="h-2.5 w-20" />
          <Skeleton class="h-2.5 w-10" />
        </div>
      </div>
      <div class="flex w-[calc(18ch+2.5rem)] items-center gap-2 @max-3xl:hidden">
        <Skeleton class="size-2 rounded-full" />
        <Skeleton class="h-5 w-[74px]" />
      </div>
      <div class="flex w-[256px] justify-end @max-3xl:hidden @5xl:w-[332px]"><Skeleton class="h-8 w-[88px]" /></div>
    </div>
  </div>
</template>
