<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { CircleAlert, CircleCheck, ChevronDown, Columns2, Eye, EyeOff, Rows2 } from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import BrandMark from '../components/BrandMark.vue'
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
  <div class="rl-root min-h-screen bg-background text-foreground" :class="{ dark }">
    <main class="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-lg bg-primary p-1.5 text-primary-foreground">
          <BrandMark />
        </div>
        <div class="flex flex-col">
          <h1 class="text-xl font-semibold">Review Lens</h1>
          <p class="text-sm text-muted-foreground">Review big pull requests faster. Settings stay in this browser.</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>GitHub token</CardTitle>
          <CardDescription>
            Optional. Used only to post a private note as a comment on the pull request, and as a fallback if reading fails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel for="token">Personal access token</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="token"
                v-model="token"
                :type="showToken ? 'text' : 'password'"
                autocomplete="off"
                placeholder="github_pat_…"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton :aria-label="showToken ? 'Hide token' : 'Show token'" size="icon-xs" @click="showToken = !showToken">
                  <EyeOff v-if="showToken" /><Eye v-else />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hidden files</CardTitle>
          <CardDescription>These stay out of the list until you turn on “Hidden” in the review.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel for="hide">Path patterns</FieldLabel>
              <Textarea id="hide" v-model="hide" rows="6" spellcheck="false" placeholder="**/*.lock" />
              <FieldDescription>One per line. Use * inside a folder and ** across folders.</FieldDescription>
            </Field>
            <FieldSet>
              <FieldLegend variant="label">Hide by change type</FieldLegend>
              <FieldGroup class="gap-3">
                <Field v-for="s in STATUSES" :key="s.value" orientation="horizontal">
                  <Checkbox
                    :id="`status-${s.value}`"
                    :model-value="hideStatuses.includes(s.value)"
                    @update:model-value="(v) => toggleStatus(s.value, v === true)"
                  />
                  <FieldLabel :for="`status-${s.value}`" class="font-normal">{{ s.label }}</FieldLabel>
                </Field>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel for="review-mode">Hide viewed files</FieldLabel>
                <FieldDescription>Files disappear from the list as soon as you mark them viewed.</FieldDescription>
              </FieldContent>
              <Switch id="review-mode" v-model="reviewMode" />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel>Diff view</FieldLabel>
                <FieldDescription>Split falls back to unified on small windows.</FieldDescription>
              </FieldContent>
              <ToggleGroup
                type="single"
                variant="outline"
                :model-value="diffView"
                aria-label="Diff view"
                @update:model-value="(v) => v && (diffView = v as DiffMode)"
              >
                <ToggleGroupItem value="unified"><Rows2 /> Unified</ToggleGroupItem>
                <ToggleGroupItem value="split"><Columns2 /> Split</ToggleGroupItem>
              </ToggleGroup>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <Collapsible v-model:open="advancedOpen">
          <CardHeader>
            <CardTitle>Presets</CardTitle>
            <CardDescription>Named sets of path patterns shown as a picker in the review.</CardDescription>
            <CollapsibleTrigger as-child>
              <Button variant="outline" size="sm" class="w-fit">
                {{ advancedOpen ? 'Hide' : 'Edit' }} JSON
                <ChevronDown />
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <Field>
                <FieldLabel for="presets">Presets JSON</FieldLabel>
                <Textarea id="presets" v-model="presets" rows="10" spellcheck="false" />
                <FieldDescription>Example: [{ "name": "Backend", "include": ["src/**"] }]</FieldDescription>
              </Field>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Alert v-if="message" :variant="message.ok ? 'default' : 'destructive'">
        <CircleCheck v-if="message.ok" /><CircleAlert v-else />
        <AlertDescription>{{ message.text }}</AlertDescription>
      </Alert>

      <div class="flex gap-2">
        <Button @click="save">Save</Button>
        <Button :variant="confirmReset ? 'destructive' : 'outline'" @click="reset">
          {{ confirmReset ? 'Click again to reset' : 'Reset to defaults' }}
        </Button>
      </div>
    </main>
  </div>
</template>
