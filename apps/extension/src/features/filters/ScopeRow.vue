<script setup lang="ts">
import { computed } from 'vue'
import { Check } from '@lucide/vue'

const { count, max } = defineProps<{ label: string; count: number; max: number; active?: boolean; hint?: string }>()
const width = computed(() => `${max ? Math.max(4, Math.round((count / max) * 100)) : 0}%`)
</script>

<template>
  <button
    type="button"
    :title="hint"
    class="relative flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-border/40"
    :class="active ? 'font-medium text-primary' : 'text-foreground'"
  >
    <span class="absolute inset-y-0 left-0 rounded-md" :class="active ? 'bg-primary/20' : 'bg-primary/10'" :style="{ width }" />
    <Check v-if="active" :size="13" class="relative shrink-0" />
    <span class="relative min-w-0 flex-1 truncate">{{ label }}</span>
    <span class="relative shrink-0 tabular-nums text-muted-foreground">{{ count }}</span>
  </button>
</template>
