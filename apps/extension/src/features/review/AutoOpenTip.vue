<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { CheckCircle2, X, Zap } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
  <Alert v-if="turnedOn" class="flex items-center gap-3 rounded-none border-x-0 border-t-0 py-2">
    <CheckCircle2 class="text-success" />
    <AlertDescription class="flex-1 text-xs">PR Sift will open on its own on every pull request.</AlertDescription>
    <Button variant="outline" size="sm" @click="openSettings('review')">Settings</Button>
    <Button variant="ghost" size="icon-sm" aria-label="Dismiss" title="Dismiss" @click="dismiss"><X /></Button>
  </Alert>
  <Alert v-else-if="!enabled && !dismissed" class="flex items-center gap-3 rounded-none border-x-0 border-t-0 py-2">
    <Zap />
    <AlertDescription class="flex-1 text-xs">Open PR Sift on its own each time you open a pull request?</AlertDescription>
    <Button variant="outline" size="sm" @click="turnOn">Always open</Button>
    <Button variant="ghost" size="icon-sm" aria-label="Dismiss" title="Not now" @click="dismiss"><X /></Button>
  </Alert>
</template>
