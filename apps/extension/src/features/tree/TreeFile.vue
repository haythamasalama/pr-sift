<script setup lang="ts">
import { Check } from '@lucide/vue'
import { Checkbox } from '@/components/ui/checkbox'
import type { PrFile } from '../../lib/types'
import FileStatusIcon from '../diff/FileStatusIcon.vue'

const { file, viewed } = defineProps<{ file: PrFile; viewed: boolean }>()
const emit = defineEmits<{ select: []; toggle: [value: boolean] }>()
</script>

<template>
  <div class="group flex items-center gap-1 rounded px-1 py-[3px] hover:bg-border/40" :class="viewed ? 'text-muted-foreground' : ''">
    <span class="w-4 shrink-0" />
    <Checkbox
      title="Mark as viewed"
      class="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 after:inset-0"
      :model-value="viewed"
      @update:model-value="(value) => emit('toggle', value === true)"
    />
    <button type="button" class="flex min-w-0 flex-1 items-center gap-1.5 text-left" :title="file.filename" @click="emit('select')">
      <FileStatusIcon :status="file.status" decorative class="size-4" />
      <span class="truncate">{{ file.filename.split('/').pop() }}</span>
      <Check v-if="viewed" :size="13" class="ml-auto shrink-0 text-success-fg" aria-label="Viewed" />
    </button>
  </div>
</template>
