<script setup lang="ts">
import NewDot from '../../components/NewDot.vue'
import { sectionElementId, type SettingsSectionId } from './sections'

const {
  id,
  title,
  description,
  isNew = false,
  bare = false,
} = defineProps<{ id: SettingsSectionId; title: string; description?: string; isNew?: boolean; bare?: boolean }>()
</script>

<template>
  <!-- Bare: only the rows, for the desktop's flat page where the section title already says it. -->
  <div v-if="bare" :id="sectionElementId(id)" :data-section="id" class="contents"><slot /></div>
  <div v-else :id="sectionElementId(id)" :data-section="id" class="flex scroll-mt-14 flex-col py-3">
    <div class="flex items-center justify-between gap-3">
      <h3 tabindex="-1" class="flex items-center gap-2 text-sm font-medium outline-none">{{ title }}<NewDot v-if="isNew" /></h3>
      <slot name="aside" />
    </div>
    <p v-if="description" class="mt-0.5 text-xs text-muted-foreground">{{ description }}</p>
    <div class="mt-3 flex flex-col gap-3">
      <slot />
    </div>
  </div>
</template>
