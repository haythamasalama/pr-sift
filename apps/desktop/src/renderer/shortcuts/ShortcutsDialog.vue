<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SHORTCUTS } from './keys'
import Kbd from './Kbd.vue'

const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription>They are in the menu bar too.</DialogDescription>
      </DialogHeader>
      <div class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <section v-for="g in SHORTCUTS" :key="g.title" class="flex flex-col gap-1">
          <h3 class="pb-1 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{{ g.title }}</h3>
          <div v-for="s in g.items" :key="s.keys" class="flex h-7 items-center justify-between gap-4 text-sm">
            <span>{{ s.label }}</span>
            <Kbd :keys="s.keys" />
          </div>
        </section>
      </div>
    </DialogContent>
  </Dialog>
</template>
