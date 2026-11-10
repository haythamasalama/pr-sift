<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const { title, description } = defineProps<{ title: string; description?: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Dialog :open="true" @update:open="(open) => !open && emit('close')">
    <DialogContent class="max-h-[90vh] w-[calc(100vw-2rem)] grid-cols-[minmax(0,1fr)] gap-3 overflow-x-hidden overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle class="truncate pr-6 text-sm">{{ title }}</DialogTitle>
        <DialogDescription class="sr-only">{{ description ?? title }}</DialogDescription>
      </DialogHeader>
      <slot />
    </DialogContent>
  </Dialog>
</template>
