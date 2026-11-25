<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import type { Project } from '#shared/ipc'

const { project, size = 16 } = defineProps<{ project: Pick<Project, 'name' | 'icon' | 'github'>; size?: number }>()

// The project's own icon first, then its GitHub owner's avatar, then its first letter.
const failed = shallowRef(0)
watch(
  () => [project.icon, project.github?.owner],
  () => (failed.value = 0),
)
const avatar = (owner: string) => `https://avatars.githubusercontent.com/${encodeURIComponent(owner)}?s=${size * 2}`
</script>

<template>
  <img
    v-if="project.icon && failed < 1"
    :src="project.icon"
    alt=""
    class="shrink-0 rounded object-contain"
    :style="{ width: `${size}px`, height: `${size}px` }"
    @error="failed = 1"
  />
  <img
    v-else-if="project.github && failed < 2"
    :src="avatar(project.github.owner)"
    alt=""
    class="shrink-0 rounded"
    :style="{ width: `${size}px`, height: `${size}px` }"
    @error="failed = 2"
  />
  <span
    v-else
    class="flex shrink-0 items-center justify-center rounded bg-foreground/10 font-semibold uppercase"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.6)}px` }"
    >{{ project.name.slice(0, 1) }}</span
  >
</template>
