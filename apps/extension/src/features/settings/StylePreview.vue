<script setup lang="ts">
import type { ThemeStyle } from '../../lib/types'
import StyleSketch from './StyleSketch.vue'

const { themeStyle, dark } = defineProps<{ themeStyle: ThemeStyle; dark: boolean }>()
</script>

<template>
  <span class="block h-12 overflow-hidden rounded-md border" aria-hidden="true">
    <StyleSketch :theme-style="themeStyle" :dark="dark" />
  </span>
</template>
