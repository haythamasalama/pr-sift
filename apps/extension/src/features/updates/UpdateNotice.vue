<script setup lang="ts">
import { PackageCheck, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import NoticeBar from '../../components/NoticeBar.vue'
import { CHANGELOG_URL } from '../../lib/updates'
import { useUpdates } from './useUpdates'

const { updated, dismiss } = useUpdates()
</script>

<template>
  <NoticeBar v-if="updated" :title="`PR Sift was updated to ${updated.version}.`">
    <template #icon><PackageCheck /></template>
    See what changed in this version.
    <template #actions>
      <Button as-child variant="outline" size="sm">
        <a :href="CHANGELOG_URL" target="_blank" rel="noopener noreferrer">What’s new</a>
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Dismiss" title="Dismiss" @click="dismiss"><X /></Button>
    </template>
  </NoticeBar>
</template>
