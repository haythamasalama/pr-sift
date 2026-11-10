<script setup lang="ts">
import { shallowRef } from 'vue'
import { ExternalLink, Lock, Pencil, Send, Trash2 } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useNotesContext } from '../../composables/useNotes'
import { describeLines, lineText, startOf, type LineRange } from '../../lib/range'
import type { DiffRow, Note } from '../../lib/types'
import NoteEditor from './NoteEditor.vue'

const { note, rows } = defineProps<{ note: Note; rows?: DiffRow[] }>()
const emit = defineEmits<{ range: [range: LineRange | null] }>()
const ctx = useNotesContext()
const editing = shallowRef(false)
const armed = shallowRef(false)
const posting = shallowRef(false)
const error = shallowRef('')

function startEditing() {
  editing.value = true
  if (rows) emit('range', { start: startOf(note), end: note.line })
}

function stopEditing() {
  editing.value = false
  emit('range', null)
}

async function save(text: string, range?: LineRange) {
  const patch = range
    ? {
        text,
        line: range.end,
        startLine: range.start < range.end ? range.start : undefined,
        lineText: rows ? lineText(rows, note.side, range.end) : note.lineText,
      }
    : { text }
  await ctx.update(note.id, patch)
  stopEditing()
}

async function post() {
  if (!ctx.canPost.value) return ctx.openOnGithub(note)
  if (!armed.value) {
    armed.value = true
    setTimeout(() => (armed.value = false), 3000)
    return
  }
  armed.value = false
  posting.value = true
  error.value = ''
  try {
    await ctx.post(note)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    posting.value = false
  }
}
</script>

<template>
  <NoteEditor
    v-if="editing"
    :quote="note.quote"
    :initial="note.text"
    :rows="rows"
    :side="note.side"
    :range="{ start: startOf(note), end: note.line }"
    @range="emit('range', $event)"
    @save="save"
    @cancel="stopEditing"
    @open-github="ctx.openOnGithub(note)"
  />
  <div v-else class="flex items-start gap-2 border-y border-amber-500/50 bg-amber-500/10 px-3 py-2 font-sans">
    <Lock class="mt-0.5 size-3.5 shrink-0 text-amber-600" />
    <div class="min-w-0 flex-1">
      <p
        v-if="note.quote"
        class="mb-1 truncate border-l-2 border-amber-500 pl-2 font-mono text-[11px] text-muted-foreground"
        :title="note.quote"
      >
        {{ note.quote }}
      </p>
      <p v-if="startOf(note) < note.line" class="mb-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
        {{ describeLines(note) }}
      </p>
      <p class="text-xs whitespace-pre-wrap text-foreground">{{ note.text }}</p>
      <p v-if="error" class="mt-1 text-[11px] text-destructive">{{ error }}</p>
    </div>
    <Badge v-if="note.postedUrl" as-child variant="secondary" class="shrink-0">
      <a :href="note.postedUrl" target="_blank" rel="noreferrer">Posted <ExternalLink /></a>
    </Badge>
    <Button
      v-else
      size="xs"
      :variant="armed ? 'destructive' : 'outline'"
      class="shrink-0"
      :disabled="posting"
      :title="
        ctx.canPost.value
          ? 'Post this note as a review comment your team can see'
          : 'Add a token in the extension options to post. Opens the line on GitHub instead.'
      "
      @click="post"
    >
      <Spinner v-if="posting" />
      <Send v-else />
      {{ armed ? 'Click again to post publicly' : 'Post to GitHub' }}
    </Button>
    <Button variant="ghost" size="icon-xs" aria-label="Open on GitHub" title="Open this line on GitHub" @click="ctx.openOnGithub(note)"
      ><ExternalLink
    /></Button>
    <Button variant="ghost" size="icon-xs" aria-label="Edit note" @click="startEditing"><Pencil /></Button>
    <Button variant="ghost" size="icon-xs" aria-label="Delete note" @click="ctx.remove(note.id)"><Trash2 /></Button>
  </div>
</template>
