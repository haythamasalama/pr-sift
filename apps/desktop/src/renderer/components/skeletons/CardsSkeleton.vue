<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'

// Stands in for a short list of cards, such as what an auto-approve rule would do.
withDefaults(defineProps<{ rows?: number; label?: string }>(), { rows: 3, label: 'Loading' })
const WIDTHS = ['w-[55%]', 'w-[68%]', 'w-[42%]', 'w-[60%]']
</script>

<template>
  <div role="status" :aria-label="label" class="flex flex-col gap-2.5">
    <div v-for="i in rows" :key="i" class="flex items-center gap-3 rounded-lg border border-border p-3">
      <Skeleton class="size-[18px] rounded-full" />
      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton class="h-3" :class="WIDTHS[(i - 1) % WIDTHS.length]" />
        <Skeleton class="h-2.5 w-[45%]" />
      </div>
      <Skeleton class="h-5 w-[90px]" />
    </div>
  </div>
</template>
