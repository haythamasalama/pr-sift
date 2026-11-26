<script setup lang="ts">
import { AppWindow } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import type { PrRef } from '@/lib/types'

// Hands this pull request to PR Sift for desktop through its prsift:// link. The browser asks once whether to open the app.
const { pr } = defineProps<{ pr: PrRef }>()
const open = () => (window.location.href = `prsift://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}`)
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    class="shrink-0 text-muted-foreground"
    title="Open in PR Sift app"
    aria-label="Open in PR Sift app"
    @click="open"
  >
    <AppWindow />
  </Button>
</template>
