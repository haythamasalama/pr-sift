<script setup lang="ts">
import { Bug, ExternalLink, Lightbulb, PackageCheck, RefreshCw, RotateCw, Star, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import BrandMark from '../../components/BrandMark.vue'
import NewDot from '../../components/NewDot.vue'
import { openReport } from '../../lib/report'
import { CHANGELOG_URL, REVIEWS_URL } from '../../lib/updates'
import { useUpdates } from '../updates/useUpdates'
import SettingsRow from './SettingsRow.vue'
import SettingsSection from './SettingsSection.vue'
import { useNewMarks } from './useNewMarks'

const { framed = false } = defineProps<{ framed?: boolean }>()
const { version, ready, updated, checking, status, check, restart, dismiss } = useUpdates()
const { isNew, markSeen } = useNewMarks()

function checkForUpdates() {
  void markSeen('updates')
  void check()
}
</script>

<template>
  <SettingsSection id="about" title="About" description="Your version, updates and help." :framed="framed">
    <template #icon>
      <span class="flex size-7 items-center justify-center rounded-md bg-primary p-1 text-primary-foreground"><BrandMark /></span>
    </template>
    <div v-if="updated" class="flex items-center gap-2 py-3 text-xs">
      <PackageCheck class="size-4 shrink-0 text-success-fg" />
      <span class="flex-1">Updated to {{ updated.version }}.</span>
      <Button as-child variant="outline" size="xs">
        <a :href="CHANGELOG_URL" target="_blank" rel="noopener noreferrer">What’s new</a>
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label="Dismiss" title="Dismiss" @click="dismiss"><X /></Button>
    </div>
    <SettingsRow :label="`PR Sift ${version}`">
      <template #description>
        <span aria-live="polite">{{ status || 'Chrome updates it on its own every few hours.' }}</span>
        <template v-if="ready"> Reload open GitHub tabs afterwards.</template>
      </template>
      <Button v-if="ready" size="sm" @click="restart"><RotateCw /> Restart to update to {{ ready }}</Button>
      <Button v-else variant="outline" size="sm" class="relative" :disabled="checking" @click="checkForUpdates">
        <Spinner v-if="checking" /><RefreshCw v-else /> Check for updates
        <NewDot v-if="isNew('updates')" class="absolute -top-1 -right-1" />
      </Button>
    </SettingsRow>
    <div class="flex flex-wrap gap-2 py-3">
      <Button as-child variant="outline" size="sm">
        <a :href="CHANGELOG_URL" target="_blank" rel="noopener noreferrer"><ExternalLink /> What’s new</a>
      </Button>
      <Button as-child variant="outline" size="sm">
        <a :href="REVIEWS_URL" target="_blank" rel="noopener noreferrer"><Star /> Rate PR Sift</a>
      </Button>
      <Button variant="outline" size="sm" @click="openReport('bug')"> <Bug /> Report a problem </Button>
      <Button variant="outline" size="sm" @click="openReport('idea')"> <Lightbulb /> Suggest an idea </Button>
    </div>
  </SettingsSection>
</template>
