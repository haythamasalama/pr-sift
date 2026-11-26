<script setup lang="ts">
import { FolderPlus } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useProjectFolders } from '~/useProjectFolders'

const emit = defineEmits<{ added: [] }>()
const { add } = useProjectFolders()

async function pick() {
  if (await add()) emit('added')
}
</script>

<template>
  <div class="p-6">
    <Empty class="border border-dashed border-border">
      <EmptyHeader>
        <EmptyMedia variant="icon"><FolderPlus /></EmptyMedia>
        <EmptyTitle>Add your projects folder</EmptyTitle>
        <EmptyDescription
          >Pick the folder where your repositories live, such as Projects or Desktop/projects. You can add more in
          Settings.</EmptyDescription
        >
      </EmptyHeader>
      <EmptyContent>
        <Button @click="pick"><FolderPlus /> Add a folder</Button>
      </EmptyContent>
    </Empty>
  </div>
</template>
