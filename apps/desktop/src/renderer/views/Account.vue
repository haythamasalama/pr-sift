<script setup lang="ts">
import { shallowRef } from 'vue'
import { CircleAlert, LogOut } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { bridge } from '~/bridge'
import { useAuth } from '~/useAuth'
import PageHeader from '~/components/PageHeader.vue'

const { status, set } = useAuth()
const busy = shallowRef(false)

async function signOut() {
  busy.value = true
  set(await bridge.invoke('auth:sign-out'))
  busy.value = false
}

const openProfile = () => status.value?.account && bridge.invoke('shell:open-external', `https://github.com/${status.value.account.login}`)
</script>

<template>
  <PageHeader title="Account" />
  <div v-if="status?.account" class="flex max-w-2xl flex-col gap-6 p-6">
    <div class="flex items-center gap-4">
      <img v-if="status.account.avatarUrl" :src="status.account.avatarUrl" alt="" class="size-14 rounded-full border border-border" />
      <div class="flex flex-col gap-0.5">
        <span class="text-base font-semibold">{{ status.account.name ?? status.account.login }}</span>
        <button type="button" class="w-fit text-muted-foreground hover:underline" @click="openProfile">@{{ status.account.login }}</button>
      </div>
    </div>

    <p class="text-muted-foreground">
      <template v-if="status.source === 'gh'"
        >Signed in with the token from the GitHub CLI. If you sign out of gh, sign in here again.</template
      >
      <template v-else>Signed in with a personal access token.</template>
      The token is encrypted by your system’s keychain and only sent to api.github.com.
    </p>

    <Alert v-if="status.scopeWarning" class="border-attention/50">
      <CircleAlert class="text-attention" />
      <AlertDescription>{{ status.scopeWarning }}</AlertDescription>
    </Alert>
    <Alert v-if="status.weakStorage" class="border-attention/50">
      <CircleAlert class="text-attention" />
      <AlertDescription
        >No keyring was found, so the token has basic protection only. Install GNOME Keyring or KWallet to make it safer.</AlertDescription
      >
    </Alert>

    <div>
      <Button variant="outline" :disabled="busy" @click="signOut"><LogOut /> Sign out</Button>
    </div>
  </div>
</template>
