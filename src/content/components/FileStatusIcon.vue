<script setup lang="ts">
import { computed } from 'vue'

const { status } = defineProps<{ status: string }>()

const FRAME =
  'M2.75 1h10.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 15H2.75A1.75 1.75 0 0 1 1 13.25V2.75C1 1.784 1.784 1 2.75 1ZM2.5 2.75v10.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25H2.75a.25.25 0 0 0-.25.25Z'

const kinds: Record<string, { path: string; class: string }> = {
  added: {
    path: 'M8 4a.75.75 0 0 1 .75.75v2.5h2.5a.75.75 0 0 1 0 1.5h-2.5v2.5a.75.75 0 0 1-1.5 0v-2.5h-2.5a.75.75 0 0 1 0-1.5h2.5v-2.5A.75.75 0 0 1 8 4Z',
    class: 'text-add-fg',
  },
  modified: { path: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', class: 'text-amber-600 dark:text-amber-400' },
  removed: { path: 'M4.25 7.25h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5Z', class: 'text-del-fg' },
  renamed: {
    path: 'M8.47 4.97a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 0 1 0 1.06l-2.5 2.5a.75.75 0 1 1-1.06-1.06l1.22-1.22H4.75a.75.75 0 0 1 0-1.5h4.94L8.47 6.03a.75.75 0 0 1 0-1.06Z',
    class: 'text-primary',
  },
}

const kind = computed(() => kinds[status] ?? { path: '', class: 'text-muted-foreground' })
</script>

<template>
  <svg viewBox="0 0 16 16" fill="currentColor" class="shrink-0" :class="kind.class" role="img" :aria-label="status">
    <title>{{ status }}</title>
    <path :d="FRAME" />
    <path v-if="kind.path" :d="kind.path" />
  </svg>
</template>
