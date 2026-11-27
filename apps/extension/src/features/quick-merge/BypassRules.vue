<script setup lang="ts">
import { Checkbox } from '@/components/ui/checkbox'

// Like GitHub's own box: people who may bypass the branch rules tick it to merge before they are met.
const checked = defineModel<boolean>({ default: false })
</script>

<template>
  <label class="flex cursor-pointer items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs">
    <Checkbox
      :model-value="checked"
      class="mt-px border-destructive/60 data-checked:border-destructive data-checked:bg-destructive dark:data-checked:bg-destructive"
      @update:model-value="(v) => (checked = v === true)"
    />
    <span class="flex flex-col gap-0.5">
      <span class="font-medium text-destructive">Merge without waiting for the rules (bypass)</span>
      <span class="text-muted-foreground">It still needs an approval or required checks. You have permission to skip them.</span>
    </span>
  </label>
</template>
