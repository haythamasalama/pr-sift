<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { CheckCircle2, X, Zap } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import NoticeBar from '../../components/NoticeBar.vue'
import { storageGet, storageSet } from '../../lib/extension'
import { saveSetting } from '../../lib/settings'
import { useSettingsOpener } from '../settings/useSettingsOpener'

const { enabled } = defineProps<{ enabled: boolean }>()

const TIP_KEY = 'autoOpenTipDismissed'
const dismissed = shallowRef(true)
const turnedOn = shallowRef(false)
const openSettings = useSettingsOpener()

onMounted(async () => {
  dismissed.value = Boolean(await storageGet<boolean>(TIP_KEY))
})

async function dismiss() {
  dismissed.value = true
  turnedOn.value = false
  await storageSet({ [TIP_KEY]: true })
}

async function turnOn() {
  turnedOn.value = true
  await Promise.all([saveSetting('autoOpen', true), storageSet({ [TIP_KEY]: true })])
}
</script>

<template>
  <NoticeBar v-if="turnedOn" title="PR Sift now opens automatically.">
    <template #icon><CheckCircle2 class="text-success" /></template>
    Turn it off any time in Settings.
    <template #actions>
      <Button variant="outline" size="sm" @click="openSettings('review')">Settings</Button>
      <Button variant="ghost" size="icon-sm" aria-label="Dismiss" title="Dismiss" @click="dismiss"><X /></Button>
    </template>
  </NoticeBar>
  <NoticeBar v-else-if="!enabled && !dismissed" title="Open PR Sift automatically?">
    <template #icon><Zap class="fill-attention/25 text-attention" /></template>
    Pull requests will open straight in PR Sift, with no button to click.
    <template #actions>
      <Button variant="outline" size="sm" class="relative" @click="turnOn">
        Turn on
        <span class="absolute -top-0.5 -right-0.5 flex size-2" aria-hidden="true">
          <span class="absolute inset-0 rounded-full bg-emphasis motion-safe:animate-soft-ping" />
          <span class="relative size-2 rounded-full bg-emphasis ring-2 ring-sidebar" />
        </span>
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Dismiss" title="Not now" @click="dismiss"><X /></Button>
    </template>
  </NoticeBar>
</template>
