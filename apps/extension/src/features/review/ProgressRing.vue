<script setup lang="ts">
import { computed } from 'vue'

const { done, total } = defineProps<{ done: number; total: number }>()

const RADIUS = 10
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const ratio = computed(() => (total ? done / total : 0))
const offset = computed(() => CIRCUMFERENCE * (1 - ratio.value))
const complete = computed(() => total > 0 && done === total)
</script>

<template>
  <svg viewBox="0 0 26 26" class="size-7 shrink-0 -rotate-90" role="img" :aria-label="`${done} of ${total} files viewed`">
    <circle cx="13" cy="13" :r="RADIUS" fill="none" stroke-width="3" class="stroke-border" />
    <circle
      cx="13"
      cy="13"
      :r="RADIUS"
      fill="none"
      stroke-width="3"
      stroke-linecap="round"
      :stroke-dasharray="CIRCUMFERENCE"
      :stroke-dashoffset="offset"
      class="transition-[stroke-dashoffset] duration-300"
      :class="complete ? 'stroke-success' : 'stroke-emphasis'"
    />
  </svg>
</template>
