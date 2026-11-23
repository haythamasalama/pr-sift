<template>
  <span class="relative flex items-center justify-center">
    <span class="absolute inset-0 rounded-md bg-primary/40 motion-safe:animate-soft-ping" />
    <span class="relative flex size-full items-center justify-center rounded-md bg-primary text-primary-foreground">
      <slot />
    </span>
  </span>
</template>
