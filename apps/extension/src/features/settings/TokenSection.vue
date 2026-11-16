<script setup lang="ts">
import { computed, onMounted, onScopeDispose, shallowRef } from 'vue'
import { CircleCheck, ExternalLink, Eye, EyeOff, KeyRound } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { onStorageKey, storageGet, storageRemove, storageSet } from '../../lib/extension'
import SettingsRow from './SettingsRow.vue'
import SettingsSection from './SettingsSection.vue'

const CREATE_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new'

const saved = shallowRef('')
const draft = shallowRef('')
const visible = shallowRef(false)
const notice = shallowRef('')
let noticeTimer: ReturnType<typeof setTimeout> | undefined

const trimmed = computed(() => draft.value.trim())
const canSave = computed(() => trimmed.value !== '' && trimmed.value !== saved.value)

function adopt(value: string | undefined) {
  if (draft.value === saved.value) draft.value = value ?? ''
  saved.value = value ?? ''
}

function announce(text: string) {
  notice.value = text
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = ''), 3000)
}

async function save() {
  if (!canSave.value) return
  const value = trimmed.value
  await storageSet({ token: value })
  saved.value = value
  draft.value = value
  announce('Token saved')
}

async function remove() {
  await storageRemove('token')
  saved.value = ''
  draft.value = ''
  visible.value = false
  announce('Token removed')
}

onScopeDispose(onStorageKey<string>('token', adopt))
onScopeDispose(() => clearTimeout(noticeTimer))
onMounted(async () => adopt(await storageGet<string>('token')))
</script>

<template>
  <SettingsSection id="token" title="GitHub token" description="Optional. Needed to post notes, count comments, approve and merge.">
    <template #icon><KeyRound class="size-4" /></template>
    <SettingsRow label="Personal access token" control-id="settings-token" stacked>
      <template #description>
        Fine-grained, with Pull requests set to read and write. To merge from the review, set Contents to read and write too. PR Sift keeps
        it on this device and sends it only to api.github.com.
      </template>
      <InputGroup>
        <InputGroupInput
          id="settings-token"
          v-model="draft"
          :type="visible ? 'text' : 'password'"
          autocomplete="off"
          spellcheck="false"
          placeholder="github_pat_…"
          @keydown.enter.prevent="save"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton :aria-label="visible ? 'Hide token' : 'Show token'" size="icon-xs" @click="visible = !visible">
            <EyeOff v-if="visible" /><Eye v-else />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="sm" :disabled="!canSave" @click="save">Save</Button>
        <Button v-if="saved" variant="outline" size="sm" @click="remove">Remove</Button>
        <Button as-child variant="ghost" size="sm">
          <a :href="CREATE_TOKEN_URL" target="_blank" rel="noopener noreferrer"><ExternalLink /> Create a token on GitHub</a>
        </Button>
        <span aria-live="polite" class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <template v-if="notice"><CircleCheck class="size-3.5 text-success-fg" /> {{ notice }}</template>
        </span>
      </div>
    </SettingsRow>
  </SettingsSection>
</template>
