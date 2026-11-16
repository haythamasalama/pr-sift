<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { CircleAlert, ExternalLink, GitMerge, KeyRound, Plus } from '@lucide/vue'
import {
  coAuthorsOf,
  defaultSquashBody,
  defaultSquashTitle,
  formatPerson,
  keepsCoAuthor,
  parsePerson,
  rememberCoAuthors,
  withCoAuthors,
  type MergeMethod,
  type Person,
} from '@pr-sift/core'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useSettingsOpener } from '../settings/useSettingsOpener'
import { DEFAULTS, getSettings, saveSetting } from '../../lib/settings'
import type { PrInfo, PrRef } from '../../lib/types'
import { TOKENS_URL, explain, loadMergeContext, merge, type MergeContext } from './actions'

const {
  pr,
  info,
  canAct,
  method: initialMethod,
} = defineProps<{
  pr: PrRef
  info: PrInfo | null
  canAct: boolean
  method?: MergeMethod
}>()
const emit = defineEmits<{ close: []; merged: [sha: string] }>()

const openSettings = useSettingsOpener()

function editSettings(section: 'token' | 'merging') {
  emit('close')
  openSettings(section)
}

const METHODS: { value: MergeMethod; label: string; action: string; hint: string }[] = [
  { value: 'squash', label: 'Squash', action: 'Squash and merge', hint: 'Combines every commit into one commit on the base branch.' },
  { value: 'merge', label: 'Merge commit', action: 'Merge pull request', hint: 'Keeps every commit as it is, with its own co-authors.' },
  { value: 'rebase', label: 'Rebase', action: 'Rebase and merge', hint: 'Adds every commit to the base branch as it is.' },
]

const WARNINGS: Record<string, { text: string; tone: string }> = {
  dirty: { text: 'This branch has conflicts', tone: 'bg-destructive' },
  blocked: { text: 'Waiting for required reviews or checks', tone: 'bg-attention' },
  behind: { text: 'Behind the base branch', tone: 'bg-attention' },
  unstable: { text: 'Some checks are failing or running', tone: 'bg-attention' },
  draft: { text: 'This pull request is a draft', tone: 'bg-muted-foreground' },
}

interface CoAuthorRow {
  person: Person
  keep: boolean
}

const context = shallowRef<MergeContext | null>(null)
const loadError = shallowRef('')
const leaveOut = shallowRef(DEFAULTS.leaveOutCoAuthors)
const removed = shallowRef<string[]>(DEFAULTS.removedCoAuthors)
const kept = shallowRef<string[]>(DEFAULTS.keptCoAuthors)
const method = shallowRef<MergeMethod>(DEFAULTS.mergeMethod)
const title = shallowRef('')
const body = shallowRef('')
const people = shallowRef<CoAuthorRow[]>([])
const custom = shallowRef('')
const customError = shallowRef('')
const busy = shallowRef(false)
const error = shallowRef('')

const current = computed(() => METHODS.find((m) => m.value === method.value)!)
const warning = computed(() => WARNINGS[context.value?.mergeableState ?? ''])
const description = computed(() =>
  info?.base && info.head ? `Into ${info.base} from ${info.head}` : `#${pr.number} ${info?.title ?? ''}`.trim(),
)

function fillMessage(ctx: MergeContext) {
  if (method.value === 'squash') {
    title.value = defaultSquashTitle(ctx.title, pr.number, ctx.commits, ctx.squashTitle)
    body.value = defaultSquashBody(ctx.commits, ctx.body, ctx.squashMessage)
  } else if (method.value === 'merge') {
    title.value = `Merge pull request #${pr.number} from ${ctx.headLabel}`
    body.value = ctx.title
  }
}

function choose(value: MergeMethod) {
  method.value = value
  if (context.value) fillMessage(context.value)
}

async function load() {
  loadError.value = ''
  const settings = await getSettings()
  leaveOut.value = settings.leaveOutCoAuthors
  removed.value = settings.removedCoAuthors
  kept.value = settings.keptCoAuthors
  try {
    const ctx = await loadMergeContext(pr)
    const wanted = initialMethod ?? settings.mergeMethod
    const preferred = ctx.allowed[wanted] ? wanted : METHODS.find((m) => ctx.allowed[m.value])?.value
    method.value = preferred ?? 'merge'
    people.value = coAuthorsOf(ctx.commits, ctx.author).map((person) => ({
      person,
      keep: !leaveOut.value || keepsCoAuthor(person, removed.value, kept.value),
    }))
    fillMessage(ctx)
    context.value = ctx
  } catch (e) {
    loadError.value = explain(e, 'merge')
  }
}

watch(
  () => canAct,
  (can) => {
    if (can && !context.value) void load()
  },
  { immediate: true },
)

function toggle(index: number, keep: boolean) {
  people.value = people.value.map((row, i) => (i === index ? { ...row, keep } : row))
}

function addCustom() {
  const person = parsePerson(custom.value)
  if (!person) {
    customError.value = 'Use the form Name <email@example.com>'
    return
  }
  customError.value = ''
  custom.value = ''
  if (!people.value.some((row) => row.person.email.toLowerCase() === person.email.toLowerCase()))
    people.value = [...people.value, { person, keep: true }]
}

async function remember() {
  await saveSetting('mergeMethod', method.value)
  // With the list turned off, unchecking someone applies to this merge only.
  if (method.value !== 'squash' || !leaveOut.value) return
  const next = rememberCoAuthors(people.value, removed.value, kept.value)
  if (next.removed.join('\n') !== removed.value.join('\n')) await saveSetting('removedCoAuthors', next.removed)
  if (next.kept.join('\n') !== kept.value.join('\n')) await saveSetting('keptCoAuthors', next.kept)
}

