<script setup lang="ts">
import { Checkbox } from '@/components/ui/checkbox'
import type { PrFile } from '../../lib/types'
import FileStatusIcon from './FileStatusIcon.vue'

const { file, viewed } = defineProps<{ file: PrFile; viewed: boolean }>()
const emit = defineEmits<{ select: []; toggle: [value: boolean] }>()
</script>

<template>
  <div class="group flex items-center gap-1.5 rounded px-1 py-[3px] hover:bg-border/40" :class="viewed ? 'opacity-50' : ''">
    <Checkbox
      class="transition-opacity data-[state=unchecked]:opacity-0 group-hover:data-[state=unchecked]:opacity-100"
      title="Mark as viewed"
      :model-value="viewed"
      @update:model-value="(value) => emit('toggle', value === true)"
    />
    <button type="button" class="flex min-w-0 flex-1 items-center gap-1.5 text-left" :title="file.filename" @click="emit('select')">
      <FileStatusIcon :status="file.status" />
      <span class="truncate">{{ file.filename.split('/').pop() }}</span>
    </button>
  </div>
</template>
