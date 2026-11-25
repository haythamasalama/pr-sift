<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <header class="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <h1 class="text-base font-semibold">{{ title }}</h1>
      <p v-if="description" class="text-muted-foreground">{{ description }}</p>
    </div>
    <div class="flex items-center gap-2"><slot /></div>
  </header>
</template>
