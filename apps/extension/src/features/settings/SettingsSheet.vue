<script setup lang="ts">
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { PrFile } from '../../lib/types'
import SettingsForm from './SettingsForm.vue'
import type { SettingsSectionId } from './sections'

const open = defineModel<boolean>('open', { default: false })
const { section, files } = defineProps<{ section?: SettingsSectionId; files?: PrFile[] }>()

// The form moves focus to the section it scrolls to, once its settings are loaded.
const keepFocusForSection = (event: Event) => {
  if (section) event.preventDefault()
}

// Menus and sheets that open this one hand focus back to their trigger outside it as they close.
const stayOpen = (event: Event) => event.preventDefault()
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent
      side="right"
      class="gap-0 border-l bg-background shadow-xl data-[side=right]:w-full data-[side=right]:sm:max-w-[720px]"
      @open-auto-focus="keepFocusForSection"
      @focus-outside="stayOpen"
    >
      <SheetHeader class="border-b pr-12">
        <SheetTitle>Settings</SheetTitle>
        <SheetDescription class="text-xs">Changes apply right away.</SheetDescription>
      </SheetHeader>
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
        <SettingsForm :section="section" :files="files" />
      </div>
    </SheetContent>
  </Sheet>
</template>
