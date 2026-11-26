<script setup lang="ts">
import NewDot from '../../components/NewDot.vue'
import { sectionElementId, type SettingsSectionId } from './sections'

const {
  id,
  title,
  description,
  isNew = false,
  hideTitle = false,
} = defineProps<{ id: SettingsSectionId; title: string; description?: string; isNew?: boolean; hideTitle?: boolean }>()
</script>

<template>
  <div :id="sectionElementId(id)" :data-section="id" class="flex scroll-mt-14 flex-col" :class="hideTitle ? '' : 'py-3'">
    <div class="flex items-center justify-between gap-3" :class="{ 'sr-only': hideTitle }">
      <h3 tabindex="-1" class="flex items-center gap-2 text-sm font-medium outline-none">{{ title }}<NewDot v-if="isNew" /></h3>
      <slot name="aside" />
    </div>
    <p v-if="description" class="mt-0.5 text-xs text-muted-foreground">{{ description }}</p>
    <div class="flex flex-col" :class="hideTitle ? '' : 'mt-3 gap-3'">
      <slot />
    </div>
  </div>
</template>
