<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <header class="sticky top-0 z-10 flex min-h-16 flex-wrap items-center gap-3 border-b border-border bg-background px-8 py-2.5">
    <slot name="before" />
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <h1 class="text-base leading-[22px] font-semibold">{{ title }}</h1>
      <p v-if="description" class="text-xs text-muted-foreground">{{ description }}</p>
    </div>
    <div class="flex items-center gap-2"><slot /></div>
  </header>
</template>
