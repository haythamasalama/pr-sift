<script setup lang="ts">
import { PackageCheck, X } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CHANGELOG_URL } from '../../lib/updates'
import { useUpdates } from './useUpdates'

const { updated, dismiss } = useUpdates()
</script>

<template>
  <Alert v-if="updated" class="flex items-center gap-3 rounded-none border-x-0 border-t-0 py-2">
    <PackageCheck />
    <AlertDescription class="flex-1 text-xs">PR Sift was updated to {{ updated.version }}.</AlertDescription>
    <Button as-child variant="outline" size="sm">
      <a :href="CHANGELOG_URL" target="_blank" rel="noopener noreferrer">What’s new</a>
    </Button>
    <Button variant="ghost" size="icon-sm" aria-label="Dismiss" title="Dismiss" @click="dismiss"><X /></Button>
  </Alert>
</template>
