<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'

// Stands in for a table of branches, worktrees or files on its first load. `columns` are the widths after the name.
withDefaults(defineProps<{ rows?: number; checkbox?: boolean; columns?: string[]; label?: string }>(), {
  rows: 7,
  checkbox: true,
  columns: () => ['w-24', 'w-20'],
  label: 'Loading',
})
const NAMES = ['w-[58%]', 'w-[44%]', 'w-[66%]', 'w-[38%]', 'w-[52%]', 'w-[61%]', 'w-[47%]']
</script>

<template>
  <div role="status" :aria-label="label" class="overflow-hidden rounded-lg border border-border">
    <div v-for="i in rows" :key="i" class="flex h-[42px] items-center gap-3.5 border-t border-accent px-4 first:border-t-0">
      <Skeleton v-if="checkbox" class="size-3.5 rounded-[3px]" />
      <span class="min-w-0 flex-1"><Skeleton class="h-3" :class="NAMES[(i - 1) % NAMES.length]" /></span>
      <template v-for="(w, c) in columns" :key="c">
        <span v-if="c === columns.length - 1" class="flex items-center gap-1.5"
          ><Skeleton class="size-4 rounded-full" /><Skeleton class="h-2.5" :class="w"
        /></span>
        <Skeleton v-else class="h-[18px]" :class="w" />
      </template>
    </div>
  </div>
</template>
