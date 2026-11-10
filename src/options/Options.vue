<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { DEFAULTS, getSettings } from '../lib/settings'

const token = shallowRef('')
const json = shallowRef('')
const message = shallowRef<{ ok: boolean; text: string } | null>(null)

async function load() {
  token.value = ((await chrome.storage.local.get('token')) as { token?: string }).token ?? ''
  json.value = JSON.stringify(await getSettings(), null, 2)
}

function flash(ok: boolean, text: string) {
  message.value = { ok, text }
  setTimeout(() => (message.value = null), 3000)
}

async function save() {
  let settings: unknown
  try {
    settings = JSON.parse(json.value)
  } catch (e) {
    return flash(false, 'Invalid JSON: ' + (e as Error).message)
  }
  await chrome.storage.local.set({ token: token.value.trim(), settings })
  flash(true, 'Saved')
}

async function reset() {
  await chrome.storage.local.remove('settings')
  json.value = JSON.stringify(DEFAULTS, null, 2)
  flash(true, 'Settings reset')
}

onMounted(load)
</script>

<template>
  <main class="mx-auto max-w-2xl space-y-5 p-8 font-sans text-sm text-slate-800">
    <h1 class="text-xl font-semibold">Review Lens</h1>

    <section class="space-y-1.5">
      <label class="font-medium" for="token">GitHub token (optional)</label>
      <input
        id="token"
        v-model="token"
        type="password"
        autocomplete="off"
        placeholder="github_pat_…"
        class="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
      />
      <p class="text-xs text-slate-500">
        Without a token the extension reads pull requests with your GitHub login session. A token is only needed to post a private note as a
        GitHub comment, or as a fallback when reading fails.
      </p>
    </section>

    <section class="space-y-1.5">
      <label class="font-medium" for="settings">Settings (JSON)</label>
      <textarea
        id="settings"
        v-model="json"
        spellcheck="false"
        class="h-96 w-full rounded-md border border-slate-300 p-3 font-mono text-xs"
      />
      <p class="text-xs text-slate-500">
        presets, hide (globs), hideStatuses, customExtensions, hiddenTypes, reviewMode, diffView, sidebarWidth.
      </p>
    </section>

    <div class="flex items-center gap-3">
      <button type="button" class="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700" @click="save">Save</button>
      <button type="button" class="rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-50" @click="reset">Reset settings</button>
      <span v-if="message" :class="message.ok ? 'text-green-700' : 'text-red-600'">{{ message.text }}</span>
    </div>
  </main>
</template>
