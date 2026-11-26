<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'

defineProps<{ compact?: boolean; sidebarWidth: number }>()

const treeRows = [
  { indent: 0, width: 'w-24' },
  { indent: 1, width: 'w-32' },
  { indent: 2, width: 'w-28' },
  { indent: 2, width: 'w-36' },
  { indent: 1, width: 'w-20' },
  { indent: 2, width: 'w-32' },
  { indent: 0, width: 'w-28' },
  { indent: 1, width: 'w-24' },
]
const cards = [6, 9, 4]
</script>

<template>
  <div role="status" aria-label="Loading pull request" class="flex min-h-0 flex-1 flex-col">
    <div class="flex items-center gap-2 border-b bg-sidebar px-3 py-2 sm:px-4">
      <Skeleton class="h-3 w-10" />
      <Skeleton v-for="w in ['w-14', 'w-16', 'w-12', 'w-14']" :key="w" class="h-7" :class="w" />
      <Skeleton class="ml-2 h-7 w-40" />
      <Skeleton class="ml-auto h-7 w-16" />
      <Skeleton class="h-7 w-24" />
    </div>

    <div class="grid min-h-0 flex-1" :style="{ gridTemplateColumns: compact ? '1fr' : `${sidebarWidth}px 1fr` }">
      <aside v-if="!compact" class="flex flex-col gap-2 border-r bg-sidebar p-2">
        <Skeleton class="h-8 w-full" />
        <Skeleton class="h-8 w-full" />
        <div class="mt-1 flex flex-col gap-2.5 px-1">
          <div v-for="(row, i) in treeRows" :key="i" class="flex items-center gap-2" :style="{ paddingLeft: `${row.indent * 14}px` }">
            <Skeleton class="size-3.5 rounded-sm" />
            <Skeleton class="h-3" :class="row.width" />
          </div>
        </div>
      </aside>

      <div class="flex flex-col gap-3 overflow-hidden p-3 sm:p-4">
        <div v-for="(lines, i) in cards" :key="i" class="overflow-hidden rounded-md border">
          <div class="flex items-center gap-2 border-b bg-sidebar px-3 py-2">
            <Skeleton class="size-4 rounded-sm" />
            <Skeleton class="h-3.5 w-64 max-w-[50%]" />
            <Skeleton class="ml-auto h-3 w-12" />
          </div>
          <div class="flex flex-col gap-2 p-3">
            <Skeleton v-for="n in lines" :key="n" class="h-3" :style="{ width: `${40 + ((n * 37 + i * 13) % 55)}%` }" />
          </div>
        </div>
      </div>
    </div>
    <span class="sr-only">Loading pull request…</span>
  </div>
</template>
