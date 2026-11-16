<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { CircleAlert, GitMerge, KeyRound, Plus, TriangleAlert } from '@lucide/vue'
import {
  coAuthorsOf,
  defaultSquashBody,
  defaultSquashTitle,
  formatPerson,
  isRemovedCoAuthor,
  parsePerson,
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
import Modal from '../../components/Modal.vue'
import { openOptions } from '../../lib/extension'
import { DEFAULTS, getSettings, saveSetting } from '../../lib/settings'
import type { PrInfo, PrRef } from '../../lib/types'
import { explain, loadMergeContext, merge, type MergeContext } from './actions'

const { pr, info, canAct } = defineProps<{ pr: PrRef; info: PrInfo | null; canAct: boolean }>()
const emit = defineEmits<{ close: []; merged: [sha: string] }>()

const METHODS: { value: MergeMethod; label: string; action: string; hint: string }[] = [
  { value: 'squash', label: 'Squash', action: 'Squash and merge', hint: 'Combines every commit into one commit on the base branch.' },
  { value: 'merge', label: 'Merge commit', action: 'Merge pull request', hint: 'Keeps every commit as it is, with its own co-authors.' },
  { value: 'rebase', label: 'Rebase', action: 'Rebase and merge', hint: 'Adds every commit to the base branch as it is.' },
]

const WARNINGS: Record<string, string> = {
  dirty: 'This branch has conflicts. Resolve them on GitHub first.',
  blocked: 'GitHub may block this merge until the required reviews or checks pass.',
  behind: 'This branch is behind the base branch.',
  unstable: 'Some checks are failing or still running.',
  draft: 'This pull request is a draft. Mark it ready for review on GitHub first.',
}

interface CoAuthorRow {
  person: Person
  keep: boolean
}

const context = shallowRef<MergeContext | null>(null)
const loadError = shallowRef('')
const removed = shallowRef<string[]>(DEFAULTS.removedCoAuthors)
const method = shallowRef<MergeMethod>(DEFAULTS.mergeMethod)
const title = shallowRef('')
const body = shallowRef('')
const people = shallowRef<CoAuthorRow[]>([])
const custom = shallowRef('')
const customError = shallowRef('')
const busy = shallowRef(false)
const error = shallowRef('')

const current = computed(() => METHODS.find((m) => m.value === method.value)!)
const warning = computed(() => WARNINGS[context.value?.mergeableState ?? ''] ?? '')
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

onMounted(async () => {
  if (!canAct) return
  const settings = await getSettings()
  removed.value = settings.removedCoAuthors
  try {
    const ctx = await loadMergeContext(pr)
    const preferred = ctx.allowed[settings.mergeMethod] ? settings.mergeMethod : METHODS.find((m) => ctx.allowed[m.value])?.value
    method.value = preferred ?? 'merge'
    people.value = coAuthorsOf(ctx.commits, ctx.author).map((person) => ({ person, keep: !isRemovedCoAuthor(person, removed.value) }))
    fillMessage(ctx)
    context.value = ctx
  } catch (e) {
    loadError.value = explain(e, 'merge')
  }
})

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
  if (method.value !== 'squash') return
  const list = [...removed.value]
  for (const row of people.value) {
    const email = row.person.email.toLowerCase()
    const listed = list.findIndex((pattern) => pattern.trim().toLowerCase() === email)
    if (!row.keep && !isRemovedCoAuthor(row.person, list)) list.push(email)
    if (row.keep && listed >= 0) list.splice(listed, 1)
  }
  if (list.join('\n') !== removed.value.join('\n')) await saveSetting('removedCoAuthors', list)
}

async function submit() {
  const ctx = context.value
  if (!ctx) return
  busy.value = true
  error.value = ''
  const kept = people.value.filter((row) => row.keep).map((row) => row.person)
  try {
    const sha = await merge(pr, {
      method: method.value,
      sha: ctx.headSha,
      title: title.value.trim(),
      message: method.value === 'squash' ? withCoAuthors(body.value, kept) : body.value.trim(),
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
  <Modal title="Merge pull request" :description="description" @close="emit('close')">
    <Alert v-if="!canAct">
      <KeyRound />
      <AlertDescription class="flex flex-col items-start gap-2">
        Merging from the review needs a GitHub token with Contents and Pull requests set to read and write.
        <Button size="sm" variant="outline" @click="openOptions">Open settings</Button>
      </AlertDescription>
    </Alert>
    <Alert v-else-if="loadError" variant="destructive">
      <CircleAlert />
      <AlertDescription>{{ loadError }}</AlertDescription>
    </Alert>
    <div v-else-if="!context" class="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> Loading the commits…</div>
    <FieldGroup v-else>
      <Alert v-if="warning">
        <TriangleAlert />
        <AlertDescription>{{ warning }}</AlertDescription>
      </Alert>

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
          <ToggleGroupItem v-for="m in METHODS" :key="m.value" :value="m.value" :disabled="!context.allowed[m.value]">
            {{ m.label }}
          </ToggleGroupItem>
        </ToggleGroup>
        <FieldDescription>{{ current.hint }}</FieldDescription>
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
        <FieldDescription>
          Checked people are added as Co-authored-by lines. Anyone you uncheck stays unchecked next time. Edit the list in Settings.
        </FieldDescription>
        <FieldGroup class="gap-2">
          <p v-if="!people.length" class="text-xs text-muted-foreground">No other authors in these commits.</p>
          <Field v-for="(row, i) in people" :key="row.person.email" orientation="horizontal">
            <Checkbox :id="`co-author-${i}`" :model-value="row.keep" @update:model-value="(v) => toggle(i, v === true)" />
            <FieldLabel :for="`co-author-${i}`" class="font-mono text-xs font-normal break-all">{{ formatPerson(row.person) }}</FieldLabel>
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

      <Alert v-if="error" variant="destructive">
        <CircleAlert />
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>
    </FieldGroup>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" size="sm" @click="emit('close')">Cancel</Button>
        <Button size="sm" :disabled="!context || busy" @click="submit">
          <Spinner v-if="busy" />
          <GitMerge v-else />
          {{ current.action }}
        </Button>
      </div>
    </template>
  </Modal>
</template>
