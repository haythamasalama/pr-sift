<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const { title, description } = defineProps<{ title: string; description?: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Dialog :open="true" @update:open="(open) => !open && emit('close')">
    <DialogContent class="flex max-h-[85vh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
      <DialogHeader class="gap-1 border-b px-6 py-4 pr-12 text-left">
        <DialogTitle class="truncate text-base">{{ title }}</DialogTitle>
        <DialogDescription class="text-xs">{{ description ?? title }}</DialogDescription>
      </DialogHeader>
      <div class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-4">
        <slot />
      </div>
      <div v-if="$slots.footer" class="border-t bg-muted/40 px-6 py-3">
        <slot name="footer" />
      </div>
    </DialogContent>
  </Dialog>
</template>
