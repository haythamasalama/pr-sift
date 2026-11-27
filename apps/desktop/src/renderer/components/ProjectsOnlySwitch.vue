<script setup lang="ts">
import { Switch } from '@/components/ui/switch'

// Off, a page shows everything; on, only what belongs to the projects you added.
const on = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="flex h-7 cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 text-[0.8rem] select-none">
    <Switch :model-value="on" aria-label="Projects only" @update:model-value="(v) => (on = !!v)" />
    Projects only
  </label>
</template>
