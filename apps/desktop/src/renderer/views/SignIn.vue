<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { CircleAlert, Eye, EyeOff, ExternalLink, Terminal } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import BrandMark from '@/components/BrandMark.vue'
import { bridge } from '~/bridge'
import { useAuth } from '~/useAuth'

const CREATE_TOKEN_URL = 'https://github.com/settings/tokens/new?description=PR%20Sift%20desktop&scopes=repo'

const { status, set } = useAuth()
const token = shallowRef('')
const visible = shallowRef(false)
const busy = shallowRef<'token' | 'gh' | null>(null)
const error = shallowRef('')
const ghAvailable = shallowRef(false)

const canStore = computed(() => status.value?.canStore !== false)

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

const openCreate = () => bridge.invoke('shell:open-external', CREATE_TOKEN_URL)
</script>

<template>
  <main class="flex h-full items-center justify-center bg-background p-6">
    <div class="flex w-full max-w-[420px] flex-col gap-6">
      <div class="flex items-center gap-3">
        <span class="flex size-10 items-center justify-center rounded-[22%] bg-foreground text-background">
          <BrandMark class="size-6" />
        </span>
        <div class="flex flex-col">
          <h1 class="text-lg font-semibold">Sign in to GitHub</h1>
          <p class="text-muted-foreground">PR Sift reads your pull requests and repositories with your token.</p>
        </div>
      </div>

      <Alert v-if="!canStore" variant="destructive">
        <CircleAlert />
        <AlertDescription>
          This system has no encrypted storage, so PR Sift can’t keep a token. On Linux, install and unlock a keyring such as GNOME Keyring
          or KWallet, then restart PR Sift.
        </AlertDescription>
      </Alert>

      <template v-else>
        <div v-if="ghAvailable" class="flex flex-col gap-2">
          <Button size="lg" :disabled="busy !== null" @click="importGh">
            <Spinner v-if="busy === 'gh'" />
            <Terminal v-else />
            Use my GitHub CLI sign-in
          </Button>
          <p class="text-xs text-muted-foreground">Copies the token from gh auth token. If you sign out of gh later, sign in here again.</p>
        </div>

        <div v-if="ghAvailable" class="flex items-center gap-3 text-xs text-muted-foreground">
          <Separator class="flex-1" />
          or paste a token
          <Separator class="flex-1" />
        </div>

        <form class="flex flex-col gap-2" @submit.prevent="submit">
          <label for="token" class="font-medium">Personal access token</label>
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
          <p class="text-xs text-muted-foreground">
            A classic token with the repo scope. It is encrypted by your system’s keychain and only sent to api.github.com.
          </p>
          <div class="flex flex-wrap items-center gap-2 pt-1">
            <Button type="submit" :variant="ghAvailable ? 'outline' : 'default'" :disabled="!token.trim() || busy !== null">
              <Spinner v-if="busy === 'token'" />
              Sign in
            </Button>
            <Button type="button" variant="ghost" @click="openCreate"><ExternalLink /> Create a token</Button>
          </div>
        </form>
      </template>

      <Alert v-if="error" variant="destructive">
        <CircleAlert />
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>

      <p v-if="status?.weakStorage" class="text-xs text-muted-foreground">
        No keyring was found, so the token is stored with basic protection only. Installing GNOME Keyring or KWallet makes it safer.
      </p>
    </div>
  </main>
</template>
