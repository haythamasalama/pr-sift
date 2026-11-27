<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'

// A few short lines with a leading mark: menus and small lists while their answer comes in.
withDefaults(defineProps<{ rows?: number; mark?: 'dot' | 'box' | 'none'; label?: string }>(), {
  rows: 3,
  mark: 'dot',
  label: 'Loading',
})
const WIDTHS = ['w-[70%]', 'w-[55%]', 'w-[62%]', 'w-[48%]', 'w-[66%]']
</script>

<template>
  <div role="status" :aria-label="label" class="flex flex-col gap-2.5 py-1">
    <div v-for="i in rows" :key="i" class="flex items-center gap-2">
      <Skeleton v-if="mark !== 'none'" class="size-3.5" :class="mark === 'dot' ? 'rounded-full' : 'rounded-[3px]'" />
      <Skeleton class="h-2.5" :class="WIDTHS[(i - 1) % WIDTHS.length]" />
    </div>
  </div>
</template>
