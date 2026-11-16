<script setup lang="ts">
import type { PreviewArea } from './sections'

type Part = Exclude<PreviewArea, 'all' | 'none'>

const { area } = defineProps<{ area: PreviewArea }>()

const lit = (part: Part) => area === 'all' || area === part
const paint = (part: Part) => (lit(part) ? 'fill-emphasis stroke-emphasis' : 'fill-muted stroke-border')
</script>

<template>
  <svg viewBox="0 0 44 30" width="44" height="30" fill="none" aria-hidden="true" class="shrink-0" :data-area="area">
    <rect x="0.5" y="0.5" width="43" height="29" rx="3.5" class="fill-background stroke-border" />
    <rect data-part="toolbar" :data-lit="lit('toolbar')" x="2.5" y="2.5" width="39" height="3" rx="1" :class="paint('toolbar')" />
    <rect
      data-part="actions"
      :data-lit="lit('actions')"
      x="34"
      y="3"
      width="6"
      height="2"
      rx="0.5"
      :class="lit('actions') ? 'fill-emphasis' : 'fill-border'"
    />
    <rect data-part="filters" :data-lit="lit('filters')" x="2.5" y="7.5" width="39" height="2" rx="1" :class="paint('filters')" />
    <rect data-part="sidebar" :data-lit="lit('sidebar')" x="2.5" y="11.5" width="10" height="16" rx="1" :class="paint('sidebar')" />
    <g data-part="files" :data-lit="lit('files')" :class="paint('files')">
      <rect x="14.5" y="11.5" width="27" height="4" rx="1" />
      <rect x="14.5" y="17.5" width="27" height="4" rx="1" />
      <rect x="14.5" y="23.5" width="27" height="4" rx="1" />
    </g>
  </svg>
</template>
