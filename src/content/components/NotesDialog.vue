<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Check, CircleCheck, ClipboardCopy, FileText, Pencil, RotateCcw, Trash2 } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
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

const counts = computed(() => {
  const resolved = notes.filter((n) => n.resolved).length
  return { open: notes.length - resolved, resolved }
})

const splitPath = (file: string) => {
  const i = file.lastIndexOf('/')
  return { dir: i === -1 ? '' : file.slice(0, i + 1), name: file.slice(i + 1) }
}

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
  <Modal
    title="Private notes"
    :description="`${counts.open} open · ${counts.resolved} resolved · only you can see these`"
    @close="emit('close')"
  >
    <Empty v-if="!notes.length" class="border-0 p-4">
      <EmptyHeader>
        <EmptyTitle class="text-sm">No notes yet</EmptyTitle>
        <EmptyDescription>Select code, or hover a line and press +, to add a note only you can see.</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div v-else class="flex flex-col gap-5">
      <section v-for="[file, list] in grouped" :key="file" class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-1.5 text-left font-mono text-xs hover:underline"
            :title="file"
            @click="emit('jump', file)"
          >
            <FileText class="size-3.5 shrink-0 text-muted-foreground" />
            <span class="min-w-0 break-all"
              ><span class="text-muted-foreground">{{ splitPath(file).dir }}</span
              ><span class="font-medium">{{ splitPath(file).name }}</span></span
            >
          </button>
          <Badge variant="secondary" class="tabular-nums">{{ list.length }}</Badge>
        </div>

        <article
          v-for="n in list"
          :key="n.id"
          class="flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground shadow-xs"
          :class="n.resolved ? 'opacity-60' : ''"
        >
          <header class="flex items-center gap-1.5">
            <Badge variant="outline" class="font-mono">{{ describeLines(n) }}</Badge>
            <Badge variant="secondary">{{ n.side === 'new' ? 'new code' : 'removed code' }}</Badge>
            <Badge v-if="n.resolved" variant="outline" class="border-success/40 text-success"><Check /> Resolved</Badge>
            <span class="flex-1" />
            <Button
              variant="ghost"
              size="icon-xs"
              :aria-label="n.resolved ? 'Reopen note' : 'Mark note as resolved'"
              :title="n.resolved ? 'Reopen this note' : 'Resolved — hide it from the diff'"
              @click="emit('update', n.id, { resolved: !n.resolved })"
            >
              <RotateCcw v-if="n.resolved" /><CircleCheck v-else />
            </Button>
            <Button v-if="editingId !== n.id" variant="ghost" size="icon-xs" aria-label="Edit note" @click="startEdit(n)"
              ><Pencil
            /></Button>
            <Button variant="ghost" size="icon-xs" aria-label="Delete note" @click="emit('remove', n.id)"><Trash2 /></Button>
          </header>

          <blockquote
            v-if="n.quote"
            class="line-clamp-2 rounded-md border-l-2 border-amber-500 bg-muted px-2 py-1 font-mono text-[11px] break-all text-muted-foreground"
            :title="n.quote"
          >
            {{ n.quote }}
          </blockquote>

          <div v-if="editingId === n.id" class="flex flex-col gap-2">
            <Textarea
              v-model="draft"
              rows="3"
              class="min-h-16 bg-background text-sm"
              @keydown.enter.ctrl.prevent="saveEdit"
              @keydown.enter.meta.prevent="saveEdit"
              @keydown.esc.stop="editingId = ''"
            />
            <div class="flex gap-2">
              <Button size="sm" :disabled="!draft.trim()" @click="saveEdit">Save</Button>
              <Button size="sm" variant="outline" @click="editingId = ''">Cancel</Button>
            </div>
          </div>
          <p v-else class="text-sm break-words whitespace-pre-wrap">{{ n.text }}</p>
        </article>
      </section>
    </div>

    <template v-if="notes.length" #footer>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div class="flex items-center gap-2" title="Resolved notes stay here but disappear from the diff and from Copy for Claude">
          <Switch id="show-resolved" v-model="showResolved" />
          <Label for="show-resolved" class="text-xs font-normal">Show resolved in the diff</Label>
        </div>
        <span class="flex-1" />
        <Button :variant="confirmClear ? 'destructive' : 'ghost'" size="sm" @click="clear">
          <Trash2 /> {{ confirmClear ? 'Click again to delete all' : 'Delete all' }}
        </Button>
        <Button size="sm" :disabled="!counts.open" title="Copies the open notes only" @click="copy">
          <Check v-if="copied" />
          <ClipboardCopy v-else />
          {{ copied ? 'Copied — paste it into Claude' : 'Copy for Claude' }}
        </Button>
      </div>
    </template>
  </Modal>
</template>
