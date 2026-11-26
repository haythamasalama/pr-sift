<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { ArrowRight, CircleAlert, ExternalLink, Eye, EyeOff, LockKeyhole, Terminal } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { bridge } from '~/bridge'
import { clearCache } from '~/cache'
import { useAuth } from '~/useAuth'

const emit = defineEmits<{ next: [] }>()

const CREATE_TOKEN_URL = 'https://github.com/settings/tokens/new?description=PR%20Sift%20desktop&scopes=repo'

const { status, set } = useAuth()
const token = shallowRef('')
const visible = shallowRef(false)
const busy = shallowRef<'token' | 'gh' | 'out' | null>(null)
const error = shallowRef('')
const ghAvailable = shallowRef(false)

const canStore = computed(() => status.value?.canStore !== false)
const account = computed(() => (status.value?.signedIn ? status.value.account : undefined))

onMounted(async () => {
  ghAvailable.value = await bridge.invoke('auth:gh-available')
})

async function submit() {
  if (!token.value.trim() || busy.value) return
  busy.value = 'token'
  error.value = ''
  const result = await bridge.invoke('auth:save-token', token.value)
  busy.value = null
  if (result.ok && result.status) {
    token.value = ''
    set(result.status)
  } else error.value = result.error ?? 'Could not sign in.'
}

async function importGh() {
  if (busy.value) return
  busy.value = 'gh'
  error.value = ''
  const result = await bridge.invoke('auth:import-gh')
  busy.value = null
  if (result.ok && result.status) set(result.status)
  else error.value = result.error ?? 'Could not use the gh token.'
}

async function switchAccount() {
  busy.value = 'out'
  clearCache()
  set(await bridge.invoke('auth:sign-out'))
  busy.value = null
}

const openCreate = () => bridge.invoke('shell:open-external', CREATE_TOKEN_URL)
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-1.5">
      <h1 class="text-2xl font-semibold tracking-tight">Sign in to GitHub</h1>
      <p class="text-muted-foreground">PR Sift reads your pull requests and repositories with your GitHub account.</p>
    </div>

    <div v-if="account" class="flex flex-col gap-4">
      <div class="flex items-center gap-3 rounded-lg border border-border p-3">
        <img v-if="account.avatarUrl" :src="account.avatarUrl" alt="" class="size-10 rounded-full" />
        <span v-else class="flex size-10 items-center justify-center rounded-full bg-muted font-medium uppercase">{{
          account.login.slice(0, 1)
        }}</span>
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="truncate font-medium">{{ account.name ?? account.login }}</span>
          <span class="truncate text-xs text-muted-foreground"
            >@{{ account.login }} · {{ status?.source === 'gh' ? 'GitHub CLI' : 'Personal access token' }}</span
          >
        </div>
        <Button variant="ghost" size="sm" :disabled="busy !== null" @click="switchAccount">
          <Spinner v-if="busy === 'out'" />Switch
        </Button>
      </div>
      <Button size="lg" class="w-full" @click="emit('next')">Continue <ArrowRight /></Button>
    </div>

    <Alert v-else-if="!canStore" variant="destructive">
      <CircleAlert />
      <AlertDescription>
        This system has no encrypted storage, so PR Sift can’t keep a token. On Linux, install and unlock a keyring such as GNOME Keyring or
        KWallet, then restart PR Sift.
      </AlertDescription>
    </Alert>

    <template v-else>
      <div v-if="ghAvailable" class="flex flex-col gap-2">
        <Button size="lg" class="w-full" :disabled="busy !== null" @click="importGh">
          <Spinner v-if="busy === 'gh'" />
          <Terminal v-else />
          Continue with GitHub CLI
        </Button>
        <p class="text-center text-xs text-muted-foreground">Uses the account you signed in to with gh. Nothing to paste.</p>
      </div>

      <div v-if="ghAvailable" class="flex items-center gap-3 text-xs text-muted-foreground">
        <span class="h-px flex-1 bg-border" />or use a token<span class="h-px flex-1 bg-border" />
      </div>

      <form class="flex flex-col gap-3" @submit.prevent="submit">
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between gap-2">
            <label for="token" class="font-medium">Personal access token</label>
            <button type="button" class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" @click="openCreate">
              Create one <ExternalLink class="size-3" />
            </button>
          </div>
          <InputGroup>
            <InputGroupInput
              id="token"
              v-model="token"
              :type="visible ? 'text' : 'password'"
              placeholder="ghp_…"
              autocomplete="off"
              spellcheck="false"
              :disabled="busy !== null"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton :aria-label="visible ? 'Hide token' : 'Show token'" size="icon-xs" @click="visible = !visible">
                <EyeOff v-if="visible" />
                <Eye v-else />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <p class="text-xs text-muted-foreground">A classic token with the repo scope.</p>
        </div>
        <Button
          type="submit"
          size="lg"
          class="w-full"
          :variant="ghAvailable ? 'outline' : 'default'"
          :disabled="!token.trim() || busy !== null"
        >
          <Spinner v-if="busy === 'token'" />
          Sign in
        </Button>
      </form>
    </template>

    <Alert v-if="error" variant="destructive">
      <CircleAlert />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <p class="flex items-start gap-2 text-xs text-muted-foreground">
      <LockKeyhole class="mt-px size-3.5 shrink-0" />
      <span v-if="status?.weakStorage"
        >No keyring was found, so the token is stored with basic protection only. Installing GNOME Keyring or KWallet makes it safer.</span
      >
      <span v-else>Your token is encrypted by your system’s keychain and only sent to api.github.com.</span>
    </p>
  </div>
</template>
