<script setup lang="ts">
import type { Label } from '~/github'

defineProps<{ label: Label }>()
</script>

<template>
  <!-- A soft fill in the label's own colour, no border, so labels stay quiet next to the title. -->
  <span
    class="inline-flex h-5 items-center gap-1.5 rounded-full bg-accent px-2 text-[11.5px] text-muted-foreground"
    :style="{ backgroundColor: `#${label.color}1f` }"
    ><span class="size-1.5 rounded-full" :style="{ backgroundColor: `#${label.color}` }" />{{ label.name }}</span
  >
</template>
