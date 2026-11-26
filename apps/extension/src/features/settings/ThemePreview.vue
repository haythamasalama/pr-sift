<script setup lang="ts">
import type { ThemeMode, ThemeStyle } from '../../lib/types'
import StyleSketch from './StyleSketch.vue'

const {
  mode,
  themeStyle = 'github',
  small = false,
} = defineProps<{
  mode: ThemeMode
  themeStyle?: ThemeStyle
  small?: boolean
}>()
</script>

<template>
  <span class="relative block overflow-hidden border" :class="small ? 'h-7.5 w-11 rounded-sm' : 'h-12 rounded-md'" aria-hidden="true">
    <span
      v-for="dark in mode === 'system' ? [false, true] : [mode === 'dark']"
      :key="String(dark)"
      class="absolute inset-0 isolate"
      :class="{ '[clip-path:polygon(100%_0,100%_100%,0_100%)]': mode === 'system' && dark }"
    >
      <StyleSketch :theme-style="themeStyle" :dark="dark" :small="small" />
    </span>
  </span>
</template>
