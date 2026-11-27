<script setup lang="ts">
import { Bug, ExternalLink, Lightbulb, PackageCheck, RefreshCw, RotateCw, Sparkles, Star, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from '@/components/ui/item'
import BrandIcon from '../../components/BrandIcon.vue'
import BrandLogo from '../../components/BrandLogo.vue'
import NewDot from '../../components/NewDot.vue'
import { openReport } from '../../lib/report'
import { CHANGELOG_URL, REVIEWS_URL } from '../../lib/updates'
import { useUpdates } from '../updates/useUpdates'
import SettingsSection from './SettingsSection.vue'
import { useNewMarks } from './useNewMarks'

const { framed = false } = defineProps<{ framed?: boolean }>()
const { version, ready, updated, checking, status, throttled, check, restart, dismiss, openExtensionsPage } = useUpdates()
const { isNew, markSeen } = useNewMarks()

const LINKS = [
  { label: 'What’s new', hint: 'Changes in each version', icon: Sparkles, href: CHANGELOG_URL },
  { label: 'Rate PR Sift', hint: 'On the Chrome Web Store', icon: Star, href: REVIEWS_URL },
  { label: 'Report a problem', hint: 'Opens a GitHub issue', icon: Bug, action: () => openReport('bug') },
  { label: 'Suggest an idea', hint: 'Opens a GitHub issue', icon: Lightbulb, action: () => openReport('idea') },
]

function checkForUpdates() {
  void markSeen('updates')
  void check()
}
</script>

<template>
  <SettingsSection id="about" title="About" description="Your version, updates and help." :framed="framed" :headless="!framed">
    <template #icon><BrandIcon class="size-6" /></template>
    <div class="flex flex-col gap-6" :class="framed ? 'py-4' : 'pt-3'">
      <div v-if="updated" class="flex items-center gap-2 text-xs">
        <PackageCheck class="size-4 shrink-0 text-success-fg" />
        <span class="flex-1">Updated to {{ updated.version }}.</span>
        <Button as-child variant="outline" size="xs">
          <a :href="CHANGELOG_URL" target="_blank" rel="noopener noreferrer">What’s new</a>
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label="Dismiss" title="Dismiss" @click="dismiss"><X /></Button>
      </div>

      <div class="flex flex-wrap items-center gap-3.5">
        <BrandLogo class="size-9 shrink-0" />
        <div class="flex min-w-40 flex-1 flex-col gap-0.5">
          <h3 class="text-sm leading-5 font-semibold">PR Sift</h3>
          <p class="text-xs text-muted-foreground" aria-live="polite">
            Version {{ version }} · {{ status || 'Chrome updates it on its own.' }}
            <template v-if="ready"> Reload open GitHub tabs afterwards.</template>
          </p>
        </div>
        <Button v-if="ready" size="sm" @click="restart"><RotateCw /> Restart to update to {{ ready }}</Button>
        <Button
          v-else-if="throttled"
          variant="outline"
          size="sm"
          title="Turn on Developer mode there, then press Update"
          @click="openExtensionsPage"
        >
          <ExternalLink /> Update in Chrome
        </Button>
        <Button v-else variant="outline" size="sm" class="relative" :disabled="checking" @click="checkForUpdates">
          <Spinner v-if="checking" /><RefreshCw v-else /> Check for updates
          <NewDot v-if="isNew('updates')" class="absolute -top-1 -right-1" />
        </Button>
      </div>

      <ItemGroup class="gap-0 overflow-hidden rounded-lg border has-data-[size=sm]:gap-0">
        <template v-for="(link, i) in LINKS" :key="link.label">
          <ItemSeparator v-if="i > 0" class="my-0" />
          <Item
            size="sm"
            class="rounded-none text-left hover:bg-muted"
            :as="link.href ? 'a' : 'button'"
            v-bind="link.href ? { href: link.href, target: '_blank', rel: 'noopener noreferrer' } : { type: 'button' }"
            @click="link.action?.()"
          >
            <ItemMedia variant="icon" class="text-muted-foreground"><component :is="link.icon" /></ItemMedia>
            <ItemContent>
              <ItemTitle>{{ link.label }}</ItemTitle>
            </ItemContent>
            <ItemActions class="text-xs text-muted-foreground"> {{ link.hint }}<ExternalLink class="size-3.5" /> </ItemActions>
          </Item>
        </template>
      </ItemGroup>
    </div>
  </SettingsSection>
</template>
