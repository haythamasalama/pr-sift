<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { ChevronDown, Columns2, Eye, EyeOff, Rows2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useTheme } from '../composables/useTheme'
import { DEFAULTS, getSettings } from '../lib/settings'
import type { DiffMode, Settings } from '../lib/types'

const STATUSES = [
  { value: 'added', label: 'Added files' },
  { value: 'modified', label: 'Modified files' },
  { value: 'removed', label: 'Deleted files' },
  { value: 'renamed', label: 'Renamed files' },
]

const dark = useTheme()
const token = shallowRef('')
const showToken = shallowRef(false)
const hide = shallowRef('')
const hideStatuses = shallowRef<string[]>([])
const reviewMode = shallowRef(DEFAULTS.reviewMode)
const diffView = shallowRef<DiffMode>(DEFAULTS.diffView)
const presets = shallowRef('[]')
const advancedOpen = shallowRef(false)
const confirmReset = shallowRef(false)
const message = shallowRef<{ ok: boolean; text: string } | null>(null)

function fill(settings: Settings) {
  hide.value = settings.hide.join('\n')
  hideStatuses.value = [...settings.hideStatuses]
  reviewMode.value = settings.reviewMode
  diffView.value = settings.diffView
  presets.value = JSON.stringify(settings.presets, null, 2)
}

async function load() {
  token.value = ((await chrome.storage.local.get('token')) as { token?: string }).token ?? ''
  fill(await getSettings())
}

function flash(ok: boolean, text: string) {
  message.value = { ok, text }
  setTimeout(() => (message.value = null), 3000)
}

function toggleStatus(status: string, on: boolean) {
  hideStatuses.value = on ? [...hideStatuses.value, status] : hideStatuses.value.filter((s) => s !== status)
}

async function save() {
  let parsed: unknown
  try {
    parsed = JSON.parse(presets.value)
  } catch (e) {
    advancedOpen.value = true
    return flash(false, 'Presets are not valid JSON: ' + (e as Error).message)
  }
  if (!Array.isArray(parsed)) {
    advancedOpen.value = true
    return flash(false, 'Presets must be a list')
  }
  const current = await getSettings()
  const settings: Settings = {
    ...current,
    presets: parsed,
    hide: hide.value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    hideStatuses: hideStatuses.value,
    reviewMode: reviewMode.value,
    diffView: diffView.value,
  }
  await chrome.storage.local.set({ token: token.value.trim(), settings })
  flash(true, 'Saved')
}

async function reset() {
  if (!confirmReset.value) {
    confirmReset.value = true
    setTimeout(() => (confirmReset.value = false), 3000)
    return
  }
  confirmReset.value = false
  await chrome.storage.local.remove('settings')
  fill(DEFAULTS)
  flash(true, 'Settings reset to defaults')
}

onMounted(load)
</script>

<template>
  <div class="rl-root min-h-screen bg-background text-sm text-foreground" :class="{ dark }">
    <main class="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
      <header class="flex flex-col gap-1">
        <h1 class="text-2xl font-semibold tracking-tight">Review Lens</h1>
        <p class="text-muted-foreground">Settings for reviewing pull requests on GitHub. Everything is stored in this browser only.</p>
      </header>

      <section class="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-xs">
        <div>
          <h2 class="font-medium">GitHub token</h2>
          <p class="text-xs text-muted-foreground">
            Optional. Review Lens reads pull requests with your GitHub login. The token is used only to post a private note as a comment on
            the pull request, and as a fallback if reading fails.
          </p>
        </div>
        <div class="flex gap-2">
          <Input
            v-model="token"
            :type="showToken ? 'text' : 'password'"
            autocomplete="off"
            placeholder="github_pat_…"
            class="font-mono text-xs md:text-xs"
            aria-label="GitHub token"
          />
          <Button variant="outline" size="icon" :aria-label="showToken ? 'Hide token' : 'Show token'" @click="showToken = !showToken">
            <EyeOff v-if="showToken" /><Eye v-else />
          </Button>
          <Button v-if="token" variant="ghost" @click="token = ''">Clear</Button>
        </div>
      </section>

      <section class="flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-xs">
        <div>
          <h2 class="font-medium">Hidden files</h2>
          <p class="text-xs text-muted-foreground">
            Files matching these rules stay out of the list until you turn on “Hidden” in the review.
          </p>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="hide">Path patterns, one per line</Label>
          <Textarea id="hide" v-model="hide" rows="6" spellcheck="false" class="font-mono text-xs md:text-xs" placeholder="**/*.lock" />
          <p class="text-xs text-muted-foreground">
            Use <code>*</code> inside a folder and <code>**</code> across folders, e.g. <code>**/*.min.js</code>.
          </p>
        </div>
        <Separator />
        <div class="flex flex-col gap-3">
          <Label>Hide by change type</Label>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="s in STATUSES" :key="s.value" class="flex items-center gap-2">
              <Checkbox
                :id="`status-${s.value}`"
                :model-value="hideStatuses.includes(s.value)"
                @update:model-value="(v) => toggleStatus(s.value, v === true)"
              />
              <Label :for="`status-${s.value}`" class="font-normal">{{ s.label }}</Label>
            </div>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-xs">
        <h2 class="font-medium">Defaults</h2>
        <div class="flex items-center justify-between gap-4">
          <div>
            <Label for="review-mode">Hide viewed files</Label>
            <p class="text-xs text-muted-foreground">Files disappear from the list as soon as you mark them viewed.</p>
          </div>
          <Switch id="review-mode" v-model="reviewMode" />
        </div>
        <Separator />
        <div class="flex items-center justify-between gap-4">
          <div>
            <Label>Diff view</Label>
            <p class="text-xs text-muted-foreground">Split view needs a wide window and falls back to unified on small ones.</p>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            :model-value="diffView"
            aria-label="Diff view"
            @update:model-value="(v) => v && (diffView = v as DiffMode)"
          >
            <ToggleGroupItem value="unified"><Rows2 /> Unified</ToggleGroupItem>
            <ToggleGroupItem value="split"><Columns2 /> Split</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </section>

      <Collapsible v-model:open="advancedOpen" class="rounded-lg border bg-card shadow-xs">
        <CollapsibleTrigger as-child>
          <button type="button" class="flex w-full items-center justify-between px-5 py-4 text-left font-medium">
            Presets (advanced)
            <ChevronDown class="size-4 transition-transform" :class="advancedOpen ? 'rotate-180' : ''" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent class="flex flex-col gap-2 px-5 pb-5">
          <p class="text-xs text-muted-foreground">
            Named sets of path patterns that appear as a picker in the review. Example:
            <code>[{ "name": "Backend", "include": ["src/**"] }]</code>
          </p>
          <Textarea v-model="presets" rows="10" spellcheck="false" class="font-mono text-xs md:text-xs" aria-label="Presets JSON" />
        </CollapsibleContent>
      </Collapsible>

      <footer class="sticky bottom-0 -mx-6 flex items-center gap-3 border-t bg-background/90 px-6 py-3 backdrop-blur">
        <Button @click="save">Save</Button>
        <Button :variant="confirmReset ? 'destructive' : 'outline'" @click="reset">{{
          confirmReset ? 'Click again to reset' : 'Reset to defaults'
        }}</Button>
        <span v-if="message" role="status" :class="message.ok ? 'text-success' : 'text-destructive'">{{ message.text }}</span>
      </footer>
    </main>
  </div>
</template>
