<script setup lang="ts">
// The app icon itself: the funnel on a rounded tile, with the same proportions as build/icon.png.
// The tile follows the theme (dark on light, light on dark) so it never disappears into the background.
</script>

<template>
  <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" class="shrink-0">
    <rect width="100" height="100" rx="24" class="fill-foreground" />
    <path
      d="M24 30h52L56.5 53.5v18L43.5 65V53.5L24 30Z"
      class="stroke-background"
      stroke-width="8.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
