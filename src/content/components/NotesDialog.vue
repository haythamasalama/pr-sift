<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Check, CircleCheck, ClipboardCopy, Lock, Pencil, RotateCcw, Trash2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { NotePatch } from '../../composables/useNotes'
import { buildClaudePrompt } from '../../lib/notes'
import { describeLines, startOf } from '../../lib/range'
import type { Note, PrFile, PrRef } from '../../lib/types'
import Modal from './ui/Modal.vue'

const { pr, title, notes, files } = defineProps<{ pr: PrRef; title: string; notes: Note[]; files: PrFile[] }>()
const emit = defineEmits<{ close: []; jump: [file: string]; remove: [id: string]; update: [id: string, patch: NotePatch]; clear: [] }>()
const showResolved = defineModel<boolean>('showResolved', { default: false })

const editingId = shallowRef('')
const draft = shallowRef('')

function startEdit(n: Note) {
  editingId.value = n.id
  draft.value = n.text
}

function saveEdit() {
  if (draft.value.trim()) emit('update', editingId.value, { text: draft.value.trim() })
  editingId.value = ''
}

const copied = shallowRef(false)
const confirmClear = shallowRef(false)

const grouped = computed(() => {
  const map = new Map<string, Note[]>()
  for (const n of [...notes].sort((a, b) => a.file.localeCompare(b.file) || startOf(a) - startOf(b))) {
    map.set(n.file, [...(map.get(n.file) ?? []), n])
  }
  return [...map]
})

async function copy() {
  await navigator.clipboard.writeText(buildClaudePrompt(pr, title, notes, files))
  copied.value = true
  setTimeout(() => (copied.value = false), 2500)
}

function clear() {
  if (!confirmClear.value) {
    confirmClear.value = true
    setTimeout(() => (confirmClear.value = false), 3000)
    return
  }
  confirmClear.value = false
  emit('clear')
}
</script>

<template>
  <Modal :title="`Private notes (${notes.length})`" description="Notes only you can see, grouped by file" @close="emit('close')">
    <Empty v-if="!notes.length" class="border-0 p-4">
      <EmptyHeader>
        <EmptyTitle class="text-sm">No notes yet</EmptyTitle>
        <EmptyDescription>Select code, or hover a line and press +, to add a note only you can see.</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div v-else class="flex flex-col gap-4">
      <section v-for="[file, list] in grouped" :key="file" class="flex flex-col gap-1.5">
        <Button
          variant="link"
          size="xs"
          class="h-auto max-w-full justify-start p-0 text-left font-mono break-all whitespace-normal"
          @click="emit('jump', file)"
          >{{ file }}</Button
        >
        <div
          v-for="n in list"
          :key="n.id"
          class="flex min-w-0 items-start gap-2 rounded-md border bg-muted px-2.5 py-2"
          :class="n.resolved ? 'opacity-60' : ''"
        >
          <Lock class="mt-0.5 size-3 shrink-0 text-amber-600" />
          <div class="min-w-0 flex-1 text-xs">
            <p class="text-muted-foreground">
              {{ describeLines(n) }} · {{ n.side === 'new' ? 'new' : 'removed' }}{{ n.resolved ? ' · resolved' : '' }}
            </p>
            <p v-if="n.quote" class="truncate font-mono text-[11px] text-muted-foreground" :title="n.quote">“{{ n.quote }}”</p>
            <div v-if="editingId === n.id" class="mt-1 flex flex-col gap-1.5">
              <Textarea
                v-model="draft"
                rows="3"
                class="min-h-16 bg-background text-xs md:text-xs"
                @keydown.enter.ctrl.prevent="saveEdit"
                @keydown.enter.meta.prevent="saveEdit"
                @keydown.esc.stop="editingId = ''"
              />
              <div class="flex gap-1.5">
                <Button size="xs" :disabled="!draft.trim()" @click="saveEdit">Save</Button>
                <Button size="xs" variant="outline" @click="editingId = ''">Cancel</Button>
              </div>
            </div>
            <p v-else class="break-words whitespace-pre-wrap text-foreground">{{ n.text }}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            :aria-label="n.resolved ? 'Reopen note' : 'Mark note as resolved'"
            :title="n.resolved ? 'Reopen this note' : 'Resolved — hide it from the diff'"
            @click="emit('update', n.id, { resolved: !n.resolved })"
          >
            <RotateCcw v-if="n.resolved" /><CircleCheck v-else />
          </Button>
          <Button v-if="editingId !== n.id" variant="ghost" size="icon-xs" aria-label="Edit note" @click="startEdit(n)"><Pencil /></Button>
          <Button variant="ghost" size="icon-xs" aria-label="Delete note" @click="emit('remove', n.id)"><Trash2 /></Button>
        </div>
      </section>

      <Separator />
      <div class="flex items-center gap-2" title="Resolved notes stay here but disappear from the diff and from Copy for Claude">
        <Switch id="show-resolved" v-model="showResolved" />
        <Label for="show-resolved" class="text-xs font-normal">Show resolved notes in the diff</Label>
      </div>
      <div class="flex items-center gap-2">
        <Button @click="copy">
          <Check v-if="copied" />
          <ClipboardCopy v-else />
          {{ copied ? 'Copied — paste it into Claude' : 'Copy for Claude' }}
        </Button>
        <span class="flex-1" />
        <Button :variant="confirmClear ? 'destructive' : 'ghost'" @click="clear">{{
          confirmClear ? 'Click again to delete all' : 'Delete all'
        }}</Button>
      </div>
    </div>
  </Modal>
</template>
