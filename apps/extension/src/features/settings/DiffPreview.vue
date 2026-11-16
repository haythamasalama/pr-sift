<script setup lang="ts">
import type { DiffMode } from '../../lib/types'

const { mode } = defineProps<{ mode: DiffMode }>()
</script>

<template>
  <span class="flex h-12 gap-1 rounded-md border bg-background p-1.5" aria-hidden="true">
    <template v-if="mode === 'split'">
      <span class="flex flex-1 flex-col gap-1">
        <span class="h-1.5 rounded-sm bg-muted" />
        <span class="h-1.5 rounded-sm bg-del-bg" />
        <span class="h-1.5 rounded-sm bg-muted" />
      </span>
      <span class="flex flex-1 flex-col gap-1">
        <span class="h-1.5 rounded-sm bg-muted" />
        <span class="h-1.5 rounded-sm bg-add-bg" />
        <span class="h-1.5 rounded-sm bg-muted" />
      </span>
    </template>
    <span v-else class="flex flex-1 flex-col gap-1">
      <span class="h-1.5 w-2/3 rounded-sm bg-muted" />
      <span class="h-1.5 w-3/4 rounded-sm bg-del-bg" />
      <span class="h-1.5 rounded-sm bg-add-bg" />
    </span>
  </span>
</template>
