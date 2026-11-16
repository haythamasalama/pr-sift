<script setup lang="ts">
import { shallowRef } from 'vue'
import { CircleCheck, ExternalLink, Lock, Pencil, RotateCcw, Send, Trash2 } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useNotesContext } from './useNotes'
import { describeLines, lineText, startOf, type LineRange } from '@pr-sift/core'
import type { DiffRow, Note } from '../../lib/types'
import NoteEditor from './NoteEditor.vue'
import CodeQuote from './CodeQuote.vue'

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
  <div
    v-else
    class="@container flex flex-col gap-1 border-y border-attention/50 bg-attention/10 px-3 py-2 font-sans"
    :class="note.resolved ? 'opacity-60' : ''"
  >
    <div class="flex min-h-6 items-center gap-2">
      <Lock class="size-3.5 shrink-0 text-attention" />
      <p class="min-w-0 flex-1 truncate text-[11px] font-medium text-attention">{{ describeLines(note) }}</p>
      <TooltipProvider :delay-duration="300">
        <div class="flex shrink-0 items-center gap-1">
          <Badge v-if="note.postedUrl" as-child variant="secondary" class="shrink-0">
            <a :href="note.postedUrl" target="_blank" rel="noreferrer">Posted <ExternalLink /></a>
          </Badge>
          <Button
            v-else
            size="xs"
            :variant="armed ? 'destructive' : 'outline'"
            class="mr-1 shrink-0"
            :class="
              armed
                ? ''
                : 'border-attention/40 bg-transparent text-attention hover:bg-attention/15 hover:text-attention dark:border-attention/40 dark:bg-transparent dark:hover:bg-attention/15'
            "
            :disabled="posting"
            :aria-label="armed ? 'Click again to post publicly' : 'Post to GitHub'"
            :title="
              ctx.canPost.value
                ? 'Post this note as a review comment your team can see'
                : 'Add a token in the extension options to post. Opens the line on GitHub instead.'
            "
            @click="post"
          >
            <Spinner v-if="posting" />
            <Send v-else />
            <span :class="armed ? '' : 'hidden @sm:inline'">{{ armed ? 'Click again to post publicly' : 'Post to GitHub' }}</span>
          </Button>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-xs" aria-label="Open on GitHub" @click="ctx.openOnGithub(note)"><ExternalLink /></Button>
            </TooltipTrigger>
            <TooltipContent>Open line</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon-xs"
                :aria-label="note.resolved ? 'Reopen note' : 'Mark note as resolved'"
                @click="ctx.update(note.id, { resolved: !note.resolved })"
              >
                <RotateCcw v-if="note.resolved" /><CircleCheck v-else />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{{ note.resolved ? 'Reopen' : 'Resolve' }}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-xs" aria-label="Edit note" @click="startEditing"><Pencil /></Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-xs" aria-label="Delete note" @click="ctx.remove(note.id)"><Trash2 /></Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
    <div class="min-w-0 pl-[22px]">
      <CodeQuote
        v-if="note.quote"
        :code="note.quote"
        :filename="note.file"
        class="mb-1 truncate border-l-2 border-attention pl-2 text-[11px] whitespace-pre"
      />
      <p class="text-xs whitespace-pre-wrap text-foreground">{{ note.text }}</p>
      <p v-if="error" class="mt-1 text-[11px] text-destructive">{{ error }}</p>
    </div>
  </div>
</template>
