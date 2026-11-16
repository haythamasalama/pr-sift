<script setup lang="ts">
const { title } = defineProps<{ title?: string }>()
</script>

<template>
  <div role="status" class="flex items-center gap-3 border-b bg-muted/40 px-3 py-2 text-xs">
    <span class="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4"><slot name="icon" /></span>
    <p class="min-w-0 flex-1 leading-5">
      <span v-if="title" class="font-medium text-foreground">{{ title }}</span>
      {{ ' ' }}<span class="text-muted-foreground"><slot /></span>
    </p>
    <div class="flex shrink-0 items-center gap-1.5"><slot name="actions" /></div>
  </div>
</template>
