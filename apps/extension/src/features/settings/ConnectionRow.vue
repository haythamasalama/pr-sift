<script setup lang="ts">
import { computed, onMounted, onScopeDispose, shallowRef, watch } from 'vue'
import { CircleAlert, CircleCheck, ExternalLink, Eye, EyeOff } from '@lucide/vue'
import { avatarUrl } from '@pr-sift/core'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { onStorageKey, storageGet, storageRemove, storageSet } from '../../lib/extension'
import { gh } from '../review/github'

const CREATE_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new'

const saved = shallowRef('')
const draft = shallowRef('')
const editing = shallowRef(false)
const visible = shallowRef(false)
const notice = shallowRef('')
const account = shallowRef<{ login: string; avatar?: string } | null>(null)
const problem = shallowRef('')
const checking = shallowRef(false)
let noticeTimer: ReturnType<typeof setTimeout> | undefined

const trimmed = computed(() => draft.value.trim())
const showForm = computed(() => editing.value || !saved.value)

function adopt(value: string | undefined) {
  saved.value = value ?? ''
  if (!editing.value) draft.value = ''
}

function announce(text: string) {
  notice.value = text
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = ''), 3000)
}

async function verify(token: string) {
  account.value = null
  problem.value = ''
  if (!token) return
  checking.value = true
  try {
    const user = await gh<{ login: string; avatar_url?: string }>('/user')
    account.value = { login: user.login, avatar: avatarUrl(user.avatar_url) }
  } catch (e) {
    problem.value = e instanceof Error ? e.message.replace(/^\d+: /, '') : String(e)
  } finally {
    checking.value = false
  }
}

async function save() {
  if (!trimmed.value) return
  await storageSet({ token: trimmed.value })
  saved.value = trimmed.value
  draft.value = ''
  editing.value = false
  visible.value = false
  announce('Token saved')
}

async function remove() {
  await storageRemove('token')
  saved.value = ''
  editing.value = false
  announce('Token removed')
}

watch(saved, verify)
onScopeDispose(onStorageKey<string>('token', adopt))
onScopeDispose(() => clearTimeout(noticeTimer))
onMounted(async () => adopt(await storageGet<string>('token')))
</script>

<template>
  <div class="flex flex-col gap-3 py-3">
    <div v-if="saved && !editing" class="flex flex-wrap items-center gap-3">
      <Avatar>
        <AvatarImage v-if="account?.avatar" :src="account.avatar" alt="" />
        <AvatarFallback class="text-xs uppercase">{{ account?.login.slice(0, 2) ?? 'gh' }}</AvatarFallback>
      </Avatar>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <p class="flex items-center gap-1.5 text-sm font-medium">
          <template v-if="checking"><Spinner class="size-3.5" /> Checking your token…</template>
          <template v-else-if="account">Connected as @{{ account.login }}</template>
          <template v-else><CircleAlert class="size-3.5 text-destructive" /> GitHub didn’t accept this token</template>
        </p>
        <p class="text-xs text-muted-foreground">
          {{ problem || 'Comments, reviews and merging work from the review.' }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" @click="editing = true">Change</Button>
        <Button variant="ghost" size="sm" @click="remove">Remove</Button>
      </div>
    </div>

    <form v-if="showForm" class="flex flex-col gap-2" @submit.prevent="save">
      <p class="text-xs text-muted-foreground">
        A fine-grained token with Pull requests set to read and write, and Contents too if you merge from the review. It stays on this
        device and goes only to api.github.com.
      </p>
      <InputGroup>
        <InputGroupInput
          id="settings-token"
          v-model="draft"
          aria-label="Personal access token"
          :type="visible ? 'text' : 'password'"
          autocomplete="off"
          spellcheck="false"
          placeholder="github_pat_…"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton :aria-label="visible ? 'Hide token' : 'Show token'" size="icon-xs" @click="visible = !visible">
            <EyeOff v-if="visible" /><Eye v-else />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <div class="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" :disabled="!trimmed">Connect</Button>
        <Button v-if="saved" type="button" variant="ghost" size="sm" @click="editing = false">Cancel</Button>
        <Button as-child variant="ghost" size="sm">
          <a :href="CREATE_TOKEN_URL" target="_blank" rel="noopener noreferrer"><ExternalLink /> Create a token</a>
        </Button>
      </div>
    </form>

    <p v-if="notice" aria-live="polite" class="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CircleCheck class="size-3.5 text-success-fg" /> {{ notice }}
    </p>
  </div>
</template>
