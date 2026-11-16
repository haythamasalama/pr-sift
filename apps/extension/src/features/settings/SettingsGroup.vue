<script setup lang="ts">
import { sectionElementId, type SettingsSectionId } from './sections'

const { id, title, description } = defineProps<{ id: SettingsSectionId; title: string; description?: string }>()
</script>

<template>
  <div :id="sectionElementId(id)" :data-section="id" class="flex scroll-mt-14 flex-col py-3">
    <div class="flex items-center justify-between gap-3">
      <h3 tabindex="-1" class="text-sm font-medium outline-none">{{ title }}</h3>
      <slot name="aside" />
    </div>
    <p v-if="description" class="mt-0.5 text-xs text-muted-foreground">{{ description }}</p>
    <div class="mt-3 flex flex-col gap-3">
      <slot />
    </div>
  </div>
</template>
