<script setup lang="ts">
import NewDot from '../../components/NewDot.vue'
import { sectionElementId, type SettingsSectionId } from './sections'

const {
  id,
  title,
  description,
  isNew = false,
} = defineProps<{ id: SettingsSectionId; title: string; description?: string; isNew?: boolean }>()
</script>

<template>
  <div :id="sectionElementId(id)" :data-section="id" class="flex scroll-mt-14 flex-col py-3">
    <div class="flex items-center justify-between gap-3">
      <h3 tabindex="-1" class="relative text-sm font-medium outline-none">
        <NewDot v-if="isNew" class="absolute top-1/2 -left-3.5 -translate-y-1/2" />{{ title }}
      </h3>
      <slot name="aside" />
    </div>
    <p v-if="description" class="mt-0.5 text-xs text-muted-foreground">{{ description }}</p>
    <div class="mt-3 flex flex-col gap-3">
      <slot />
    </div>
  </div>
</template>
