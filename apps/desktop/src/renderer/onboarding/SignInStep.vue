<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { ArrowRight, ArrowUpRight, CircleAlert, Eye, EyeOff, LockKeyhole, Terminal } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { bridge } from '~/bridge'
import { clearCache } from '~/cache'
import { useAuth } from '~/useAuth'
import AppLogo from '~/components/AppLogo.vue'
import Hint from '~/components/Hint.vue'

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

// Three pull requests fanned above the logo, each with its checks dot: the app sifting them.
const ROWS = [
  { dot: 'bg-success-fg', bar: 64, style: { top: '0px', left: '8px', transform: 'rotate(-7deg)' } },
  { dot: 'bg-attention', bar: 52, style: { top: '10px', right: '4px', transform: 'rotate(6deg)' } },
  { dot: 'bg-destructive', bar: 40, style: { top: '30px', left: '50%', transform: 'translateX(-50%) rotate(-1deg)' } },
]
const safety = computed(() =>
  status.value?.weakStorage
    ? { text: 'Saved with basic protection', hint: 'No keyring was found. Installing GNOME Keyring or KWallet makes it safer.' }
    : { text: 'Encrypted in your keychain', hint: 'Only ever sent to api.github.com.' },
)
const openCreate = () => bridge.invoke('shell:open-external', CREATE_TOKEN_URL)
</script>

<template>
  <div class="relative">
    <!-- The frame: a card lifted off a soft dot grid, with pull requests being sifted into the logo. -->
    <div class="relative overflow-hidden rounded-2xl border border-border bg-card shadow-overlay">
      <div class="flex flex-col items-center gap-5 px-8 pt-9 pb-7">
        <div class="relative flex h-[104px] w-56 justify-center" aria-hidden="true">
          <div
            v-for="(row, i) in ROWS"
            :key="i"
            class="absolute flex h-6 items-center gap-2 rounded-md border border-border bg-background px-2 shadow-xs"
            :style="row.style"
          >
            <span class="size-1.5 shrink-0 rounded-full" :class="row.dot" />
            <span class="h-1.5 rounded-full bg-muted-foreground/30" :style="{ width: `${row.bar}px` }" />
          </div>
          <div
            class="absolute bottom-0 flex size-14 items-center justify-center rounded-2xl border border-border bg-background shadow-overlay"
          >
            <AppLogo class="size-9" />
          </div>
        </div>
        <h1 class="text-xl font-semibold tracking-tight">Sign in with GitHub</h1>

        <div v-if="account" class="flex w-full flex-col gap-3">
          <div class="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            <img v-if="account.avatarUrl" :src="account.avatarUrl" alt="" class="size-9 rounded-full" />
            <span v-else class="flex size-9 items-center justify-center rounded-full bg-muted font-medium uppercase">{{
              account.login.slice(0, 1)
            }}</span>
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="truncate font-medium">{{ account.name || account.login }}</span>
              <span class="truncate text-xs text-muted-foreground">{{ account.login }}</span>
            </div>
            <Button variant="ghost" size="sm" :disabled="busy !== null" @click="switchAccount">
              <Spinner v-if="busy === 'out'" />Switch
            </Button>
          </div>
          <Button size="lg" class="w-full" @click="emit('next')">Continue <ArrowRight /></Button>
        </div>

        <Alert v-else-if="!canStore" variant="destructive">
          <CircleAlert />
          <AlertDescription>No keyring to keep the token in. Install GNOME Keyring or KWallet, then restart PR Sift.</AlertDescription>
        </Alert>

        <div v-else class="flex w-full flex-col gap-4">
          <Button v-if="ghAvailable" size="lg" class="w-full" :disabled="busy !== null" @click="importGh">
            <Spinner v-if="busy === 'gh'" />
            <Terminal v-else />
            Continue with GitHub CLI
          </Button>

          <div v-if="ghAvailable" class="flex items-center gap-3 text-xs text-muted-foreground">
            <span class="h-px flex-1 bg-border" />or<span class="h-px flex-1 bg-border" />
          </div>

          <form class="flex flex-col gap-2" @submit.prevent="submit">
            <InputGroup class="h-10">
              <InputGroupInput
                id="token"
                v-model="token"
                :type="visible ? 'text' : 'password'"
                placeholder="Personal access token"
                aria-label="Personal access token"
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
            <button
              type="button"
              class="mx-auto flex items-center gap-1 pt-1 text-xs text-muted-foreground hover:text-foreground"
              @click="openCreate"
            >
              Create a token <ArrowUpRight class="size-3" />
            </button>
          </form>
        </div>

        <Alert v-if="error" variant="destructive">
          <CircleAlert />
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
      </div>
      <Hint :text="safety.hint">
        <p class="flex items-center justify-center gap-1.5 border-t border-border bg-muted/40 py-2.5 text-[11px] text-muted-foreground">
          <LockKeyhole class="size-3" />{{ safety.text }}
        </p>
      </Hint>
    </div>
  </div>
</template>
