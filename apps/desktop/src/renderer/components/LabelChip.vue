<script setup lang="ts">
import type { Label } from '~/github'

defineProps<{ label: Label }>()
</script>

<template>
  <span
    class="inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium"
    :style="{ borderColor: `#${label.color}80`, backgroundColor: `#${label.color}26` }"
    >{{ label.name }}</span
  >
</template>
