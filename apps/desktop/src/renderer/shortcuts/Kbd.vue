<script setup lang="ts">
import { computed } from 'vue'
import { keyParts } from './keys'

const props = defineProps<{ keys: string }>()
const parts = computed(() => keyParts(props.keys))
</script>

<template>
  <span class="inline-flex items-center gap-0.5">
    <kbd
      v-for="(k, i) in parts"
      :key="i"
      class="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-sans text-[11px] leading-none text-muted-foreground"
      >{{ k }}</kbd
    >
  </span>
</template>
