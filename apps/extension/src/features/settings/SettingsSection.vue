<script setup lang="ts">
import { computed } from 'vue'
import SettingsPreview from './SettingsPreview.vue'
import { sectionElementId, type PreviewArea, type SettingsSectionId } from './sections'

const {
  id,
  title,
  description,
  area = 'none',
  framed = false,
  headless = false,
} = defineProps<{
  id: SettingsSectionId
  title: string
  description: string
  area?: PreviewArea
  framed?: boolean
  /** Keeps the title for screen readers only, when a tab already names the section. */
  headless?: boolean
}>()

const elementId = computed(() => sectionElementId(id))
</script>

<template>
  <section
    :id="elementId"
    :data-section="id"
    :aria-labelledby="`${elementId}-title`"
    class="flex scroll-mt-6 flex-col"
    :class="framed ? 'overflow-hidden rounded-lg border bg-card' : ''"
  >
    <header :class="headless ? 'sr-only' : ['flex items-center gap-3', framed ? 'bg-muted/40 px-4 py-3' : 'pb-3']">
      <span v-if="$slots.icon" class="flex h-7.5 w-11 shrink-0 items-center justify-center">
        <slot name="icon" />
      </span>
      <SettingsPreview v-else :area="area" />
      <div class="flex min-w-0 flex-col gap-0.5">
        <h2 :id="`${elementId}-title`" tabindex="-1" class="text-sm leading-5 font-semibold outline-none">{{ title }}</h2>
        <p class="text-xs leading-4 text-muted-foreground">{{ description }}</p>
      </div>
    </header>
    <div class="flex flex-col divide-y divide-border" :class="[framed ? 'px-4' : '', headless ? '' : 'border-t']">
      <slot />
    </div>
  </section>
</template>
