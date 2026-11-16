<script setup lang="ts">
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import SettingsForm from './SettingsForm.vue'
import type { SettingsSectionId } from './sections'

const open = defineModel<boolean>('open', { default: false })
const { section } = defineProps<{ section?: SettingsSectionId }>()

// The form moves focus to the section it scrolls to, once its settings are loaded.
const keepFocusForSection = (event: Event) => {
  if (section) event.preventDefault()
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent
      side="right"
      class="gap-0 bg-background data-[side=right]:w-full data-[side=right]:sm:max-w-[480px]"
      @open-auto-focus="keepFocusForSection"
    >
      <SheetHeader class="border-b pr-12">
        <SheetTitle>Settings</SheetTitle>
        <SheetDescription class="text-xs">Changes apply right away.</SheetDescription>
      </SheetHeader>
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-8">
        <SettingsForm :section="section" />
      </div>
    </SheetContent>
  </Sheet>
</template>
