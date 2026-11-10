<script setup lang="ts">
import { computed } from 'vue'
import { FilePen, FilePlus, FileMinus, FileSymlink, FileText } from '@lucide/vue'

const { status } = defineProps<{ status: string }>()

const kinds = {
  added: { icon: FilePlus, class: 'text-add-fg' },
  removed: { icon: FileMinus, class: 'text-del-fg' },
  modified: { icon: FilePen, class: 'text-amber-600 dark:text-amber-400' },
  renamed: { icon: FileSymlink, class: 'text-primary' },
} as const

const kind = computed(() => kinds[status as keyof typeof kinds] ?? { icon: FileText, class: 'text-muted-foreground' })
</script>

<template>
  <component :is="kind.icon" class="size-3.5 shrink-0" :class="kind.class" :title="status" :aria-label="status" />
</template>