async function submit() {
  const ctx = context.value
  if (!ctx) return
  busy.value = true
  error.value = ''
  const coAuthors = people.value.filter((row) => row.keep).map((row) => row.person)
  try {
    const sha = await merge(pr, {
      method: method.value,
      sha: ctx.headSha,
      title: title.value.trim(),
      message: method.value === 'squash' ? withCoAuthors(body.value, coAuthors) : body.value.trim(),
    })
    await remember()
    emit('merged', sha)
  } catch (e) {
    error.value = explain(e, 'merge')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Sheet :open="true" @update:open="(open) => !open && emit('close')">
    <SheetContent side="right" class="w-full gap-0 sm:max-w-md">
      <SheetHeader class="border-b pr-12">
        <SheetTitle>{{ current.action }}</SheetTitle>
        <SheetDescription class="text-xs">{{ description }}</SheetDescription>
      </SheetHeader>
      <div class="min-h-0 flex-1 overflow-y-auto p-4">
        <Alert v-if="!canAct">
          <KeyRound />
          <AlertDescription class="flex flex-col items-start gap-2">
            Merging from the review needs a classic GitHub token with the repo scope.
            <Button size="sm" variant="outline" @click="editSettings('token')">Connect GitHub</Button>
          </AlertDescription>
        </Alert>
        <Alert v-else-if="loadError" variant="destructive">
          <CircleAlert />
          <AlertDescription class="flex flex-col items-start gap-2">
            {{ loadError }}
            <span class="flex flex-wrap gap-2">
              <Button as-child size="sm" variant="outline">
                <a :href="TOKENS_URL" target="_blank" rel="noopener noreferrer"><ExternalLink /> Your tokens on GitHub</a>
              </Button>
              <Button size="sm" variant="ghost" @click="editSettings('token')">Change token</Button>
            </span>
          </AlertDescription>
        </Alert>
        <div v-else-if="!context" class="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> Loading the commits…</div>
        <FieldGroup v-else>
          <p v-if="warning" class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span class="size-1.5 shrink-0 rounded-full" :class="warning.tone" />{{ warning.text }}
          </p>

          <Field>
            <FieldLabel>Merge method</FieldLabel>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              class="w-fit"
              :model-value="method"
              aria-label="Merge method"
              @update:model-value="(v) => v && choose(v as MergeMethod)"
            >
              <ToggleGroupItem v-for="m in METHODS" :key="m.value" :value="m.value" :title="m.hint" :disabled="!context.allowed[m.value]">
                {{ m.label }}
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <template v-if="method !== 'rebase'">
            <Field>
              <FieldLabel for="merge-title">Commit title</FieldLabel>
              <Input id="merge-title" v-model="title" />
            </Field>
            <Field>
              <FieldLabel for="merge-body">Commit message</FieldLabel>
              <Textarea id="merge-body" v-model="body" rows="6" class="font-mono text-xs" spellcheck="false" />
            </Field>
          </template>

          <FieldSet v-if="method === 'squash'">
            <FieldLegend variant="label">Co-authors</FieldLegend>
            <FieldDescription class="flex items-center gap-1 text-xs">
              Unchecked people stay off next time.
              <button type="button" class="text-emphasis hover:underline" @click="editSettings('merging')">Edit list</button>
            </FieldDescription>
            <FieldGroup class="gap-2">
              <p v-if="!people.length" class="text-xs text-muted-foreground">No other authors in these commits.</p>
              <Field v-for="(row, i) in people" :key="row.person.email" orientation="horizontal">
                <Checkbox :id="`co-author-${i}`" :model-value="row.keep" @update:model-value="(v) => toggle(i, v === true)" />
                <FieldLabel :for="`co-author-${i}`" class="font-mono text-xs font-normal break-all">{{
                  formatPerson(row.person)
                }}</FieldLabel>
              </Field>
            </FieldGroup>
            <Field>
              <div class="flex gap-2">
                <Input
                  v-model="custom"
                  placeholder="Name <email@example.com>"
                  aria-label="Add a co-author"
                  @keydown.enter.prevent="addCustom"
                />
                <Button variant="outline" @click="addCustom"><Plus /> Add</Button>
              </div>
              <FieldDescription v-if="customError" class="text-destructive">{{ customError }}</FieldDescription>
            </Field>
          </FieldSet>
          <FieldSet v-else-if="people.length">
            <FieldLegend variant="label">Co-authors</FieldLegend>
            <FieldDescription class="text-xs">
              {{ current.label }} keeps every commit as it is, so these co-authors stay in the history. Squash to leave them out.
            </FieldDescription>
            <ul class="flex flex-col gap-1">
              <li v-for="row in people" :key="row.person.email" class="font-mono text-xs break-all text-muted-foreground">
                {{ formatPerson(row.person) }}
              </li>
            </ul>
            <Button v-if="context?.allowed.squash" variant="outline" size="sm" class="w-fit" @click="choose('squash')"
              >Squash instead</Button
            >
          </FieldSet>

          <Alert v-if="error" variant="destructive">
            <CircleAlert />
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>
        </FieldGroup>
      </div>
      <SheetFooter class="flex-row justify-end border-t bg-muted/40 p-3">
        <Button variant="outline" size="sm" @click="emit('close')">Cancel</Button>
        <Button variant="success" size="sm" :disabled="!context || busy" @click="submit">
          <Spinner v-if="busy" />
          <GitMerge v-else />
          {{ current.action }}
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
