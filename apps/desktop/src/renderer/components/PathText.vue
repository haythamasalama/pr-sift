<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Check, Copy } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { appInfo } from '~/appInfo'
import { projectPath } from '~/format'
import { useProjectFolders } from '~/useProjectFolders'

// A folder shown from the project folders down, with a button that copies the full path.
const { path } = defineProps<{ path: string }>()
const { settings } = useProjectFolders()
const text = computed(() => projectPath(path, settings.value?.roots ?? [], appInfo.home))
const copied = shallowRef(false)

async function copy() {
  await navigator.clipboard.writeText(path)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <span class="inline-flex min-w-0 items-center gap-0.5">
    <span class="truncate" :title="path">{{ text }}</span>

    <Button variant="ghost" size="icon-xs" class="-my-1 shrink-0 text-faint" aria-label="Copy the full path" @click.stop="copy"
      ><Check v-if="copied" class="text-success-fg" /><Copy v-else
    /></Button>
  </span>
</template>
