<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import type { Project } from '#shared/ipc'

const { project, size = 16 } = defineProps<{ project: Pick<Project, 'name' | 'icon' | 'github'>; size?: number }>()

// The GitHub owner's avatar first, as GitHub shows the repository, then the project's own icon, then its first letter.
const failed = shallowRef(0)
watch(
  () => [project.icon, project.github?.owner],
  () => (failed.value = 0),
)
// Square corners scale with the size, kept small so the owner's avatar reads as itself.
const radius = () => `${size <= 20 ? 3 : 6}px`
const avatar = (owner: string) => `https://avatars.githubusercontent.com/${encodeURIComponent(owner)}?s=${size * 2}`
</script>

<template>
  <img
    v-if="project.github && failed < 1"
    :src="avatar(project.github.owner)"
    alt=""
    class="max-w-none shrink-0"
    :style="{ width: `${size}px`, height: `${size}px`, borderRadius: radius() }"
    @error="failed = 1"
  />
  <img
    v-else-if="project.icon && failed < 2"
    :src="project.icon"
    alt=""
    class="max-w-none shrink-0 object-contain"
    :style="{ width: `${size}px`, height: `${size}px`, borderRadius: radius() }"
    @error="failed = 2"
  />
  <span
    v-else
    class="flex shrink-0 items-center justify-center bg-foreground/10 font-semibold uppercase"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.6)}px`, borderRadius: radius() }"
    >{{ project.name.slice(0, 1) }}</span
  >
</template>
