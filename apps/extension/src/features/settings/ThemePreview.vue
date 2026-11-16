<script setup lang="ts">
import type { ThemeMode } from '../../lib/types'

const { mode } = defineProps<{ mode: ThemeMode }>()
</script>

<template>
  <span class="flex h-12 overflow-hidden rounded-md border" aria-hidden="true">
    <span
      v-for="dark in mode === 'system' ? [false, true] : [mode === 'dark']"
      :key="String(dark)"
      class="ps-root flex flex-1 flex-col gap-1 bg-background p-1"
      :class="{ dark }"
    >
      <span class="h-1.5 rounded-sm bg-muted" />
      <span class="flex flex-1 gap-1">
        <span class="w-1/4 rounded-sm bg-sidebar ring-1 ring-border" />
        <span class="flex flex-1 flex-col gap-0.5">
          <span class="h-1 rounded-sm bg-del-bg" />
          <span class="h-1 rounded-sm bg-add-bg" />
          <span class="h-1 rounded-sm bg-add-bg" />
        </span>
      </span>
    </span>
  </span>
</template>
