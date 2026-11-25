<script setup lang="ts">
import { inject } from 'vue'
import { Check, Circle } from '@lucide/vue'
import type { PrFile } from '../../lib/types'
import FileStatusIcon from '../diff/FileStatusIcon.vue'
import { treeOpenFileKey } from './expandContext'

const { file, viewed } = defineProps<{ file: PrFile; viewed: boolean }>()
const emit = defineEmits<{ select: []; toggle: [value: boolean] }>()
const openFile = inject(treeOpenFileKey, null)

function select() {
  if (openFile) openFile.value = file.filename
  emit('select')
}
</script>

<template>
  <div
    class="group flex h-7 items-center gap-1.5 rounded-sm pr-1.5 pl-6 hover:bg-accent"
    :class="[viewed ? 'text-muted-foreground' : '', openFile === file.filename ? 'bg-accent font-semibold hover:bg-accent' : '']"
  >
    <button type="button" class="flex min-w-0 flex-1 items-center gap-1.5 text-left" :title="file.filename" @click="select">
      <FileStatusIcon :status="file.status" decorative class="size-3" />
      <span class="truncate">{{ file.filename.split('/').pop() }}</span>
    </button>
    <button
      type="button"
      class="flex size-4 shrink-0 items-center justify-center rounded-sm"
      :class="
        viewed
          ? 'text-success-fg'
          : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100'
      "
      :title="viewed ? 'Viewed. Click to mark as not viewed' : 'Mark as viewed'"
      :aria-label="viewed ? 'Viewed' : 'Mark as viewed'"
      :aria-pressed="viewed"
      @click="emit('toggle', !viewed)"
    >
      <Check v-if="viewed" :size="13" :stroke-width="2.5" />
      <Circle v-else :size="12" />
    </button>
  </div>
</template>
