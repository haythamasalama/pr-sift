<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import {
  Bug,
  CircleAlert,
  Lightbulb,
  CircleCheck,
  ChevronDown,
  Columns2,
  ExternalLink,
  Eye,
  EyeOff,
  GitCommitHorizontal,
  GitMerge,
  Layers,
  Monitor,
  Moon,
  Rows2,
  Sun,
} from '@lucide/vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import BrandMark from '../components/BrandMark.vue'
import { openReport } from '../lib/report'
import { useAppearance } from '../features/appearance/useAppearance'
import { DEFAULTS, getSettings } from '../lib/settings'
import type { DiffMode, MergeMethod, Settings, ThemeMode } from '../lib/types'

const STATUSES = [
  { value: 'added', label: 'Added files' },
  { value: 'modified', label: 'Modified files' },
  { value: 'removed', label: 'Deleted files' },
  { value: 'renamed', label: 'Renamed files' },
]

const { theme, dark, setTheme } = useAppearance()
const token = shallowRef('')
const showToken = shallowRef(false)
const hide = shallowRef('')
const hideStatuses = shallowRef<string[]>([])
const reviewMode = shallowRef(DEFAULTS.reviewMode)
const diffView = shallowRef<DiffMode>(DEFAULTS.diffView)
const treeIndent = shallowRef(DEFAULTS.treeIndent)
const treeGuides = shallowRef(DEFAULTS.treeGuides)
const presets = shallowRef('[]')
const mergeMethod = shallowRef<MergeMethod>(DEFAULTS.mergeMethod)
const removedCoAuthors = shallowRef('')
const advancedOpen = shallowRef(false)
const confirmReset = shallowRef(false)
const message = shallowRef<{ ok: boolean; text: string } | null>(null)

function fill(settings: Settings) {
  hide.value = settings.hide.join('\n')
  hideStatuses.value = [...settings.hideStatuses]
  reviewMode.value = settings.reviewMode
  diffView.value = settings.diffView
  treeIndent.value = settings.treeIndent
  treeGuides.value = settings.treeGuides
  presets.value = JSON.stringify(settings.presets, null, 2)
  mergeMethod.value = settings.mergeMethod
  removedCoAuthors.value = settings.removedCoAuthors.join('\n')
}

const lines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

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
    hide: lines(hide.value),
    hideStatuses: hideStatuses.value,
    reviewMode: reviewMode.value,
    diffView: diffView.value,
    treeIndent: treeIndent.value,
    treeGuides: treeGuides.value,
    mergeMethod: mergeMethod.value,
    removedCoAuthors: lines(removedCoAuthors.value),
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
  <div class="ps-root min-h-screen bg-background text-foreground" :class="{ dark }">
    <main class="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-lg bg-primary p-1.5 text-primary-foreground">
          <BrandMark />
        </div>
        <div class="flex flex-col">
          <h1 class="text-xl font-semibold">PR Sift</h1>
          <p class="text-sm text-muted-foreground">Review big pull requests without the noise.</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>GitHub token</CardTitle>
          <CardDescription
            >Optional. Used to post notes as comments, show comment counts, approve and merge, and to read the pull request if your session
            can’t.</CardDescription
          >
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
            <FieldDescription
              >Fine-grained, with Pull requests set to read and write. To merge from the review, set Contents to read and write
              too.</FieldDescription
            >
            <Button as-child variant="outline" size="sm" class="w-fit">
              <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Create a token on GitHub
              </a>
            </Button>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Applies right away, here and in the review.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel>Mode</FieldLabel>
                <FieldDescription>System follows your device.</FieldDescription>
              </FieldContent>
              <ToggleGroup
                type="single"
                variant="outline"
                :model-value="theme"
                aria-label="Theme"
                @update:model-value="(v) => v && setTheme(v as ThemeMode)"
              >
                <ToggleGroupItem value="system"><Monitor /> System</ToggleGroupItem>
                <ToggleGroupItem value="light"><Sun /> Light</ToggleGroupItem>
                <ToggleGroupItem value="dark"><Moon /> Dark</ToggleGroupItem>
              </ToggleGroup>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hidden files</CardTitle>
          <CardDescription>Kept out of the list until you turn on “Hidden” in the review.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel for="hide">Path patterns</FieldLabel>
              <Textarea id="hide" v-model="hide" rows="6" spellcheck="false" placeholder="**/*.lock" />
              <FieldDescription>One per line. * stays inside a folder, ** crosses folders.</FieldDescription>
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
                <FieldDescription>Files leave the list once you mark them viewed.</FieldDescription>
              </FieldContent>
              <Switch id="review-mode" v-model="reviewMode" />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel>Diff view</FieldLabel>
                <FieldDescription>Small windows always use Unified.</FieldDescription>
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
        <CardHeader>
          <CardTitle>Merging</CardTitle>
          <CardDescription>Used by Merge in the review. Your last choice there becomes the default.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel>Merge method</FieldLabel>
                <FieldDescription>Used when the repository allows it.</FieldDescription>
              </FieldContent>
              <ToggleGroup
                type="single"
                variant="outline"
                :model-value="mergeMethod"
                aria-label="Merge method"
                @update:model-value="(v) => v && (mergeMethod = v as MergeMethod)"
              >
                <ToggleGroupItem value="squash"><GitCommitHorizontal /> Squash</ToggleGroupItem>
                <ToggleGroupItem value="merge"><GitMerge /> Merge</ToggleGroupItem>
                <ToggleGroupItem value="rebase"><Layers /> Rebase</ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <Field>
              <FieldLabel for="removed-co-authors">Leave out these co-authors</FieldLabel>
              <Textarea id="removed-co-authors" v-model="removedCoAuthors" rows="6" spellcheck="false" placeholder="anthropic.com" />
              <FieldDescription
                >One per line. A co-author whose name or email contains one of these starts unchecked when you squash and merge. The
                defaults cover AI assistants such as Claude, ChatGPT, Gemini and Copilot.</FieldDescription
              >
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>File tree</CardTitle>
          <CardDescription>How far each folder’s contents are pushed in.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <div class="flex items-center justify-between">
                <FieldLabel for="tree-indent">Indent</FieldLabel>
                <span class="text-sm text-muted-foreground tabular-nums">{{ treeIndent }} px</span>
              </div>
              <Slider
                id="tree-indent"
                :model-value="[treeIndent]"
                :min="0"
                :max="24"
                :step="2"
                aria-label="Indent"
                @update:model-value="(v) => v && (treeIndent = v[0]!)"
              />
              <FieldDescription>6 px matches the tree before this setting existed.</FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel for="tree-guides">Guide lines</FieldLabel>
                <FieldDescription>A line under each open folder.</FieldDescription>
              </FieldContent>
              <Switch id="tree-guides" v-model="treeGuides" />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <Collapsible v-model:open="advancedOpen">
          <CardHeader>
            <CardTitle>Presets</CardTitle>
            <CardDescription>Named groups of paths to pick in the review.</CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle>Help</CardTitle>
          <CardDescription>Opens a GitHub issue. Nothing from your pull requests is sent.</CardDescription>
        </CardHeader>
        <CardContent class="flex flex-wrap gap-2">
          <Button variant="outline" @click="openReport('bug')"><Bug /> Report a problem</Button>
          <Button variant="outline" @click="openReport('idea')"><Lightbulb /> Suggest an idea</Button>
        </CardContent>
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
