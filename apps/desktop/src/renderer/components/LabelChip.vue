<script setup lang="ts">
import type { Label } from '~/github'

defineProps<{ label: Label }>()
</script>

<template>
  <!-- Quiet, like the canvas: a muted chip with a dot in the label's own colour. -->
  <span class="inline-flex h-5 shrink-0 items-center gap-1.5 rounded-md bg-muted px-2 text-[11px] text-muted-foreground"
    ><span class="size-1.5 rounded-full" :style="{ backgroundColor: `#${label.color}` }" />{{ label.name }}</span
  >
</template>
