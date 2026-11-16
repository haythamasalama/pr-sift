<script setup lang="ts">
import { ExternalLink, RefreshCw, RotateCw, Star } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import BrandMark from '../../components/BrandMark.vue'
import { CHANGELOG_URL, REVIEWS_URL } from '../../lib/updates'
import { useUpdates } from '../updates/useUpdates'
import SettingsRow from './SettingsRow.vue'
import SettingsSection from './SettingsSection.vue'

const { version, ready, checking, status, check, restart } = useUpdates()
</script>

<template>
  <SettingsSection id="about" title="About" description="Your version, updates and what changed.">
    <template #icon>
      <span class="flex size-5 items-center justify-center rounded-sm bg-primary p-0.5 text-primary-foreground"><BrandMark /></span>
    </template>
    <SettingsRow :label="`PR Sift ${version}`">
      <template #description>
        <span aria-live="polite">{{ status || 'Chrome updates it on its own every few hours.' }}</span>
        <template v-if="ready"> Open GitHub tabs need a reload afterwards: click Reload PR Sift.</template>
      </template>
      <Button v-if="ready" size="sm" @click="restart"><RotateCw /> Restart to update to {{ ready }}</Button>
      <Button v-else variant="outline" size="sm" :disabled="checking" @click="check">
        <Spinner v-if="checking" /><RefreshCw v-else /> Check for updates
      </Button>
    </SettingsRow>
    <SettingsRow label="What’s new" description="The changes in each version, on the PR Sift site.">
      <Button as-child variant="outline" size="sm">
        <a :href="CHANGELOG_URL" target="_blank" rel="noopener noreferrer"><ExternalLink /> Changelog</a>
      </Button>
    </SettingsRow>
    <SettingsRow label="Rate PR Sift" description="A review on the Chrome Web Store helps other reviewers find it.">
      <Button as-child variant="outline" size="sm">
        <a :href="REVIEWS_URL" target="_blank" rel="noopener noreferrer"><Star /> Rate</a>
      </Button>
    </SettingsRow>
  </SettingsSection>
</template>
