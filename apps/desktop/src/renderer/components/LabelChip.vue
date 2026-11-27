<script setup lang="ts">
import type { Label } from '~/github'

defineProps<{ label: Label }>()
</script>

<template>
  <!-- The label's own colour, softened: a tinted fill, a stronger edge, and text mixed toward the page's text colour,
       so it reads in light and dark and in every style. -->
  <span
    class="label-chip inline-flex h-[22px] shrink-0 items-center rounded-full border px-[9px] text-xs font-medium"
    :style="{ '--label': `#${label.color}` }"
    >{{ label.name }}</span
  >
</template>

<style scoped>
.label-chip {
  background-color: color-mix(in srgb, var(--label) 17%, transparent);
  border-color: color-mix(in srgb, var(--label) 44%, transparent);
  color: color-mix(in srgb, var(--label) 55%, var(--foreground));
}
</style>
